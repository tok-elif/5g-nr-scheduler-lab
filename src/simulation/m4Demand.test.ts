import { describe, expect, it } from 'vitest'
import { calculateM4Demand } from './m4Demand'
import type { M2QueueState } from './m2Types'
import { createUeSliceMapping } from './sliceMapping'
const mapping = createUeSliceMapping(3, { embb: 1, urllc: 1, mmtc: 1 })
const queue = (ueIndex: number, queuedMbits: number, rate = 10): M2QueueState => ({
 ueIndex,
 ue: {
   id: ueIndex + 1, sinrDb: 10, cqi: 10, cqiSpectralEfficiency: 2,
   mcsIndex: 10, mcs: 'MCS', mcsTable: 'PDSCH Table 1', modulation: 'QPSK',
   targetCodeRateX1024: 100, mcsSpectralEfficiency: 2, spectralEfficiency: 2,
   achievableRateMbps: rate,
 },
 qos: {
   fiveQi: 9, label: 'BE', resourceType: 'Non-GBR', priorityLevel: 90,
   packetDelayBudgetMs: 300, packetErrorRate: 1e-6, delayViolationProbability: 0.01,
 },
 traffic: { fiveQi: 9, arrivalRatePacketsPerSecond: 80, packetSizeBytes: 1500, gbrMbps: 0 },
 queuedMbits,
 headOfLineDelayMs: 0,
 averageThroughputMbps: 1,
})
describe('M4 RB demand', () => {
 it('maps empty queues to zero RB and preserves all slices', () => {
   const result = calculateM4Demand([queue(0, 0), queue(1, 0), queue(2, 0)], mapping, 10, 0.001)
   expect(result.sliceDemands.map((item) => item.demandResourceBlocks)).toEqual([0, 0, 0])
 })
 it('uses Math.ceil with full-band RB capacity', () => {
   expect(calculateM4Demand([queue(0, 0.0011)], mapping, 10, 0.001)
     .ueDemands[0].demandResourceBlocks).toBe(2)
 })
 it('aggregates canonical slices and multiple UEs', () => {
   const multi = createUeSliceMapping(3, { embb: 2, urllc: 1, mmtc: 0 })
   const result = calculateM4Demand([queue(0, 0.001), queue(1, 0.002), queue(2, 0.001)], multi, 10, 0.001)
   expect(result.sliceDemands.map((item) => item.sliceId)).toEqual(['embb', 'urllc', 'mmtc'])
   expect(result.sliceDemands[0].demandResourceBlocks).toBe(3)
   expect(result.sliceDemands[2].activeUeCount).toBe(0)
 })
 it('rejects mapping-external and duplicate UE indices', () => {
   expect(() => calculateM4Demand([queue(3, 1)], mapping, 10, 0.001)).toThrow('Mapping dışı')
   expect(() => calculateM4Demand([queue(0, 1), queue(0, 1)], mapping, 10, 0.001)).toThrow('Duplicate')
 })
 it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid queue %s', (value) => {
   expect(() => calculateM4Demand([queue(0, value)], mapping, 10, 0.001)).toThrow()
 })
 it('rejects positive backlog with zero service rate', () => {
   expect(() => calculateM4Demand([queue(0, 1, 0)], mapping, 10, 0.001)).toThrow('servis kapasitesi')
 })
 it('is deterministic and monotonic', () => {
   const low = calculateM4Demand([queue(0, 0.001)], mapping, 10, 0.001)
   const high = calculateM4Demand([queue(0, 0.002)], mapping, 10, 0.001)
   expect(calculateM4Demand([queue(0, 0.001)], mapping, 10, 0.001)).toEqual(low)
   expect(high.ueDemands[0].demandResourceBlocks).toBeGreaterThanOrEqual(low.ueDemands[0].demandResourceBlocks)
 })
 it('preserves caller ownership and deeply freezes output', () => {
   const input = [queue(0, 0.001)]
   const before = structuredClone(input)
   const result = calculateM4Demand(input, mapping, 10, 0.001)
   expect(input).toEqual(before)
   expect(Object.isFrozen(input)).toBe(false)
   expect(Object.isFrozen(result)).toBe(true)
   expect(Object.isFrozen(result.ueDemands)).toBe(true)
   expect(Object.isFrozen(result.ueDemands[0])).toBe(true)
 })
 it('rejects safe-integer overflow demand', () => {
   expect(() => calculateM4Demand(
     [queue(0, Number.MAX_VALUE, Number.MIN_VALUE)],
     mapping,
     10,
     0.001,
   )).toThrow()
 })
})
