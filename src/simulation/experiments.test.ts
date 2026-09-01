import { describe, expect, it } from 'vitest'
import simulationConfig from '../config/simulation.json'
import { CELL_CONFIGS } from '../config/cells'
import { summarizeMetric, tCritical95 } from '../metrics/statistics'
import { summarizeM1CellTradeoffs } from '../metrics/tradeoff'
import { SCHEDULERS } from '../schedulers'
import { runM1BatchExperiment, runM1CellMatrixExperiment } from './experiments'
import { DEFAULT_SCENARIO } from './m0'
import { DEFAULT_M1_CONFIG } from './m1'
describe('M1 multi-seed experiments', () => {
 it('computes sample statistics and a 95% confidence interval', () => {
   const summary = summarizeMetric([1, 2, 3, 4, 5])
   expect(summary.mean).toBe(3)
   expect(summary.standardDeviation).toBeCloseTo(Math.sqrt(2.5))
   expect(summary.confidence95HalfWidth).toBeGreaterThan(0)
   expect(summary.minimum).toBe(1)
   expect(summary.maximum).toBe(5)
 })
 it('returns zero spread for identical observations', () => {
   const summary = summarizeMetric([2, 2, 2])
   expect(summary.standardDeviation).toBe(0)
   expect(summary.confidence95HalfWidth).toBe(0)
 })
 it('uses a Student-t critical value above 30 degrees of freedom', () => {
   expect(tCritical95(31)).toBeCloseTo(2.039513, 5)
   expect(tCritical95(99)).toBeCloseTo(1.984217, 5)
   expect(tCritical95(31)).toBeGreaterThan(1.96)
 })
 it('rejects non-finite statistical observations', () => {
   expect(() => summarizeMetric([1, Number.NaN])).toThrow()
 })
 it('runs every scheduler on the same deterministic seed list', () => {
   const first = runM1BatchExperiment(CELL_CONFIGS[2], DEFAULT_SCENARIO, {
     ...DEFAULT_M1_CONFIG,
     slotCount: 300,
   }, 5)
   const second = runM1BatchExperiment(CELL_CONFIGS[2], DEFAULT_SCENARIO, {
     ...DEFAULT_M1_CONFIG,
     slotCount: 300,
   }, 5)
   expect(first).toEqual(second)
   expect(first.seeds).toEqual([2026, 2027, 2028, 2029, 2030])
   expect(first.schedulerResults).toHaveLength(SCHEDULERS.length)
   expect(first.pairwiseComparisons).toHaveLength(SCHEDULERS.length * (SCHEDULERS.length - 1) / 2)
   expect(first.schedulerResults.every((result) => result.runCount === 5)).toBe(true)
   expect(first.pairwiseComparisons.every((result) => result.runCount === 5)).toBe(true)
 })
 it('loads the default batch size from configuration', () => {
   expect(simulationConfig.experiments.seedCount).toBe(20)
 })
 it('rejects invalid batch sizes', () => {
   expect(() => runM1BatchExperiment(CELL_CONFIGS[0], DEFAULT_SCENARIO, DEFAULT_M1_CONFIG, 1)).toThrow()
 })
 it('runs every cell and scheduler with one shared seed list', () => {
   const matrix = runM1CellMatrixExperiment(CELL_CONFIGS, DEFAULT_SCENARIO, {
     ...DEFAULT_M1_CONFIG,
     slotCount: 60,
   }, 3)
   expect(matrix.seeds).toEqual([2026, 2027, 2028])
   expect(matrix.rows).toHaveLength(CELL_CONFIGS.length * SCHEDULERS.length)
   expect(matrix.pairwiseRows).toHaveLength(CELL_CONFIGS.length * SCHEDULERS.length * (SCHEDULERS.length - 1) / 2)
   expect(new Set(matrix.rows.map((row) => row.cell.id))).toEqual(
     new Set(CELL_CONFIGS.map((cell) => cell.id)),
   )
   expect(matrix.rows.every((row) => row.runCount === 3)).toBe(true)
   const decisions = summarizeM1CellTradeoffs(matrix)
   expect(decisions).toHaveLength(CELL_CONFIGS.length)
   expect(decisions.every((decision) => decision.throughputLeaders.length >= 1)).toBe(true)
   expect(decisions.every((decision) => decision.fairnessLeaders.length >= 1)).toBe(true)
   expect(decisions.every((decision) => decision.paretoRows.length >= 1)).toBe(true)
 })
 it('rejects an empty cell experiment matrix', () => {
   expect(() => runM1CellMatrixExperiment([], DEFAULT_SCENARIO, DEFAULT_M1_CONFIG, 3)).toThrow()
 })
})
