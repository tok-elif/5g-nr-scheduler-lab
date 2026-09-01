import { describe, expect, it } from 'vitest'
import { CELL_CONFIGS } from '../config/cells'
import { M2_SCHEDULERS } from '../m2Schedulers'
import { runM2BatchMatrix, summarizeM2Sample } from './m2BatchMatrix'
const request = {
 scenarioId: 'sc2-mixed-qos',
 loadProfileId: 'medium',
 durationMs: 10,
 ueCount: 4,
 baseSeed: 100,
 seedCount: 3,
 seedStep: 7,
}
describe('M2 multi-seed statistics', () => {
 it('uses sample standard deviation and Student-t 95% confidence interval', () => {
   const summary = summarizeM2Sample([1, 2, 3])
   expect(summary.sampleSize).toBe(3)
   expect(summary.mean).toBe(2)
   expect(summary.standardDeviation).toBeCloseTo(1, 12)
   expect(summary.confidence95HalfWidth).toBeCloseTo(4.303 / Math.sqrt(3), 12)
 })
 it('runs the complete common seed list on all cells and schedulers', () => {
   const result = runM2BatchMatrix(request)
   expect(result.seeds).toEqual([100, 107, 114])
   expect(result.rawRows).toHaveLength(CELL_CONFIGS.length * M2_SCHEDULERS.length * request.seedCount)
   expect(result.summaryRows).toHaveLength(CELL_CONFIGS.length * M2_SCHEDULERS.length)
   expect(result.totalRuns).toBe(CELL_CONFIGS.length * M2_SCHEDULERS.length * request.seedCount)
 })
 it('pairs scheduler differences by the same seed', () => {
   const result = runM2BatchMatrix(request)
   const expectedPairCount = CELL_CONFIGS.length * M2_SCHEDULERS.length * (M2_SCHEDULERS.length - 1) /2
   expect(result.pairwiseRows).toHaveLength(expectedPairCount)
   for (const row of result.pairwiseRows) {
     expect(row.metrics.totalThroughputMbps?.sampleSize).toBe(request.seedCount)
     expect(row.metrics.jainFairness?.sampleSize).toBe(request.seedCount)
   }
 })
 it('is deterministic for the same batch request', () => {
   expect(runM2BatchMatrix(request)).toEqual(runM2BatchMatrix(request))
 })
})
