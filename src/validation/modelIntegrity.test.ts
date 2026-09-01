import { describe, expect, it } from 'vitest'
import { CELL_CONFIGS } from '../config/cells'
import { SCHEDULERS } from '../schedulers'
import { runM1BatchExperiment, runM1CellMatrixExperiment } from '../simulation/experiments'
import { DEFAULT_SCENARIO, runM0 } from '../simulation/m0'
import { compareM1Schedulers, DEFAULT_M1_CONFIG } from '../simulation/m1'
import { validateModelIntegrity } from './modelIntegrity'
const m1Config = { ...DEFAULT_M1_CONFIG, slotCount: 60 }
const m0CellMatrix = CELL_CONFIGS.map((cell) => runM0(cell, { ...DEFAULT_SCENARIO, ueCount: 4 }))
const m1Results = compareM1Schedulers(CELL_CONFIGS[0], m0CellMatrix[0].ues, m1Config)
const batch = runM1BatchExperiment(CELL_CONFIGS[0], { ...DEFAULT_SCENARIO, ueCount: 4 }, m1Config, 3)
const cellMatrix = runM1CellMatrixExperiment(CELL_CONFIGS, { ...DEFAULT_SCENARIO, ueCount: 4 }, m1Config, 3)
const expectedSchedulerKinds = SCHEDULERS.map((scheduler) => scheduler.kind)
describe('runtime model integrity validation', () => {
 it('passes every invariant for a valid M0/M1 experiment', () => {
   const report = validateModelIntegrity({ m0CellMatrix, m1Results, batch, cellMatrix, m1Config, expectedSchedulerKinds })
   expect(report.allPassed).toBe(true)
   expect(report.passedCount).toBe(report.totalCount)
 })
 it('detects a broken slot-conservation result', () => {
   const corruptedResults = structuredClone(m1Results)
   corruptedResults[0].ueResults[0].selectedSlots += 1
   const report = validateModelIntegrity({ m0CellMatrix, m1Results: corruptedResults, batch, cellMatrix, m1Config, expectedSchedulerKinds })
   expect(report.allPassed).toBe(false)
   expect(report.checks.find((check) => check.id === 'slots')?.passed).toBe(false)
 })
 it('detects a missing cell-scheduler matrix condition', () => {
   const corruptedMatrix = { ...cellMatrix, rows: cellMatrix.rows.slice(1) }
   const report = validateModelIntegrity({ m0CellMatrix, m1Results, batch, cellMatrix: corruptedMatrix, m1Config, expectedSchedulerKinds })
   expect(report.checks.find((check) => check.id === 'matrix')?.passed).toBe(false)
 })
 it('detects inconsistent CQI/MCS rate metadata', () => {
   const corruptedM0 = structuredClone(m0CellMatrix)
   corruptedM0[0].ues[0].mcsSpectralEfficiency += 0.1
   const report = validateModelIntegrity({ m0CellMatrix: corruptedM0, m1Results, batch, cellMatrix, m1Config, expectedSchedulerKinds })
   expect(report.checks.find((check) => check.id === 'link-adaptation')?.passed).toBe(false)
 })
 it('detects an order-dependent Max C/I tie allocation', () => {
   const tiedM0 = CELL_CONFIGS.map((cell) => runM0(cell, { ...DEFAULT_SCENARIO, ueCount: 2, stdDevSinrDb: 0 }))
   const tiedResults = compareM1Schedulers(CELL_CONFIGS[0], tiedM0[0].ues, m1Config)
   const corruptedResults = structuredClone(tiedResults)
   const maxCi = corruptedResults.find((result) => result.scheduler === 'max-ci')
   if (!maxCi) throw new Error('Max C/I sonucu bulunamadı.')
   maxCi.ueResults[0].selectedSlots = m1Config.slotCount
   maxCi.ueResults[1].selectedSlots = 0
   const report = validateModelIntegrity({ m0CellMatrix: tiedM0, m1Results: corruptedResults, batch, cellMatrix, m1Config, expectedSchedulerKinds })
   expect(report.checks.find((check) => check.id === 'max-ci-ties')?.passed).toBe(false)
 })
})
