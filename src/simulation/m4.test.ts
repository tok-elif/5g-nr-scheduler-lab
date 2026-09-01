import { describe, expect, it } from 'vitest'
import { CELL_CONFIGS } from '../config/cells'
import { createM4RuntimeConfig, validateM4RuntimeConfig } from '../config/m4Config'
import simulationConfig from '../config/simulation.json'
import { runM2 } from './m2'
import { createM4TrafficAssignment, runM4 } from './m4'
import type { M2Config } from './m2Types'
import { M4_SCHEDULER_KINDS, type M4RunInput } from './m4Types'
import { createUeSliceMapping } from './sliceMapping'
import type { UeResult } from './types'
const makeUe = (id: number, rate = 10): UeResult => ({
 id, sinrDb: rate, cqi: 10, cqiSpectralEfficiency: 2.7305, mcsIndex: 18,
 mcs: 'MCS 18', mcsTable: 'PDSCH Table 1', modulation: '64QAM',
 targetCodeRateX1024: 466, mcsSpectralEfficiency: 2.7305,
 spectralEfficiency: 2.7305, achievableRateMbps: rate,
})
const m2Config: M2Config = {
 slotCount: 20,
 pfWindowSlots: 10,
 traceSlotLimit: 2,
 trafficSeedOffset: 100,
 trafficClasses: [
   { fiveQi: 1, arrivalRatePacketsPerSecond: 300, packetSizeBytes: 200, gbrMbps: 0.3 },
   { fiveQi: 2, arrivalRatePacketsPerSecond: 200, packetSizeBytes: 500, gbrMbps: 0.5 },
   { fiveQi: 6, arrivalRatePacketsPerSecond: 100, packetSizeBytes: 1200, gbrMbps: 0 },
   { fiveQi: 9, arrivalRatePacketsPerSecond: 80, packetSizeBytes: 1500, gbrMbps: 0 },
 ],
}
const makeInput = (traceLimit = 3): M4RunInput => ({
 cell: structuredClone(CELL_CONFIGS[0]),
 ues: Array.from({ length: 6 }, (_, index) => makeUe(index + 1, 8 + index)),
 m2Config: structuredClone(m2Config),
 m4Config: createM4RuntimeConfig(6, { embb: 2, urllc: 2, mmtc: 2 }),
 baseSeed: 2026,
 resourceTraceSlotLimit: traceLimit,
})
const withSliceChange = (
 input: M4RunInput,
 sliceIndex: number,
 changes: Record<string, unknown>,
): M4RunInput => ({
 ...input,
 m4Config: validateM4RuntimeConfig({
   ...input.m4Config,
   slices: input.m4Config.slices.map((slice, index) =>
     index === sliceIndex ? { ...slice, ...changes } : { ...slice }),
 }),
})
describe('basic runM4 orchestration', () => {
 it('runs three slices with canonical mapping and traffic assignment', () => {
   const result = runM4(makeInput())
   expect(result.mapping.sliceByUeIndex).toEqual(['embb', 'embb', 'urllc', 'urllc', 'mmtc', 'mmtc'])
   expect(result.trafficAssignment.map((item) => item.fiveQi)).toEqual([6, 9, 1, 2, 9, 9])
   expect(result.sliceResourceTotals.map((item) => item.sliceId)).toEqual(['embb', 'urllc', 'mmtc'])
 })
 it('supports zero-UE and one-slice configurations', () => {
   const base = makeInput()
   const input: M4RunInput = {
     ...base,
     ues: base.ues.slice(0, 2),
     m4Config: createM4RuntimeConfig(2, { embb: 2, urllc: 0, mmtc: 0 }),
   }
   const result = runM4(input)
   expect(result.mapping.ueIndicesBySlice.urllc).toEqual([])
   expect(result.sliceResourceTotals).toHaveLength(3)
 })
 it('is deterministic', () => {
   const input = makeInput()
   expect(runM4(input)).toEqual(runM4(input))
 })
 it('keeps trace bounded with valid slot indices', () => {
   const result = runM4(makeInput(2))
   expect(result.resourceTrace).toHaveLength(2)
   expect(result.resourceTrace.every((slot) => slot.slotIndex >= 0 && slot.slotIndex < m2Config.slotCount)).toBe(true)
 })
 it('keeps trace limit outside fingerprint and totals', () => {
   const withoutTrace = runM4(makeInput(0))
   const withTrace = runM4(makeInput(5))
   expect(withoutTrace.reproducibilityFingerprint).toBe(withTrace.reproducibilityFingerprint)
   expect(withoutTrace.cellResourceTotals).toEqual(withTrace.cellResourceTotals)
   expect(withoutTrace.sliceResourceTotals).toEqual(withTrace.sliceResourceTotals)
 })
 it('streams all slots and conserves resources', () => {
   const result = runM4(makeInput())
   expect(result.cellResourceTotals.processedSlotCount).toBe(m2Config.slotCount)
   expect(result.cellResourceTotals.totalAllocatedResourceBlocks
     + result.cellResourceTotals.totalUnallocatedResourceBlocks)
     .toBe(result.cellResourceTotals.totalAvailableResourceBlocks)
   expect(result.cellResourceTotals.totalSchedulerUsedResourceBlocks
     + result.cellResourceTotals.totalSchedulerUnusedResourceBlocks)
     .toBe(result.cellResourceTotals.totalAllocatedResourceBlocks)
 })
 it('changes fingerprint for scientific scheduler, weight, share and seed changes', () => {
   const input = makeInput()
   const baseline = runM4(input).reproducibilityFingerprint
   expect(runM4(withSliceChange(input, 0, { scheduler: 'round-robin' })).reproducibilityFingerprint).not.toBe(baseline)
   expect(runM4(withSliceChange(input, 0, { weight: 0.6 })).reproducibilityFingerprint).not.toBe(baseline)
   expect(runM4(withSliceChange(input, 0, { minimumShare: 0.2 })).reproducibilityFingerprint).not.toBe(baseline)
   expect(runM4({ ...input, baseSeed: input.baseSeed + 1 }).reproducibilityFingerprint).not.toBe(baseline)
 })
 it('smoke-tests every real scheduler in a slice', () => {
   const input = makeInput()
   for (const scheduler of M4_SCHEDULER_KINDS) {
     expect(() => runM4(withSliceChange(input, 0, { scheduler }))).not.toThrow()
   }
 })
 it('supports redistribution enabled and disabled', () => {
   const input = makeInput()
   expect(runM4(input).config.redistributionEnabled).toBe(true)
   const disabled = validateM4RuntimeConfig({ ...input.m4Config, redistributionEnabled: false })
   expect(runM4({ ...input, m4Config: disabled }).config.redistributionEnabled).toBe(false)
 })
 it('rejects UE count, trace and missing traffic class errors', () => {
   const input = makeInput()
   expect(() => runM4({ ...input, ues: input.ues.slice(1) })).toThrow('UE listesi')
   expect(() => runM4({ ...input, resourceTraceSlotLimit: -1 })).toThrow('trace')
   expect(() => runM4({
     ...input,
     m2Config: { ...input.m2Config, trafficClasses: input.m2Config.trafficClasses.filter((item) => item.fiveQi !== 6) },
   })).toThrow('5QI 6')
 })
 it('does not mutate or freeze caller inputs and deeply freezes result', () => {
   const input = makeInput()
   const before = structuredClone(input)
   const result = runM4(input)
   expect(input).toEqual(before)
   expect(Object.isFrozen(input.cell)).toBe(false)
   expect(Object.isFrozen(input.ues[0])).toBe(false)
   expect(Object.isFrozen(input.m2Config)).toBe(false)
   expect(Object.isFrozen(result)).toBe(true)
   expect(Object.isFrozen(result.m2Result.ueResults[0])).toBe(true)
   expect(Object.isFrozen(result.resourceTrace)).toBe(true)
 })
 it('matches direct M2 for a one-slice full-band run', () => {
   const base = makeInput()
   const ues = base.ues.slice(0, 2)
   const config = validateM4RuntimeConfig({
     ...createM4RuntimeConfig(2, { embb: 2, urllc: 0, mmtc: 0 }),
     slices: createM4RuntimeConfig(2, { embb: 2, urllc: 0, mmtc: 0 }).slices.map((slice) => ({
       ...slice,
       scheduler: 'round-robin',
       minimumShare: slice.id === 'embb' ? 1 : 0,
     })),
   })
   const input: M4RunInput = { ...base, ues, m4Config: config }
   const mapping = createUeSliceMapping(2, { embb: 2, urllc: 0, mmtc: 0 })
   const assignments = createM4TrafficAssignment(mapping, config, input.m2Config.trafficClasses)
   const direct = runM2(input.cell, input.ues, 'round-robin', input.m2Config, input.baseSeed, {
     trafficClassByUeIndex: assignments.map((item) => item.trafficClass),
   })
   const result = runM4(input).m2Result
   expect(result.ueResults).toEqual(direct.ueResults)
   expect(result.trafficFingerprint).toBe(direct.trafficFingerprint)
   expect(result.ueSinrFingerprint).toBe(direct.ueSinrFingerprint)
 })
 it('keeps workload limits outside M4 fingerprint', () => {
   expect(simulationConfig.experiments.m2MaxWorkUnits).toBe(300_000_000)
   expect(simulationConfig.experiments.maxWorkUnits).toBe(100_000_000)
   expect(runM4(makeInput()).reproducibilityFingerprint).toMatch(/^M4-/)
 })
})
