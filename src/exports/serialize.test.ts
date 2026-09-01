import { describe, expect, it } from 'vitest'
import { CELL_CONFIGS } from '../config/cells'
import { runM1BatchExperiment, runM1CellMatrixExperiment } from '../simulation/experiments'
import { DEFAULT_SCENARIO, runM0 } from '../simulation/m0'
import { compareM1Schedulers, DEFAULT_M1_CONFIG } from '../simulation/m1'
import { SCHEDULERS } from '../schedulers'
import { createBatchCsv, createCellMatrixCsv, createCellMatrixPairwiseCsv, createExperimentJson, createM0CellMatrixCsv, createM0Csv, createM1Csv, createPairwiseCsv } from './serialize'
describe('result serialization', () => {
 const m0 = runM0(CELL_CONFIGS[0], { ...DEFAULT_SCENARIO, ueCount: 3 })
 const m0CellMatrix = CELL_CONFIGS.map((cell) => runM0(cell, { ...DEFAULT_SCENARIO, ueCount: 3 }))
 const m1 = compareM1Schedulers(CELL_CONFIGS[0], m0.ues, { ...DEFAULT_M1_CONFIG, slotCount: 30 })
 const batch = runM1BatchExperiment(CELL_CONFIGS[0], { ...DEFAULT_SCENARIO, ueCount: 3 }, {
...DEFAULT_M1_CONFIG, slotCount: 30 }, 3)
 const matrix = runM1CellMatrixExperiment(CELL_CONFIGS, { ...DEFAULT_SCENARIO, ueCount: 3 }, {
...DEFAULT_M1_CONFIG, slotCount: 30 }, 3)
 it('creates one M0 CSV row per UE', () => {
   expect(createM0Csv(m0).split('\n')).toHaveLength(4)
   expect(createM0Csv(m0)).toContain('target_code_rate_x1024')
   expect(createM0Csv(m0)).toContain('mcs_table')
 })
 it('creates one selected-scheduler CSV row per UE', () => {
   const csv = createM1Csv(m1[0])
   expect(csv.split('\n')).toHaveLength(4)
   expect(csv).toContain('Round Robin')
 })
 it('creates one M0 matrix CSV row per cell and UE', () => {
   const csv = createM0CellMatrixCsv(m0CellMatrix)
   expect(csv.split('\n')).toHaveLength(CELL_CONFIGS.length * m0CellMatrix[0].ues.length + 1)
   expect(csv).toContain('sampled_full_band_upper_bound_mbps')
 })
 it('creates one batch CSV row per scheduler', () => {
   expect(createBatchCsv(batch).split('\n')).toHaveLength(SCHEDULERS.length + 1)
   expect(createPairwiseCsv(batch).split('\n')).toHaveLength(SCHEDULERS.length * (SCHEDULERS.length - 1) / 2 + 1)
 })
 it('creates one matrix CSV row per cell and scheduler', () => {
   const csv = createCellMatrixCsv(matrix)
   expect(csv.split('\n')).toHaveLength(CELL_CONFIGS.length * SCHEDULERS.length + 1)
   expect(csv).toContain('cell_id,band_mhz,bandwidth_mhz')
   expect(createCellMatrixPairwiseCsv(matrix).split('\n')).toHaveLength(CELL_CONFIGS.length * SCHEDULERS.length * (SCHEDULERS.length - 1) / 2 + 1)
 })
 it('creates a complete parseable experiment JSON', () => {
   const json = createExperimentJson({
     cell: CELL_CONFIGS[0], scenario: { ...DEFAULT_SCENARIO, ueCount: 3 },
     m1Config: { ...DEFAULT_M1_CONFIG, slotCount: 30 }, m0, m0CellMatrix, m1, multiSeed: batch, cellMatrix: matrix,
   })
   const parsed = JSON.parse(json)
   expect(parsed.m1).toHaveLength(SCHEDULERS.length)
   expect(parsed.m0CellMatrix).toHaveLength(5)
   expect(parsed.multiSeed.seeds).toHaveLength(3)
   expect(parsed.cellMatrix.rows).toHaveLength(CELL_CONFIGS.length * SCHEDULERS.length)
   expect(parsed.cellMatrix.pairwiseRows).toHaveLength(CELL_CONFIGS.length * SCHEDULERS.length * (SCHEDULERS.length - 1) / 2)
   expect(parsed.generatedAt).toBeTypeOf('string')
   expect(parsed.application.version).toBe('1.7.5-m3.5')
   expect(parsed.experimentId).toMatch(/^RUN-[0-9A-F]{8}$/)
 })
})
