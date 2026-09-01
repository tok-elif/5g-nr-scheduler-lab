import { describe, expect, it } from 'vitest'
import { validateM4RuntimeConfig } from '../../config/m4Config'
import { parseM4Result, serializeM4Result } from '../../exports/m4Serialize'
import { runM4 } from '../../simulation/m4'
import { calculateM4WorkUnits } from '../../simulation/m4WorkloadGuard'
import type { M4Result, M4RunInput } from '../../simulation/m4Types'
import { makeM4TestInput, makeTestUe } from '../../testing/m4Fixture'
import { handleM4WorkerRequest } from '../../workers/m4WorkerHandler'
import { MODULE_NAVIGATION } from '../../navigation'
import { createM4ViewModel } from './m4ViewModel'
function expectScientificInvariants(result: M4Result) {
 const totals = result.sliceResourceTotals
 expect(totals.reduce((sum, item) => sum + item.allocatedResourceBlocks, 0)).toBe(result.cellResourceTotals.totalAllocatedResourceBlocks)
 expect(totals.reduce((sum, item) => sum + item.schedulerUsedResourceBlocks, 0)).toBe(result.cellResourceTotals.totalSchedulerUsedResourceBlocks)
 expect(totals.reduce((sum, item) => sum + item.borrowedResourceBlocks, 0)).toBe(totals.reduce((sum, item) => sum + item.lentResourceBlocks, 0))
 expect(totals.reduce((sum, item) => sum + item.redistributedResourceBlocks, 0)).toBe(totals.reduce((sum, item) => sum + item.borrowedResourceBlocks, 0))
 for (const metric of result.metrics.slices) {
   for (const ratio of [metric.packetDeliveryRatio, metric.delayViolationRatio, metric.gbrMeetingRatio, metric.jainFairness, metric.schedulerUtilizationRatio, metric.resourceAllocationShare]) {
     if (ratio !== null) expect(ratio).toBeGreaterThanOrEqual(0)
     if (ratio !== null) expect(ratio).toBeLessThanOrEqual(1 + 1e-12)
   }
   expect(metric.deliveredPacketCount).toBeLessThanOrEqual(metric.arrivedPacketCount)
   expect(metric.deliveredMbits).toBeGreaterThanOrEqual(0)
   expect(metric.finalQueuedMbits).toBeGreaterThanOrEqual(0)
   if (metric.p50PacketDelayMs !== null && metric.p95PacketDelayMs !== null && metric.p99PacketDelayMs !== null) {
     expect(metric.p50PacketDelayMs).toBeLessThanOrEqual(metric.p95PacketDelayMs)
     expect(metric.p95PacketDelayMs).toBeLessThanOrEqual(metric.p99PacketDelayMs)
   }
 }
}
describe('R5 final M4 integration', () => {
 it('keeps M0–M4 navigation order, visible M4 page and active semantics', () => {
   expect(MODULE_NAVIGATION.map((item) => item.view)).toEqual(['m0', 'm1', 'm2', 'm3', 'm4'])
   expect(MODULE_NAVIGATION[4].label).toBe('M4 · Network Slicing')
   expect(Object.isFrozen(MODULE_NAVIGATION)).toBe(true)
 })
 it('runs small worker scenario and round-trips the exact result', () => {
   const response = handleM4WorkerRequest({ kind: 'run-m4', requestId: 'r5-small', input: makeM4TestInput(3) })
   expect(response.ok).toBe(true)
   if (!response.ok) return
   expect(response.result.metrics.slices).toHaveLength(3)
   expectScientificInvariants(response.result)
   expect(parseM4Result(serializeM4Result(response.result))).toEqual(response.result)
 })
 it('keeps a zero-UE slice visible with null-safe metrics', () => {
   const base = makeM4TestInput()
   const input: M4RunInput = { ...base, ues: base.ues.slice(0, 4), m4Config: validateM4RuntimeConfig({
...base.m4Config, totalUeCount: 4, slices: base.m4Config.slices.map((slice) => ({ ...slice, enabled: slice.id !== 'urllc', ueCount: slice.id === 'embb' || slice.id === 'mmtc' ? 2 : 0, minimumShare: slice.id === 'urllc' ? 0 : slice.minimumShare })) }) }
   const result = runM4(input)
   const urllc = createM4ViewModel(result).slices[1]
   expect(urllc.ueCount).toBe(0)
   expect(urllc.p95).toBe('—')
   expectScientificInvariants(result)
 })
 it('runs scheduler diversity with redistribution disabled', () => {
   const base = makeM4TestInput()
   const schedulers = ['proportional-fair', 'm-lwdf', 'qdf-pf'] as const
   const input = { ...base, m4Config: validateM4RuntimeConfig({ ...base.m4Config, redistributionEnabled: false, slices: base.m4Config.slices.map((slice, index) => ({ ...slice, scheduler: schedulers[index] })) }) }
   const result = runM4(input)
   expect(result.schedulerKindBySlice).toEqual({ embb: 'proportional-fair', urllc: 'm-lwdf', mmtc: 'qdf-pf' })
   expect(result.sliceResourceTotals.every((item) => item.redistributedResourceBlocks === 0)).toBe(true)
   expectScientificInvariants(result)
 })
 it('runs a materially larger safe scenario deterministically', () => {
   const base = makeM4TestInput(5)
   const input: M4RunInput = {
     ...base,
     ues: Array.from({ length: 24 }, (_, index) => makeTestUe(index + 1, 6 + index % 12)),
     m2Config: { ...base.m2Config, slotCount: 500 },
     m4Config: validateM4RuntimeConfig({ ...base.m4Config, totalUeCount: 24, slices: base.m4Config.slices.map(( slice) => ({ ...slice, ueCount: 8 })) }),
   }
   const workload = calculateM4WorkUnits({ ueCount: 24, resourceBlockCount: input.cell.resourceBlocks, slotCount: 500 })
   expect(workload).toBeGreaterThan(100_000)
   expect(workload).toBeLessThan(100_000_000)
   const first = runM4(input)
   const second = runM4(input)
   expect(first.reproducibilityFingerprint).toBe(second.reproducibilityFingerprint)
   expect(first.metrics).toEqual(second.metrics)
   expect(serializeM4Result(first)).toBe(serializeM4Result(second))
   expectScientificInvariants(first)
 })
})
