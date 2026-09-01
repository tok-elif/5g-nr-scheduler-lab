import { describe, expect, it } from 'vitest'
import { CELL_CONFIGS } from '../config/cells'
import { M2_SCHEDULERS } from '../m2Schedulers'
import { DEFAULT_SCENARIO, runM0 } from './m0'
import { compareM3Schedulers } from './m3'
import { DEFAULT_M2_CONFIG } from './m2'
describe('M3 quick scheduler comparison', () => {
 it('runs M-LWDF, EXP/PF and QDF-PF with a common traffic realization', () => {
   const cell = CELL_CONFIGS[0]
   const m0 = runM0(cell, { ...DEFAULT_SCENARIO, ueCount: 8, seed: 404 })
   const results = compareM3Schedulers(cell, m0.ues, {
     ...DEFAULT_M2_CONFIG,
     slotCount: 40,
     traceSlotLimit: 2,
   }, 404)
   expect(results.map((result) => result.scheduler)).toEqual(['m-lwdf', 'exp-pf', 'qdf-pf'])
   expect(new Set(results.map((result) => result.effectiveTrafficSeed)).size).toBe(1)
   expect(new Set(results.map((result) =>
     result.ueResults.map((ue) => `${ue.ueId}:${ue.generatedPackets}`).join('|'),
   )).size).toBe(1)
   expect(results.every((result) => Number.isFinite(result.cellThroughputMbps))).toBe(true)
 })
 it('does not place QDF-PF in the five-scheduler M2 baseline registry', () => {
   expect(M2_SCHEDULERS.map((scheduler) => scheduler.kind)).toEqual([
     'round-robin',
     'max-ci',
     'proportional-fair',
     'm-lwdf',
     'exp-pf',
   ])
 })
})
