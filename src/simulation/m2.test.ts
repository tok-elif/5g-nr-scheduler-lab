import { describe, expect, it } from 'vitest'
import { CELL_CONFIGS } from '../config/cells'
import { M2_SCHEDULERS } from '../m2Schedulers'
import { createSeededRandom, samplePoisson } from './random'
import { compareM2Schedulers, runM2, validateM2Config } from './m2'
import type { M2Config } from './m2Types'
import type { UeResult } from './types'
const makeUe = (id: number, rate: number): UeResult => ({
 id,
 sinrDb: rate,
 cqi: 10,
 cqiSpectralEfficiency: 2.7305,
 mcsIndex: 18,
 mcs: 'MCS 18',
 mcsTable: 'PDSCH Table 1',
 modulation: '64QAM',
 targetCodeRateX1024: 466,
 mcsSpectralEfficiency: 2.7305,
 spectralEfficiency: 2.7305,
 achievableRateMbps: rate,
})
const TEST_CONFIG: M2Config = {
 slotCount: 1_000,
 pfWindowSlots: 50,
 traceSlotLimit: 100,
 trafficSeedOffset: 100,
 trafficClasses: [{
   fiveQi: 1,
   arrivalRatePacketsPerSecond: 1_000,
   packetSizeBytes: 100,
   gbrMbps: 0.2,
 }],
}
describe('M2 QoS traffic simulation', () => {
 it('samples Poisson arrivals deterministically with the expected mean', () => {
   const firstRandom = createSeededRandom(42)
   const secondRandom = createSeededRandom(42)
   const first = Array.from({ length: 10_000 }, () => samplePoisson(firstRandom, 0.75))
   const second = Array.from({ length: 10_000 }, () => samplePoisson(secondRandom, 0.75))
   expect(first).toEqual(second)
   expect(first.reduce((sum, value) => sum + value, 0) / first.length).toBeCloseTo(0.75, 1)
   expect(() => samplePoisson(firstRandom, -1)).toThrow()
 })
 it('keeps packet and throughput accounting deterministic', () => {
   const ues = [makeUe(1, 8), makeUe(2, 12), makeUe(3, 16)]
   const first = runM2(CELL_CONFIGS[0], ues, 'round-robin', TEST_CONFIG, 2026)
   const second = runM2(CELL_CONFIGS[0], ues, 'round-robin', TEST_CONFIG, 2026)
   expect(first).toEqual(second)
   expect(first.generatedPackets).toBe(first.deliveredPackets + first.queuedPackets)
   expect(first.ueResults.reduce((sum, ue) => sum + ue.throughputMbps, 0)).toBeCloseTo(first.cellThroughputMbps)
   expect(first.jainFairness).toBeGreaterThan(0)
   expect(first.jainFairness).toBeLessThanOrEqual(1)
 })
 it('allocates one slot resource grid across multiple queued UEs', () => {
   const result = runM2(
     CELL_CONFIGS[0],
     [makeUe(1, 10), makeUe(2, 10), makeUe(3, 10)],
     'round-robin',
     TEST_CONFIG,
     7,
   )
   expect(result.slotTrace.some((slot) => slot.allocations.length > 1)).toBe(true)
   for (const slot of result.slotTrace) {
     expect(slot.allocations.reduce((sum, allocation) => sum + allocation.resourceBlocks, 0))
       .toBeLessThanOrEqual(CELL_CONFIGS[0].resourceBlocks)
   }
 })
 it('runs classical and delay-aware schedulers on identical offered traffic', () => {
   const results = compareM2Schedulers(
     CELL_CONFIGS[0],
     [makeUe(1, 6), makeUe(2, 12), makeUe(3, 18), makeUe(4, 24)],
     { ...TEST_CONFIG, slotCount: 400 },
     99,
   )
   expect(results.map((result) => result.scheduler)).toEqual(M2_SCHEDULERS.map((scheduler) => scheduler.kind))
   expect(results.map((result) => result.generatedPackets)).toEqual(
     Array(results.length).fill(results[0].generatedPackets),
   )
   expect(results.map((result) => result.ueResults.map((ue) => ue.generatedPackets)))
     .toEqual(Array(results.length).fill(results[0].ueResults.map((ue) => ue.generatedPackets)))
   expect(new Set(results.map((result) => result.trafficFingerprint)).size).toBe(1)
   expect(new Set(results.map((result) => result.ueSinrFingerprint)).size).toBe(1)
   expect(new Set(results.map((result) => result.scheduler))).toEqual(
     new Set(['round-robin', 'max-ci', 'proportional-fair', 'm-lwdf', 'exp-pf']),
   )
 })
 it('reports auditable capacity, normalized load and demand-limited GBR targets', () => {
   const result = runM2(
     CELL_CONFIGS[0],
     [makeUe(1, 8), makeUe(2, 12)],
     'm-lwdf',
     {
       ...TEST_CONFIG,
       trafficClasses: [{
         fiveQi: 1,
         arrivalRatePacketsPerSecond: 100,
         packetSizeBytes: 100,
         gbrMbps: 0.2,
       }],
     },
     123,
   )
   expect(result.capacityReferenceMbps).toBe(12)
   expect(result.offeredLoadMbps).toBeCloseTo(0.16)
   expect(result.normalizedOfferedLoad).toBeCloseTo(0.16 / 12)
   expect(result.ueResults.every((ue) => ue.gbrTargetMbps === 0.08)).toBe(true)
   expect(result.gbrUeMeetingRatio).not.toBeNull()
   expect(result.gbrMeanFulfillmentRatio).not.toBeNull()
   expect(result.aggregateGbrServiceRatio).not.toBeNull()
 })
 it('changes the traffic fingerprint when the traffic seed changes', () => {
   const ues = [makeUe(1, 8), makeUe(2, 12)]
   const first = runM2(CELL_CONFIGS[0], ues, 'round-robin', TEST_CONFIG, 1)
   const second = runM2(CELL_CONFIGS[0], ues, 'round-robin', TEST_CONFIG, 2)
   expect(first.trafficFingerprint).not.toBe(second.trafficFingerprint)
   expect(first.ueSinrFingerprint).toBe(second.ueSinrFingerprint)
 })
 it('reports 5QI-level GBR and delay statistics', () => {
   const result = runM2(
     CELL_CONFIGS[2],
     [makeUe(1, 20), makeUe(2, 25)],
     'm-lwdf',
     {
       ...TEST_CONFIG,
       trafficClasses: [
         { fiveQi: 1, arrivalRatePacketsPerSecond: 200, packetSizeBytes: 200, gbrMbps: 0.2 },
         { fiveQi: 9, arrivalRatePacketsPerSecond: 100, packetSizeBytes: 500, gbrMbps: 0 },
       ],
     },
     11,
   )
   expect(result.qosResults.map((item) => item.fiveQi)).toEqual([1, 9])
   expect(result.qosResults[0].gbrMeetingRatio).not.toBeNull()
   expect(result.qosResults[1].gbrMeetingRatio).toBeNull()
   expect(result.qosResults.every((item) =>
     item.delayP99Ms === null || item.delayP50Ms === null || item.delayP99Ms >= item.delayP50Ms)).toBe(true)
 })
 it('rejects invalid QoS traffic configuration', () => {
   expect(() => validateM2Config({ ...TEST_CONFIG, slotCount: 0 })).toThrow()
   expect(() => validateM2Config({
     ...TEST_CONFIG,
     trafficClasses: [{ fiveQi: 1, arrivalRatePacketsPerSecond: 10, packetSizeBytes: 100, gbrMbps: 0 }],
   })).toThrow()
   expect(() => validateM2Config({
     ...TEST_CONFIG,
     trafficClasses: [{ fiveQi: 9, arrivalRatePacketsPerSecond: 10, packetSizeBytes: 100, gbrMbps: 1 }],
   })).toThrow()
 })
 it('keeps legacy behavior identical when empty run options are supplied', () => {
   const ues = [makeUe(1, 8), makeUe(2, 12)]
   expect(runM2(CELL_CONFIGS[0], ues, 'round-robin', TEST_CONFIG, 42, {}))
     .toEqual(runM2(CELL_CONFIGS[0], ues, 'round-robin', TEST_CONFIG, 42))
 })
 it('supports deterministic per-UE traffic class overrides', () => {
   const ues = [makeUe(1, 8), makeUe(2, 12)]
   const trafficClassByUeIndex = [
     { fiveQi: 6, arrivalRatePacketsPerSecond: 100, packetSizeBytes: 1200, gbrMbps: 0 },
     { fiveQi: 1, arrivalRatePacketsPerSecond: 300, packetSizeBytes: 200, gbrMbps: 0.3 },
   ]
   const first = runM2(CELL_CONFIGS[0], ues, 'round-robin', TEST_CONFIG, 42, { trafficClassByUeIndex })
   const second = runM2(CELL_CONFIGS[0], ues, 'round-robin', TEST_CONFIG, 42, { trafficClassByUeIndex })
   expect(first).toEqual(second)
   expect(first.ueResults.map((ue) => ue.fiveQi)).toEqual([6, 1])
 })
 it('validates per-UE traffic override length and values', () => {
   const ues = [makeUe(1, 8), makeUe(2, 12)]
   expect(() => runM2(CELL_CONFIGS[0], ues, 'round-robin', TEST_CONFIG, 1, {
     trafficClassByUeIndex: [{ fiveQi: 9, arrivalRatePacketsPerSecond: 1, packetSizeBytes: 1, gbrMbps: 0 }],
   })).toThrow('uzunluğu')
   expect(() => runM2(CELL_CONFIGS[0], ues, 'round-robin', TEST_CONFIG, 1, {
     trafficClassByUeIndex: [
       { fiveQi: 999, arrivalRatePacketsPerSecond: 1, packetSizeBytes: 1, gbrMbps: 0 },
       { fiveQi: 9, arrivalRatePacketsPerSecond: 1, packetSizeBytes: 1, gbrMbps: 0 },
     ],
   })).toThrow('Tanımsız 5QI')
   expect(() => runM2(CELL_CONFIGS[0], ues, 'round-robin', TEST_CONFIG, 1, {
     trafficClassByUeIndex: [
       { fiveQi: 9, arrivalRatePacketsPerSecond: Number.NaN, packetSizeBytes: 1, gbrMbps: 0 },
       { fiveQi: 9, arrivalRatePacketsPerSecond: 1, packetSizeBytes: 1, gbrMbps: 0 },
     ],
   })).toThrow('sonlu')
 })
 it('does not mutate or freeze per-UE traffic override input', () => {
   const trafficClassByUeIndex = [
     { fiveQi: 9, arrivalRatePacketsPerSecond: 1, packetSizeBytes: 100, gbrMbps: 0 },
   ]
   const before = structuredClone(trafficClassByUeIndex)
   runM2(CELL_CONFIGS[0], [makeUe(1, 8)], 'round-robin', TEST_CONFIG, 1, {
     trafficClassByUeIndex,
   })
   expect(trafficClassByUeIndex).toEqual(before)
   expect(Object.isFrozen(trafficClassByUeIndex)).toBe(false)
   expect(Object.isFrozen(trafficClassByUeIndex[0])).toBe(false)
 })
})
