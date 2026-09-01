import { describe, expect, it } from 'vitest'
import { calculateJainFairness } from '../metrics/fairness'
import { CELL_CONFIGS } from '../config/cells'
import { DEFAULT_SCENARIO, runM0 } from './m0'
import { compareM1Schedulers, runM1 } from './m1'
import type { UeResult } from './types'
import { SCHEDULERS } from '../schedulers'
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
describe('M1 full-buffer scheduling', () => {
 it('computes Jain fairness correctly', () => {
   expect(calculateJainFairness([10, 10, 10])).toBeCloseTo(1)
   expect(calculateJainFairness([10, 0, 0])).toBeCloseTo(1 / 3)
 })
 it('Round Robin gives equal slot counts', () => {
   const result = runM1(CELL_CONFIGS[0], [makeUe(1, 10), makeUe(2, 20), makeUe(3, 30)], 'round-robin', {
     slotCount: 300,
     pfWindowSlots: 50,
   })
   expect(result.ueResults.map((ue) => ue.selectedSlots)).toEqual([100, 100, 100])
   expect(result.slotTrace.slice(0, 6)).toEqual([1, 2, 3, 1, 2, 3])
   expect(result.cellThroughputMbps).toBeCloseTo(20)
 })
 it('Max C/I always selects the highest-rate UE in a static channel', () => {
   const result = runM1(CELL_CONFIGS[0], [makeUe(1, 10), makeUe(2, 30), makeUe(3, 20)], 'max-ci', {
     slotCount: 100,
     pfWindowSlots: 50,
   })
   expect(result.ueResults.map((ue) => ue.selectedSlots)).toEqual([0, 100, 0])
   expect(new Set(result.slotTrace)).toEqual(new Set([2]))
   expect(result.cellThroughputMbps).toBeCloseTo(30)
   expect(result.jainFairness).toBeCloseTo(1 / 3)
 })
 it('Max C/I shares equal-best UEs with deterministic Round Robin', () => {
   const result = runM1(CELL_CONFIGS[0], [makeUe(1, 30), makeUe(2, 10), makeUe(3, 30)], 'max-ci', {
     slotCount: 100,
     pfWindowSlots: 50,
   })
   expect(result.ueResults.map((ue) => ue.selectedSlots)).toEqual([50, 0, 50])
   expect(result.slotTrace.slice(0, 6)).toEqual([1, 3, 1, 3, 1, 3])
   expect(result.jainFairness).toBeCloseTo(2 / 3)
 })
 it('rejects invalid M1 configuration and UE rates in the core', () => {
   const ues = [makeUe(1, 10)]
   expect(() => runM1(CELL_CONFIGS[0], ues, 'round-robin', { slotCount: 10, pfWindowSlots: Number.NaN })).toThrow()
   expect(() => runM1(CELL_CONFIGS[0], ues, 'round-robin', { slotCount: 10, pfWindowSlots: 1.5 })).toThrow()
   expect(() => runM1(CELL_CONFIGS[0], ues, 'round-robin', { slotCount: 10, pfWindowSlots: 10, traceSlotLimit: -1 })).toThrow()
   expect(() => runM1(CELL_CONFIGS[0], [makeUe(1, Number.NaN)], 'round-robin', { slotCount: 10, pfWindowSlots: 10 })).toThrow()
 })
 it('PF serves every UE and stays deterministic', () => {
   const ues = [makeUe(1, 8), makeUe(2, 16), makeUe(3, 24)]
   const first = runM1(CELL_CONFIGS[0], ues, 'proportional-fair', { slotCount: 3_000, pfWindowSlots: 100 })
   const second = runM1(CELL_CONFIGS[0], ues, 'proportional-fair', { slotCount: 3_000, pfWindowSlots: 100 })
   expect(first).toEqual(second)
   expect(first.ueResults.every((ue) => ue.selectedSlots > 0)).toBe(true)
 })
 it('limits the retained slot trace without changing the full simulation', () => {
   const result = runM1(CELL_CONFIGS[0], [makeUe(1, 10), makeUe(2, 20)], 'round-robin', {
     slotCount: 1_000,
     pfWindowSlots: 50,
     traceSlotLimit: 24,
   })
   expect(result.slotTrace).toHaveLength(24)
   expect(result.ueResults.reduce((sum, ue) => sum + ue.selectedSlots, 0)).toBe(1_000)
 })
 it('compares all algorithms on the same M0 population', () => {
   const m0 = runM0(CELL_CONFIGS[2], DEFAULT_SCENARIO)
   const results = compareM1Schedulers(CELL_CONFIGS[2], m0.ues, { slotCount: 500, pfWindowSlots: 100 })
   expect(results.map((result) => result.scheduler)).toEqual(SCHEDULERS.map((scheduler) => scheduler.kind))
   for (const result of results) {
     expect(result.ueResults.reduce((sum, ue) => sum + ue.selectedSlots, 0)).toBe(500)
     expect(result.ueResults.reduce((sum, ue) => sum + ue.throughputMbps, 0)).toBeCloseTo(
       result.cellThroughputMbps,
     )
   }
 })
})
