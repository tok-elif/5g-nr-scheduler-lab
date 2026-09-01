import { summarizeMetric } from '../metrics/statistics'
import { runM0 } from './m0'
import { compareM1Schedulers } from './m1'
import type { CellConfig, M1BatchResult, M1CellMatrixResult, M1Config, M1PairwiseComparison, ScenarioConfig, SchedulerKind } from './types'
interface SchedulerSeries {
 label: string
 throughput: number[]
 fairness: (number | null)[]
}
/** Jain null (tanımsız) örneklerini istatistik dışında bırakır. */
function definedNumbers(values: readonly (number | null)[]): number[] {
 return values.filter((value): value is number => value !== null)
}
/** Eşleştirilmiş fark; her iki uç da tanımlıysa hesaplanır. */
function pairedDifferences(
 comparator: readonly (number | null)[],
 baseline: readonly (number | null)[],
): number[] {
 return definedNumbers(comparator.map((value, index) => {
   const other = baseline[index]
   return value === null || other === null || other === undefined ? null : value - other
 }))
}
function createPairwiseComparisons(collected: ReadonlyMap<SchedulerKind, SchedulerSeries>, runCount: number): M1PairwiseComparison[] {
 const entries = [...collected.entries()]
 return entries.flatMap(([baselineScheduler, baseline], baselineIndex) =>
   entries.slice(baselineIndex + 1).map(([comparatorScheduler, comparator]) => ({
     baselineScheduler,
     baselineSchedulerLabel: baseline.label,
     comparatorScheduler,
     comparatorSchedulerLabel: comparator.label,
     runCount,
     throughputDifferenceMbps: summarizeMetric(comparator.throughput.map((value, index) => value -baseline.throughput[index])),
     jainFairnessDifference: summarizeMetric(pairedDifferences(comparator.fairness, baseline.fairness)),
   })))
}
export function runM1BatchExperiment(
 cell: CellConfig,
 scenario: ScenarioConfig,
 m1Config: M1Config,
 seedCount: number,
): M1BatchResult {
 if (!Number.isInteger(seedCount) || seedCount < 2 || seedCount > 100) {
   throw new Error('Çoklu deney seed sayısı 2–100 arasında bir tam sayı olmalıdır.')
 }
 const seeds = Array.from({ length: seedCount }, (_, index) => scenario.seed + index)
 const collected = new Map<SchedulerKind, SchedulerSeries>()
 for (const seed of seeds) {
   const m0 = runM0(cell, { ...scenario, seed })
   for (const result of compareM1Schedulers(cell, m0.ues, m1Config)) {
     const current = collected.get(result.scheduler) ?? {
       label: result.schedulerLabel,
       throughput: [],
       fairness: [],
     }
     current.throughput.push(result.cellThroughputMbps)
     current.fairness.push(result.jainFairness)
     collected.set(result.scheduler, current)
   }
 }
 return {
   seeds,
   schedulerResults: [...collected.entries()].map(([scheduler, values]) => ({
     scheduler,
     schedulerLabel: values.label,
     runCount: seedCount,
     throughputMbps: summarizeMetric(values.throughput),
     jainFairness: summarizeMetric(definedNumbers(values.fairness)),
   })),
   pairwiseComparisons: createPairwiseComparisons(collected, seedCount),
 }
}
export function runM1CellMatrixExperiment(
 cells: readonly CellConfig[],
 scenario: ScenarioConfig,
 m1Config: M1Config,
 seedCount: number,
): M1CellMatrixResult {
 if (cells.length === 0) throw new Error('Deney matrisi için en az bir hücre gereklidir.')
 const batches = cells.map((cell) => ({
   cell,
   batch: runM1BatchExperiment(cell, scenario, m1Config, seedCount),
 }))
 return {
   seeds: batches[0].batch.seeds,
   rows: batches.flatMap(({ cell, batch }) => batch.schedulerResults.map((result) => ({
     cell,
     ...result,
   }))),
   pairwiseRows: batches.flatMap(({ cell, batch }) => batch.pairwiseComparisons.map((result) => ({
     cell,
     ...result,
   }))),
 }
}
