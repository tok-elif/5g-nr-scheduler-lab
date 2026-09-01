import { describe, expect, it } from 'vitest'
import { CELL_CONFIGS } from '../config/cells'
import type { M1CellMatrixResult, M1CellMatrixRow, MetricStatistics, SchedulerKind } from '../simulation/types'
import { summarizeM1CellTradeoffs } from './tradeoff'
const statistics = (mean: number): MetricStatistics => ({
 mean,
 standardDeviation: 0,
 confidence95HalfWidth: 0,
 minimum: mean,
 maximum: mean,
})
const row = (scheduler: SchedulerKind, throughput: number, fairness: number): M1CellMatrixRow => ({
 cell: CELL_CONFIGS[0],
 scheduler,
 schedulerLabel: scheduler,
 runCount: 3,
 throughputMbps: statistics(throughput),
 jainFairness: statistics(fairness),
})
describe('M1 throughput-fairness decision summary', () => {
 it('finds metric leaders and excludes dominated schedulers from the Pareto front', () => {
   const result: M1CellMatrixResult = {
     seeds: [1, 2, 3],
     pairwiseRows: [],
     rows: [row('fair', 10, 0.9), row('fast', 12, 0.7), row('dominated', 9, 0.8)],
   }
   const summary = summarizeM1CellTradeoffs(result)[0]
   expect(summary.throughputLeaders.map((item) => item.scheduler)).toEqual(['fast'])
   expect(summary.fairnessLeaders.map((item) => item.scheduler)).toEqual(['fair'])
   expect(summary.paretoRows.map((item) => item.scheduler)).toEqual(['fair', 'fast'])
 })
 it('preserves ties as joint leaders and Pareto-optimal alternatives', () => {
   const result: M1CellMatrixResult = {
     seeds: [1, 2, 3],
     pairwiseRows: [],
     rows: [row('first', 10, 0.9), row('second', 10, 0.9)],
   }
   const summary = summarizeM1CellTradeoffs(result)[0]
   expect(summary.throughputLeaders).toHaveLength(2)
   expect(summary.fairnessLeaders).toHaveLength(2)
   expect(summary.paretoRows).toHaveLength(2)
 })
 it('returns an empty summary for an empty experiment matrix', () => {
   expect(summarizeM1CellTradeoffs({ seeds: [], rows: [], pairwiseRows: [] })).toEqual([])
 })
})
