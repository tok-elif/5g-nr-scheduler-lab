import { CELL_CONFIGS } from '../config/cells'
import { M2_SCHEDULERS } from '../m2Schedulers'
import { DEFAULT_M2_LOAD_PROFILE_ID, DEFAULT_M2_MATRIX_SETTINGS, type M2LoadProfileMode } from '../config/m2Scenarios'
import { runM2Matrix, type M2MatrixRow } from './m2Matrix'
export const M2_BATCH_METRICS = [
 'totalThroughputMbps',
 'jainFairness',
 'deliveryRatio',
 'undeliveredRatio',
 'gbrUeMeetingRatio',
 'gbrMeanFulfillmentRatio',
 'aggregateGbrServiceRatio',
 'gbrSatisfactionRatio',
 'worstQosP99Ms',
 'pdbViolationRatio',
 'queuedPackets',
 'queuedBytes',
 'overdueQueuedPackets',
 'oldestQueuedPacketAgeMs',
] as const
export type M2BatchMetric = typeof M2_BATCH_METRICS[number]
export type M2MetricDomain = 'ratio' | 'nonnegative' | 'unbounded'
export const M2_BATCH_METRIC_DOMAINS: Record<M2BatchMetric, M2MetricDomain> = {
 totalThroughputMbps: 'nonnegative',
 jainFairness: 'ratio',
 deliveryRatio: 'ratio',
 undeliveredRatio: 'ratio',
 gbrUeMeetingRatio: 'ratio',
 gbrMeanFulfillmentRatio: 'ratio',
 aggregateGbrServiceRatio: 'ratio',
 gbrSatisfactionRatio: 'ratio',
 worstQosP99Ms: 'nonnegative',
 pdbViolationRatio: 'ratio',
 queuedPackets: 'nonnegative',
 queuedBytes: 'nonnegative',
 overdueQueuedPackets: 'nonnegative',
 oldestQueuedPacketAgeMs: 'nonnegative',
}
export interface M2BatchMatrixRequest {
 scenarioId: string
 loadProfileId: string
 durationMs: number
 ueCount: number
 baseSeed: number
 seedCount: number
 seedStep: number
}
export interface M2SampleSummary {
 sampleSize: number
 mean: number
 standardDeviation: number
 confidence95Lower: number
 confidence95Upper: number
 confidence95HalfWidth: number
}
export type M2MetricSummaryMap = Record<M2BatchMetric, M2SampleSummary | null>
export interface M2BatchRawRow extends M2MatrixRow {
 seedIndex: number
}
export interface M2BatchSummaryRow {
 scenarioId: string
 scenarioLabel: string
 loadProfileId: string
 loadProfileLabel: string
 loadMode: M2LoadProfileMode
 targetLoadFraction: number | null
 arrivalRateMultiplier: number
 baselineOfferedLoadMbps: number
 offeredLoadMbps: number
 capacityReferenceMbps: number
 normalizedOfferedLoad: number
 cellIndex: number
 cellId: string
 cellLabel: string
 resourceBlocks: number
 slotDurationMs: number
 scheduler: string
 schedulerLabel: string
 metrics: M2MetricSummaryMap
}
export interface M2BatchPairwiseRow {
 scenarioId: string
 loadProfileId: string
 loadMode: M2LoadProfileMode
 targetLoadFraction: number | null
 cellId: string
 cellLabel: string
 schedulerA: string
 schedulerALabel: string
 schedulerB: string
 schedulerBLabel: string
 metrics: M2MetricSummaryMap
}
export interface M2BatchProgress {
 completedRuns: number
 totalRuns: number
 seedIndex: number
 seedCount: number
 baseSeed: number
 cellLabel: string
 schedulerLabel: string
}
export interface M2BatchMatrixResult {
 scenarioId: string
 scenarioLabel: string
 scenarioDescription: string
 loadProfileId: string
 loadProfileLabel: string
 loadProfileDescription: string
 loadMode: M2LoadProfileMode
 targetLoadFraction: number | null
 durationMs: number
 ueCount: number
 baseSeed: number
 seedCount: number
 seedStep: number
 seeds: number[]
 cellCount: number
 schedulerCount: number
 totalRuns: number
 rawRows: M2BatchRawRow[]
 summaryRows: M2BatchSummaryRow[]
 pairwiseRows: M2BatchPairwiseRow[]
}
const T_975: number[] = [
 0,
 12.706,
 4.303,
 3.182,
 2.776,
 2.571,
 2.447,
 2.365,
 2.306,
 2.262,
 2.228,
 2.201,
 2.179,
 2.160,
 2.145,
 2.131,
 2.120,
 2.110,
 2.101,
 2.093,
 2.086,
 2.080,
 2.074,
 2.069,
 2.064,
 2.060,
 2.056,
 2.052,
 2.048,
 2.045,
 2.042,
]
const FLOATING_DIFFERENCE_ZERO_THRESHOLD = 1e-16
function tCritical95(sampleSize: number): number {
 if (sampleSize <= 1) return 0
 const degreesOfFreedom = sampleSize - 1
 return T_975[degreesOfFreedom] ?? 1.96
}
export function normalizeTinyDifference(value: number): number {
 return Math.abs(value) < FLOATING_DIFFERENCE_ZERO_THRESHOLD ? 0 : value
}
function clampToDomain(value: number, domain: M2MetricDomain): number {
 if (domain === 'ratio') return Math.min(1, Math.max(0, value))
 if (domain === 'nonnegative') return Math.max(0, value)
 return normalizeTinyDifference(value)
}
export function summarizeM2Sample(
 values: number[],
 domain: M2MetricDomain = 'unbounded',
): M2SampleSummary {
 if (values.length === 0) throw new Error('Boş örneklem özetlenemez.')
 if (values.some((value) => !Number.isFinite(value))) throw new Error('Örneklem sonlu sayılardan oluşmalıdır.')
 const normalizedValues = values.map((value) => domain === 'unbounded' ? normalizeTinyDifference(value) : value)
 const sampleSize = normalizedValues.length
 const rawMean = normalizedValues.reduce((sum, value) => sum + value, 0) / sampleSize
 const mean = clampToDomain(rawMean, domain)
 const squaredDeviationSum = normalizedValues.reduce((sum, value) => sum + (value - rawMean) ** 2, 0)
 const standardDeviation = normalizeTinyDifference(
   sampleSize > 1 ? Math.sqrt(squaredDeviationSum / (sampleSize - 1)) : 0,
 )
 const confidence95HalfWidth = normalizeTinyDifference(
   sampleSize > 1
     ? tCritical95(sampleSize) * standardDeviation / Math.sqrt(sampleSize)
     : 0,
 )
 const rawLower = rawMean - confidence95HalfWidth
 const rawUpper = rawMean + confidence95HalfWidth
 return {
   sampleSize,
   mean,
   standardDeviation,
   confidence95Lower: clampToDomain(rawLower, domain),
   confidence95Upper: clampToDomain(rawUpper, domain),
   confidence95HalfWidth,
 }
}
function validateBatchRequest(request: M2BatchMatrixRequest): void {
 if (!Number.isSafeInteger(request.seedCount) || request.seedCount < 2 || request.seedCount > 50) {
   throw new Error('M2 çoklu-seed sayısı 2 ile 50 arasında olmalıdır.')
 }
 if (!Number.isSafeInteger(request.seedStep) || request.seedStep < 1 || request.seedStep > 1_000_000) {
   throw new Error('M2 seed adımı 1 ile 1000000 arasında olmalıdır.')
 }
 if (!Number.isSafeInteger(request.baseSeed) || request.baseSeed < 0) {
   throw new Error('M2 temel seed sıfır veya pozitif güvenli bir tam sayı olmalıdır.')
 }
 const finalSeed = request.baseSeed + (request.seedCount - 1) * request.seedStep
 if (!Number.isSafeInteger(finalSeed) || finalSeed > 2_147_483_647) {
   throw new Error('Üretilen son seed 2147483647 sınırını aşmamalıdır.')
 }
}
export function createDefaultM2BatchMatrixRequest(): M2BatchMatrixRequest {
 return {
   scenarioId: 'sc2-mixed-qos',
   loadProfileId: DEFAULT_M2_LOAD_PROFILE_ID,
   durationMs: DEFAULT_M2_MATRIX_SETTINGS.durationMs,
   ueCount: DEFAULT_M2_MATRIX_SETTINGS.ueCount,
   baseSeed: DEFAULT_M2_MATRIX_SETTINGS.baseSeed,
   seedCount: DEFAULT_M2_MATRIX_SETTINGS.seedCount,
   seedStep: DEFAULT_M2_MATRIX_SETTINGS.seedStep,
 }
}
function metricValue(row: M2MatrixRow, metric: M2BatchMetric): number | null {
 const value = row[metric]
 return typeof value === 'number' && Number.isFinite(value) ? value : null
}
function summarizeMetrics(rows: M2MatrixRow[]): M2MetricSummaryMap {
 return Object.fromEntries(M2_BATCH_METRICS.map((metric) => {
   const values = rows.map((row) => metricValue(row, metric)).filter((value): value is number => value !== null)
   return [metric, values.length > 0 ? summarizeM2Sample(values, M2_BATCH_METRIC_DOMAINS[metric]) : null]
 })) as M2MetricSummaryMap
}
function groupKey(row: Pick<M2MatrixRow, 'cellId' | 'scheduler'>): string {
 return `${row.cellId}::${row.scheduler}`
}
function buildSummaryRows(rawRows: M2BatchRawRow[]): M2BatchSummaryRow[] {
 const groups = new Map<string, M2BatchRawRow[]>()
 for (const row of rawRows) {
   const key = groupKey(row)
   const group = groups.get(key)
   if (group) group.push(row)
   else groups.set(key, [row])
 }
 return [...groups.values()].map((rows) => {
   const first = rows[0]
   if (!first) throw new Error('Boş M2 özet grubu oluşturuldu.')
   return {
     scenarioId: first.scenarioId,
     scenarioLabel: first.scenarioLabel,
     loadProfileId: first.loadProfileId,
     loadProfileLabel: first.loadProfileLabel,
     loadMode: first.loadMode,
     targetLoadFraction: first.targetLoadFraction,
     arrivalRateMultiplier: rows.reduce((sum, row) => sum + row.arrivalRateMultiplier, 0) / rows.length,
     baselineOfferedLoadMbps: rows.reduce((sum, row) => sum + row.baselineOfferedLoadMbps, 0) / rows.length,
     offeredLoadMbps: rows.reduce((sum, row) => sum + row.offeredLoadMbps, 0) / rows.length,
     capacityReferenceMbps: rows.reduce((sum, row) => sum + row.capacityReferenceMbps, 0) / rows.length,
     normalizedOfferedLoad: rows.reduce((sum, row) => sum + row.normalizedOfferedLoad, 0) / rows.length,
     cellIndex: first.cellIndex,
     cellId: first.cellId,
     cellLabel: first.cellLabel,
     resourceBlocks: first.resourceBlocks,
     slotDurationMs: first.slotDurationMs,
     scheduler: first.scheduler,
     schedulerLabel: first.schedulerLabel,
     metrics: summarizeMetrics(rows),
   }
 }).sort((left, right) => left.cellIndex - right.cellIndex || left.schedulerLabel.localeCompare(right.schedulerLabel)) }
function buildPairwiseRows(rawRows: M2BatchRawRow[]): M2BatchPairwiseRow[] {
 const byGroup = new Map<string, M2BatchRawRow[]>()
 for (const row of rawRows) {
   const key = groupKey(row)
   const group = byGroup.get(key)
   if (group) group.push(row)
   else byGroup.set(key, [row])
 }
 const cellIds = [...new Set(rawRows.map((row) => row.cellId))]
 const pairwiseRows: M2BatchPairwiseRow[] = []
 for (const cellId of cellIds) {
   for (let firstIndex = 0; firstIndex < M2_SCHEDULERS.length; firstIndex += 1) {
     for (let secondIndex = firstIndex + 1; secondIndex < M2_SCHEDULERS.length; secondIndex += 1) {
       const schedulerA = M2_SCHEDULERS[firstIndex]
       const schedulerB = M2_SCHEDULERS[secondIndex]
       if (!schedulerA || !schedulerB) continue
       const rowsA = byGroup.get(`${cellId}::${schedulerA.kind}`) ?? []
       const rowsB = byGroup.get(`${cellId}::${schedulerB.kind}`) ?? []
       const rowsBBySeed = new Map(rowsB.map((row) => [row.baseSeed, row]))
       const paired = rowsA.flatMap((rowA) => {
         const rowB = rowsBBySeed.get(rowA.baseSeed)
         return rowB ? [[rowA, rowB] as const] : []
       })
       if (paired.length === 0) continue
       const template = paired[0]?.[0]
       if (!template) continue
       const metrics = Object.fromEntries(M2_BATCH_METRICS.map((metric) => {
         const differences = paired.flatMap(([rowA, rowB]) => {
           const valueA = metricValue(rowA, metric)
           const valueB = metricValue(rowB, metric)
           return valueA === null || valueB === null ? [] : [normalizeTinyDifference(valueA - valueB)]
         })
         return [metric, differences.length > 0 ? summarizeM2Sample(differences, 'unbounded') : null]
       })) as M2MetricSummaryMap
       pairwiseRows.push({
         scenarioId: template.scenarioId,
         loadProfileId: template.loadProfileId,
         loadMode: template.loadMode,
         targetLoadFraction: template.targetLoadFraction,
         cellId,
         cellLabel: template.cellLabel,
         schedulerA: schedulerA.kind,
         schedulerALabel: schedulerA.label,
         schedulerB: schedulerB.kind,
         schedulerBLabel: schedulerB.label,
         metrics,
       })
     }
   }
 }
 return pairwiseRows
}
export function runM2BatchMatrix(
 request: M2BatchMatrixRequest,
 onProgress?: (progress: M2BatchProgress) => void,
): M2BatchMatrixResult {
 validateBatchRequest(request)
 const seeds = Array.from({ length: request.seedCount }, (_, index) => request.baseSeed + index * request.seedStep)
 const rawRows: M2BatchRawRow[] = []
 const singleRunCount = CELL_CONFIGS.length * M2_SCHEDULERS.length
 const totalRuns = singleRunCount * seeds.length
 let scenarioMetadata: ReturnType<typeof runM2Matrix> | undefined
 seeds.forEach((seed, seedIndex) => {
   const matrix = runM2Matrix({
     scenarioId: request.scenarioId,
     loadProfileId: request.loadProfileId,
     durationMs: request.durationMs,
     ueCount: request.ueCount,
     baseSeed: seed,
   }, (progress) => onProgress?.({
     completedRuns: seedIndex * singleRunCount + progress.completedRuns,
     totalRuns,
     seedIndex: seedIndex + 1,
     seedCount: seeds.length,
     baseSeed: seed,
     cellLabel: progress.cellLabel,
     schedulerLabel: progress.schedulerLabel,
   }))
   scenarioMetadata ??= matrix
   rawRows.push(...matrix.rows.map((row) => ({ ...row, seedIndex })))
 })
 if (!scenarioMetadata) throw new Error('M2 çoklu-seed matrisi sonuç üretmedi.')
 return {
   scenarioId: scenarioMetadata.scenarioId,
   scenarioLabel: scenarioMetadata.scenarioLabel,
   scenarioDescription: scenarioMetadata.scenarioDescription,
   loadProfileId: scenarioMetadata.loadProfileId,
   loadProfileLabel: scenarioMetadata.loadProfileLabel,
   loadProfileDescription: scenarioMetadata.loadProfileDescription,
   loadMode: scenarioMetadata.loadMode,
   targetLoadFraction: scenarioMetadata.targetLoadFraction,
   durationMs: request.durationMs,
   ueCount: request.ueCount,
   baseSeed: request.baseSeed,
   seedCount: request.seedCount,
   seedStep: request.seedStep,
   seeds,
   cellCount: scenarioMetadata.cellCount,
   schedulerCount: scenarioMetadata.schedulerCount,
   totalRuns,
   rawRows,
   summaryRows: buildSummaryRows(rawRows),
   pairwiseRows: buildPairwiseRows(rawRows),
 }
}
