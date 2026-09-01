import { describe, expect, it } from 'vitest'
import { runM4 } from './m4'
import { createM4MetricsAccumulator } from './m4Metrics'
import { makeM4TestInput } from '../testing/m4Fixture'
describe('M4 streaming metrics', () => {
 it('aggregates three slices and cell metrics deterministically', () => {
   const first = runM4(makeM4TestInput()).metrics
   expect(first.slices.map((slice) => slice.sliceId)).toEqual(['embb', 'urllc', 'mmtc'])
   expect(runM4(makeM4TestInput()).metrics).toEqual(first)
   expect(first.cell.deliveredPacketCount).toBe(
     first.slices.reduce((sum, slice) => sum + slice.deliveredPacketCount, 0),
   )
 })
 it('keeps metrics independent from resource trace limit and fingerprint', () => {
   const zero = runM4(makeM4TestInput(0))
   const traced = runM4(makeM4TestInput(10))
   expect(zero.metrics).toEqual(traced.metrics)
   expect(zero.reproducibilityFingerprint).toBe(traced.reproducibilityFingerprint)
 })
 it('reports configured and realized offered load, throughput and queue totals', () => {
   const result = runM4(makeM4TestInput())
   expect(result.metrics.cell.configuredOfferedLoadMbps).toBeGreaterThan(0)
   expect(result.metrics.cell.realizedOfferedMbits).toBeGreaterThanOrEqual(0)
   expect(result.metrics.cell.aggregateThroughputMbps).toBe(result.m2Result.cellThroughputMbps)
   expect(result.metrics.cell.finalQueuedMbits).toBeCloseTo(
     result.m2Result.ueResults.reduce((sum, ue) => sum + ue.queuedMbits, 0),
   )
 })
 it('uses null denominator conventions when no packets arrive', () => {
   const input = makeM4TestInput()
   input.m2Config.trafficClasses.forEach((traffic) => { traffic.arrivalRatePacketsPerSecond = 0 })
   const metrics = runM4(input).metrics
   expect(metrics.cell.packetDeliveryRatio).toBeNull()
   expect(metrics.cell.meanPacketDelayMs).toBeNull()
   expect(metrics.cell.p99PacketDelayMs).toBeNull()
 })
 it('reports packet-weighted ordered percentiles and delay violation ratios', () => {
   const metrics = runM4(makeM4TestInput()).metrics
   for (const slice of metrics.slices) {
     if (slice.deliveredPacketCount > 0) {
       expect(slice.p50PacketDelayMs!).toBeLessThanOrEqual(slice.p95PacketDelayMs!)
       expect(slice.p95PacketDelayMs!).toBeLessThanOrEqual(slice.p99PacketDelayMs!)
       expect(slice.delayViolationRatio).toBeGreaterThanOrEqual(0)
       expect(slice.delayViolationRatio).toBeLessThanOrEqual(1)
     }
   }
 })
 it('reports GBR null for non-GBR mMTC and fairness conventions', () => {
   const metrics = runM4(makeM4TestInput()).metrics
   expect(metrics.slices[2].gbrMeetingRatio).toBeNull()
   expect(metrics.slices[2].jainFairness).not.toBeNull()
 })
 it('reports resource shares and scheduler utilization', () => {
   const metrics = runM4(makeM4TestInput()).metrics
   expect(metrics.slices.reduce((sum, slice) => sum + (slice.resourceAllocationShare ?? 0), 0))
     .toBeCloseTo(metrics.cell.allocatedResourceBlocks
       / (15 * 20))
   expect(metrics.slices.every((slice) =>
     slice.schedulerUtilizationRatio === null
     || slice.schedulerUtilizationRatio >= 0 && slice.schedulerUtilizationRatio <= 1)).toBe(true)
 })
 it('returns deeply immutable metrics', () => {
   const metrics = runM4(makeM4TestInput()).metrics
   expect(Object.isFrozen(metrics)).toBe(true)
   expect(Object.isFrozen(metrics.slices)).toBe(true)
   expect(Object.isFrozen(metrics.slices[0])).toBe(true)
 })
 it('rejects mapping-external, wrong-5QI and invalid observations', () => {
   const result = runM4(makeM4TestInput())
   const accumulator = createM4MetricsAccumulator({
     mapping: result.mapping,
     trafficAssignment: result.trafficAssignment,
     slotDurationSeconds: 0.001,
     slotCount: 20,
   })
   expect(() => accumulator.observationSink.observe({
     kind: 'packet-arrival', slotIndex: 0, ueIndex: 99, fiveQi: 9, packetSizeMbits: 1,
   })).toThrow('Mapping dışı')
   expect(() => accumulator.observationSink.observe({
     kind: 'packet-arrival', slotIndex: 0, ueIndex: 0, fiveQi: 1, packetSizeMbits: 1,
   })).toThrow('5QI')
   expect(() => accumulator.observationSink.observe({
     kind: 'packet-delivery', slotIndex: 0, ueIndex: 0, fiveQi: 6,
     packetSizeMbits: 1, delaySlots: 1, delayMs: Number.NaN,
   })).toThrow('delay')
 })
})
