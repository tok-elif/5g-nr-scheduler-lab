import { describe, expect, it } from 'vitest'
import { CELL_CONFIGS } from '../config/cells'
import { DEFAULT_SCENARIO } from '../simulation/m0'
import { DEFAULT_M1_CONFIG } from '../simulation/m1'
import { SCHEDULERS } from '../schedulers'
import { executeSimulationRequest } from './runRequest'
describe('simulation worker request executor', () => {
 it('returns single and multi-seed results in one request', () => {
   const data = executeSimulationRequest({
     cell: CELL_CONFIGS[0],
     scenario: { ...DEFAULT_SCENARIO, ueCount: 3 },
     m1Config: { ...DEFAULT_M1_CONFIG, slotCount: 60 },
     seedCount: 3,
   })
   expect(data.singleSeedResults).toHaveLength(SCHEDULERS.length)
   expect(data.multiSeedResult.seeds).toHaveLength(3)
   expect(data.multiSeedResult.pairwiseComparisons).toHaveLength(SCHEDULERS.length * (SCHEDULERS.length - 1) / 2)
   expect(data.cellMatrixResult.rows).toHaveLength(CELL_CONFIGS.length * SCHEDULERS.length)
   expect(data.cellMatrixResult.seeds).toEqual(data.multiSeedResult.seeds)
   expect(data.elapsedMilliseconds).toBeGreaterThanOrEqual(0)
 })
 it('reuses a compatible all-cell matrix when only the selected cell changes', () => {
   const request = {
     cell: CELL_CONFIGS[0],
     scenario: { ...DEFAULT_SCENARIO, ueCount: 3 },
     m1Config: { ...DEFAULT_M1_CONFIG, slotCount: 60 },
     seedCount: 3,
   }
   const first = executeSimulationRequest(request)
   const second = executeSimulationRequest({
     ...request,
     cell: CELL_CONFIGS[1],
     cachedCellMatrixResult: first.cellMatrixResult,
   })
   expect(second.cellMatrixResult).toBe(first.cellMatrixResult)
   expect(second.multiSeedResult.schedulerResults).toEqual(
     first.cellMatrixResult.rows.filter((row) => row.cell.id === CELL_CONFIGS[1].id).map((row) => ({
       scheduler: row.scheduler,
       schedulerLabel: row.schedulerLabel,
       runCount: row.runCount,
       throughputMbps: row.throughputMbps,
       jainFairness: row.jainFairness,
     })),
   )
 })
 it('rejects an experiment matrix above the configured work budget', () => {
   expect(() => executeSimulationRequest({
     cell: CELL_CONFIGS[0],
     scenario: { ...DEFAULT_SCENARIO, ueCount: 100 },
     m1Config: { ...DEFAULT_M1_CONFIG, slotCount: 100_000 },
     seedCount: 100,
   })).toThrow('güvenli sınır')
 })
})
