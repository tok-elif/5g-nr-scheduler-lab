import { CELL_CONFIGS } from '../config/cells'
import { M3_CONFIG } from '../config/m3'
import { getM2ExperimentScenario, resolveM2LoadProfile } from '../config/m2Scenarios'
import {
 seedListFingerprint,
 seedsForRole,
 type ExperimentSeedRole,
} from '../config/m3ExperimentProtocol'
import { M2_SCHEDULERS } from '../m2Schedulers'
import { M3_SCHEDULERS } from '../m3Schedulers'
import { maximumFinite } from '../metrics/percentiles'
import { runM0 } from './m0'
import { runM2 } from './m2'
import type { M2Config, M2Result } from './m2Types'
import type { CellConfig, ScenarioConfig } from './types'
export type M3ScenarioKind = 'sc1-same-qos' | 'sc2-mixed-qos'
export type M3LoadProfileId = 'capacity-50' | 'capacity-80' | 'capacity-110'
export const M3_LOAD_PROFILE_IDS: readonly M3LoadProfileId[] = Object.freeze([
 'capacity-50',
 'capacity-80',
 'capacity-110',
])
export interface M3ExperimentRequest {
 baseScenario: ScenarioConfig
 m2Config: M2Config
 seedCount: number
 seedRole?: ExperimentSeedRole
 seeds?: number[]
}
export interface M3ScenarioDefinition {
 kind: M3ScenarioKind
 label: string
 description: string
 config: M2Config
}
export interface M3Metrics {
 cellThroughputMbps: number
 jainFairness: number | null
 deliveryRatio: number | null
 gbrUeMeetingRatio: number | null
 gbrMeanFulfillmentRatio: number | null
 aggregateGbrServiceRatio: number | null
 /** @deprecated Use gbrUeMeetingRatio. */
 gbrMeetingRatio: number | null
 worstQosP99Ms: number | null
 pdbViolationRatio: number
 queuedPackets: number
 overdueQueuedPackets: number
 oldestQueuedPacketAgeMs: number
}
export const M3_METRIC_NAMES = [
 'cellThroughputMbps',
 'jainFairness',
 'deliveryRatio',
 'gbrUeMeetingRatio',
 'gbrMeanFulfillmentRatio',
 'aggregateGbrServiceRatio',
 'gbrMeetingRatio',
 'worstQosP99Ms',
 'pdbViolationRatio',
 'queuedPackets',
 'overdueQueuedPackets',
 'oldestQueuedPacketAgeMs',
] as const satisfies readonly (keyof M3Metrics)[]
export type M3MetricName = typeof M3_METRIC_NAMES[number]
export interface SampleStatistics {
 sampleCount: number
 status: 'available' | 'not-applicable'
 mean: number | null
 standardDeviation: number | null
 confidence95HalfWidth: number | null
 confidence95Low: number | null
 confidence95High: number | null
}
export interface M3RawRun {
 scenarioKind: M3ScenarioKind
 scenarioLabel: string
 loadProfileId: M3LoadProfileId
 loadProfileLabel: string
 offeredLoadMbps: number
 capacityReferenceMbps: number
 normalizedOfferedLoad: number
 cell: CellConfig
 seed: number
 scheduler: string
 schedulerLabel: string
 effectiveTrafficSeed: number
 sinrFingerprint: string
 trafficFingerprint: string
 metrics: M3Metrics
 qosMetrics: M3QosMetrics[]
}
export interface M3QosMetrics {
 fiveQi: number
 qosLabel: string
 packetDelayBudgetMs: number
 delayP50Ms: number | null
 delayP95Ms: number | null
 delayP99Ms: number | null
 p99Status: 'empty' | 'insufficient' | 'sufficient'
 latencySamplePackets: number
 gbrUeMeetingRatio: number | null
 gbrMeanFulfillmentRatio: number | null
 aggregateGbrServiceRatio: number | null
}
export interface M3SummaryRow {
 scenarioKind: M3ScenarioKind
 scenarioLabel: string
 loadProfileId: M3LoadProfileId
 loadProfileLabel: string
 normalizedOfferedLoad: number
 cell: CellConfig
 scheduler: string
 schedulerLabel: string
 metrics: Record<M3MetricName, SampleStatistics>
}
export interface M3PairwiseRow {
 scenarioKind: M3ScenarioKind
 scenarioLabel: string
 loadProfileId: M3LoadProfileId
 loadProfileLabel: string
 normalizedOfferedLoad: number
 cell: CellConfig
 baselineScheduler: string
 baselineSchedulerLabel: string
 comparatorScheduler: string
 comparatorSchedulerLabel: string
 direction: 'comparator-minus-baseline'
 metrics: Record<M3MetricName, SampleStatistics>
}
export interface M3IntegrityCheck {
 id: string
 label: string
 passed: boolean
 detail: string
}
export interface M3ScientificExperimentResult {
 schemaVersion: 2
 generatedAt: string
 request: M3ExperimentRequest
 seedRole: ExperimentSeedRole
 seedListFingerprint: string
 seeds: number[]
 scenarioDefinitions: M3ScenarioDefinition[]
 rawRuns: M3RawRun[]
 summaryRows: M3SummaryRow[]
 pairwiseRows: M3PairwiseRow[]
 integrityChecks: M3IntegrityCheck[]
 allIntegrityChecksPassed: boolean
}
const BASELINES = ['m-lwdf', 'exp-pf'] as const
const COMPARATORS = M3_SCHEDULERS
 .map((scheduler) => scheduler.kind)
 .filter((kind) => !BASELINES.includes(kind as typeof BASELINES[number]))
export function deliveryRatioOrNull(numerator: number, denominator: number): number | null {
 if (denominator <= 0) return null
 return Math.max(0, Math.min(1, numerator / denominator))
}
function fnv1a(text: string): string {
 let hash = 0x811c9dc5
 for (let index = 0; index < text.length; index += 1) {
   hash ^= text.charCodeAt(index)
   hash = Math.imul(hash, 0x01000193)
 }
 return `FNV-${(hash >>> 0).toString(16).padStart(8, '0').toUpperCase()}`
}
function sinrFingerprint(result: ReturnType<typeof runM0>): string {
 return fnv1a(result.ues
   .map((ue) => `${ue.id}:${ue.sinrDb.toFixed(8)}:${ue.achievableRateMbps.toFixed(8)}`)
   .join('|'))
}
function trafficFingerprint(result: M2Result): string {
 return result.trafficFingerprint
}
function metricsFromResult(result: M2Result): M3Metrics {
 const p99Values = result.qosResults.flatMap((qos) =>
   qos.delayP99Ms === null || qos.delayP99Estimate.status !== 'sufficient'
     ? []
     : [qos.delayP99Ms])
 return {
   cellThroughputMbps: result.cellThroughputMbps,
   jainFairness: result.jainFairness,
   deliveryRatio: deliveryRatioOrNull(result.deliveredPackets, result.generatedPackets),
   gbrUeMeetingRatio: result.gbrUeMeetingRatio,
   gbrMeanFulfillmentRatio: result.gbrMeanFulfillmentRatio,
   aggregateGbrServiceRatio: result.aggregateGbrServiceRatio,
   gbrMeetingRatio: result.gbrUeMeetingRatio,
   worstQosP99Ms: p99Values.length > 0 ? maximumFinite(p99Values) : null,
   pdbViolationRatio: result.pdbViolationRatio,
   queuedPackets: result.queuedPackets,
   overdueQueuedPackets: result.overdueQueuedPackets,
   oldestQueuedPacketAgeMs: result.oldestQueuedPacketAgeMs,
 }
}
function qosMetricsFromResult(result: M2Result): M3QosMetrics[] {
 return result.qosResults.map((qos) => ({
   fiveQi: qos.fiveQi,
   qosLabel: qos.qosLabel,
   packetDelayBudgetMs: qos.packetDelayBudgetMs,
   delayP50Ms: qos.delayP50Ms,
   delayP95Ms: qos.delayP95Ms,
   delayP99Ms: qos.delayP99Ms,
   p99Status: qos.delayP99Estimate.status,
   latencySamplePackets: qos.latencySamplePackets,
   gbrUeMeetingRatio: qos.gbrUeMeetingRatio,
   gbrMeanFulfillmentRatio: qos.gbrMeanFulfillmentRatio,
   aggregateGbrServiceRatio: qos.aggregateGbrServiceRatio,
 }))
}
function tCritical95(degreesOfFreedom: number): number {
 const table = [
   0,
   12.706, 4.303, 3.182, 2.776, 2.571,
   2.447, 2.365, 2.306, 2.262, 2.228,
   2.201, 2.179, 2.160, 2.145, 2.131,
   2.120, 2.110, 2.101, 2.093, 2.086,
   2.080, 2.074, 2.069, 2.064, 2.060,
   2.056, 2.052, 2.048, 2.045, 2.042,
 ]
 if (degreesOfFreedom <= 0) return 0
 if (degreesOfFreedom <= 30) return table[degreesOfFreedom]
 const z = 1.959963984540054
 const v = degreesOfFreedom
 const z2 = z * z
 const z3 = z2 * z
 const z5 = z3 * z2
 const z7 = z5 * z2
 return z
   + (z3 + z) / (4 * v)
   + (5 * z5 + 16 * z3 + 3 * z) / (96 * v * v)
   + (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * v * v * v)
}
function summarize(
 nullableValues: readonly (number | null)[],
 bounds?: readonly [number, number],
): SampleStatistics {
 const values = nullableValues.filter((value): value is number => value !== null)
 if (values.length === 0) {
   return {
     sampleCount: 0,
     status: 'not-applicable',
     mean: null,
     standardDeviation: null,
     confidence95HalfWidth: null,
     confidence95Low: null,
     confidence95High: null,
   }
 }
 const mean = values.reduce((sum, value) => sum + value, 0) / values.length
 const variance = values.length > 1
   ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)
   : 0
 const standardDeviation = Math.sqrt(Math.max(0, variance))
 const halfWidth = values.length > 1
   ? tCritical95(values.length - 1) * standardDeviation / Math.sqrt(values.length)
   : 0
 let low = mean - halfWidth
 let high = mean + halfWidth
 if (bounds) {
   low = Math.max(bounds[0], low)
   high = Math.min(bounds[1], high)
 }
 return {
   sampleCount: values.length,
   status: 'available',
   mean,
   standardDeviation,
   confidence95HalfWidth: halfWidth,
   confidence95Low: low,
   confidence95High: high,
 }
}
function summarizeMetrics(
 runs: readonly M3RawRun[],
 differenceMode = false,
): Record<M3MetricName, SampleStatistics> {
 return Object.fromEntries(M3_METRIC_NAMES.map((metric) => {
   const values = runs.map((run) => run.metrics[metric])
   const ratioMetric = metric === 'jainFairness'
     || metric === 'deliveryRatio'
     || metric === 'gbrUeMeetingRatio'
     || metric === 'gbrMeanFulfillmentRatio'
     || metric === 'aggregateGbrServiceRatio'
     || metric === 'gbrMeetingRatio'
     || metric === 'pdbViolationRatio'
   return [metric, summarize(values, differenceMode ? undefined : ratioMetric ? [0, 1] : [0,
Number.POSITIVE_INFINITY])]
 })) as Record<M3MetricName, SampleStatistics>
}
export function createM3ScenarioDefinitions(config: M2Config): M3ScenarioDefinition[] {
 return (['sc1-same-qos', 'sc2-mixed-qos'] as const).map((kind) => {
   const documentedScenario = getM2ExperimentScenario(kind)
   return {
     kind,
     label: documentedScenario.label,
     description: documentedScenario.description,
     config: {
       ...config,
       traceSlotLimit: 0,
       trafficClasses: documentedScenario.trafficClasses.map((traffic) => ({ ...traffic })),
     },
   }
 })
}
export function buildSummaryRows(rawRuns: readonly M3RawRun[]): M3SummaryRow[] {
 const rows: M3SummaryRow[] = []
 for (const scenario of ['sc1-same-qos', 'sc2-mixed-qos'] as const) {
   for (const cell of CELL_CONFIGS) {
     for (const loadProfileId of M3_LOAD_PROFILE_IDS) {
     for (const scheduler of M3_SCHEDULERS) {
       const runs = rawRuns.filter((run) =>
         run.scenarioKind === scenario
         && run.cell.id === cell.id
         && run.loadProfileId === loadProfileId
         && run.scheduler === scheduler.kind)
       if (runs.length === 0) {
         throw new Error(`M3 özet koşusu eksik: scenario=${scenario}, loadProfileId=${loadProfileId}, cell=${cell.id},scheduler=${scheduler.kind}`)
       }
       const firstRun = runs[0]
       rows.push({
         scenarioKind: scenario,
         scenarioLabel: firstRun.scenarioLabel,
         loadProfileId,
         loadProfileLabel: firstRun.loadProfileLabel,
         normalizedOfferedLoad: firstRun.normalizedOfferedLoad,
         cell,
         scheduler: scheduler.kind,
         schedulerLabel: scheduler.label,
         metrics: summarizeMetrics(runs),
       })
     }
     }
   }
 }
 return rows
}
function buildPairwiseRows(rawRuns: readonly M3RawRun[], seeds: readonly number[]): M3PairwiseRow[] {
 const rows: M3PairwiseRow[] = []
 for (const scenario of ['sc1-same-qos', 'sc2-mixed-qos'] as const) {
   for (const cell of CELL_CONFIGS) {
     for (const loadProfileId of M3_LOAD_PROFILE_IDS) {
     for (const baselineKind of BASELINES) {
       for (const comparatorKind of COMPARATORS) {
       const baselineLabel = M3_SCHEDULERS.find((item) => item.kind === baselineKind)?.label ?? baselineKind
       const comparatorLabel = M3_SCHEDULERS.find((item) => item.kind === comparatorKind)?.label ?? comparatorKind
       const differences: M3RawRun[] = seeds.map((seed) => {
         const baseline = rawRuns.find((run) =>
           run.scenarioKind === scenario
           && run.cell.id === cell.id
           && run.loadProfileId === loadProfileId
           && run.seed === seed
           && run.scheduler === baselineKind)
         const comparator = rawRuns.find((run) =>
           run.scenarioKind === scenario
           && run.cell.id === cell.id
           && run.loadProfileId === loadProfileId
           && run.seed === seed
           && run.scheduler === comparatorKind)
         if (!baseline || !comparator) {
           throw new Error(`M3 eşleştirilmiş koşu eksik: ${scenario}/${loadProfileId}/${cell.id}/${seed}/${baselineKind}`)
         }
         const metrics = { ...baseline.metrics } as Record<M3MetricName, number | null>
         for (const metric of M3_METRIC_NAMES) {
           const comparatorValue = comparator.metrics[metric]
           const baselineValue = baseline.metrics[metric]
           metrics[metric] = comparatorValue === null || baselineValue === null
             ? null
             : comparatorValue - baselineValue
         }
         return {
           ...comparator,
           scheduler: `${comparatorKind}-minus-${baselineKind}`,
           schedulerLabel: `${comparatorLabel} − ${baselineLabel}`,
           metrics: metrics as M3Metrics,
         }
       })
       rows.push({
         scenarioKind: scenario,
         scenarioLabel: differences[0]?.scenarioLabel ?? scenario,
         loadProfileId,
         loadProfileLabel: differences[0]?.loadProfileLabel ?? loadProfileId,
         normalizedOfferedLoad: differences[0]?.normalizedOfferedLoad ?? 0,
         cell,
         baselineScheduler: baselineKind,
         baselineSchedulerLabel: baselineLabel,
         comparatorScheduler: comparatorKind,
         comparatorSchedulerLabel: comparatorLabel,
         direction: 'comparator-minus-baseline',
         metrics: summarizeMetrics(differences, true),
       })
       }
     }
     }
   }
 }
 return rows
}
export function buildIntegrityChecks(
 rawRuns: readonly M3RawRun[],
 summaryRows: readonly M3SummaryRow[],
 pairwiseRows: readonly M3PairwiseRow[],
 seeds: readonly number[],
 scenarios: readonly M3ScenarioDefinition[],
): M3IntegrityCheck[] {
 const expectedM2 = ['round-robin', 'max-ci', 'proportional-fair', 'm-lwdf', 'exp-pf']
 const actualM2 = M2_SCHEDULERS.map((scheduler) => scheduler.kind)
 const expectedM3 = ['m-lwdf', 'exp-pf', 'qdf-pf']
 const actualM3 = M3_SCHEDULERS.map((scheduler) => scheduler.kind)
 const conditionGroups = new Map<string, M3RawRun[]>()
 for (const run of rawRuns) {
   const key = `${run.scenarioKind}|${run.loadProfileId}|${run.cell.id}|${run.seed}`
   const group = conditionGroups.get(key) ?? []
   group.push(run)
   conditionGroups.set(key, group)
 }
 const commonConditions = [...conditionGroups.values()].every((group) =>
   group.length === M3_SCHEDULERS.length
   && new Set(group.map((run) => run.sinrFingerprint)).size === 1
   && new Set(group.map((run) => run.trafficFingerprint)).size === 1
   && new Set(group.map((run) => run.effectiveTrafficSeed)).size === 1
   && new Set(group.map((run) => run.capacityReferenceMbps.toFixed(9))).size === 1
   && new Set(group.map((run) => run.normalizedOfferedLoad.toFixed(9))).size === 1)
 const uniqueRunKeys = new Set(rawRuns.map((run) =>
   `${run.scenarioKind}|${run.loadProfileId}|${run.cell.id}|${run.seed}|${run.scheduler}`))
 const completeLoadCoverage = new Set(rawRuns.map((run) => run.loadProfileId)).size
   === M3_LOAD_PROFILE_IDS.length
 const expectedRawCount = scenarios.length * M3_LOAD_PROFILE_IDS.length
   * CELL_CONFIGS.length * M3_SCHEDULERS.length * seeds.length
 const expectedSummaryCount = scenarios.length * M3_LOAD_PROFILE_IDS.length
   * CELL_CONFIGS.length * M3_SCHEDULERS.length
 const expectedPairwiseCount = scenarios.length * M3_LOAD_PROFILE_IDS.length
   * CELL_CONFIGS.length * BASELINES.length * COMPARATORS.length
 const finiteStatistics = [...summaryRows, ...pairwiseRows].every((row) =>
   M3_METRIC_NAMES.every((metric) => Object.values(row.metrics[metric])
     .every((value) => value === null || typeof value === 'string' || Number.isFinite(value))))
 const normalizedLoadFormula = rawRuns.every((run) => run.capacityReferenceMbps > 0
   && Math.abs(run.normalizedOfferedLoad
     - run.offeredLoadMbps / run.capacityReferenceMbps) <= 1e-9)
 const invalidNormalizedLoadRuns = rawRuns.filter((run) => !(run.capacityReferenceMbps > 0)
   || Math.abs(run.normalizedOfferedLoad
     - run.offeredLoadMbps / run.capacityReferenceMbps) > 1e-9)
 return [
   {
     id: 'm2-registry',
     label: 'M2 baseline registry korunumu',
     passed: JSON.stringify(actualM2) === JSON.stringify(expectedM2),
     detail: `M2: ${actualM2.join(', ')}`,
   },
   {
     id: 'm3-registry',
     label: 'M3 scheduler kapsamı',
     passed: JSON.stringify(actualM3) === JSON.stringify(expectedM3),
     detail: `M3: ${actualM3.join(', ')}`,
   },
   {
     id: 'scenario-coverage',
     label: 'SC-1 ve SC-2 kapsamı',
     passed: scenarios.length === 2
       && scenarios[0].config.trafficClasses.length === 1
       && scenarios[1].config.trafficClasses.length >= 1,
     detail: `${scenarios.map((scenario) => scenario.label).join(' · ')}`,
   },
   {
     id: 'cell-coverage',
     label: 'Beş hücre konfigürasyonu',
     passed: new Set(rawRuns.map((run) => run.cell.id)).size === CELL_CONFIGS.length,
     detail: `${CELL_CONFIGS.length} hücre`,
   },
   {
     id: 'raw-run-count',
     label: 'Ham koşu sayısı',
     passed: rawRuns.length === expectedRawCount,
     detail: `${rawRuns.length}/${expectedRawCount}`,
   },
   {
     id: 'unique-run-keys',
     label: 'Yinelenmeyen koşul anahtarları',
     passed: uniqueRunKeys.size === rawRuns.length,
     detail: `${uniqueRunKeys.size}/${rawRuns.length} benzersiz koşu`,
   },
   {
     id: 'load-coverage',
     label: 'Normalize yük kapsamı',
     passed: completeLoadCoverage,
     detail: M3_LOAD_PROFILE_IDS.join(', '),
   },
   {
     id: 'common-realization',
     label: 'Ortak SINR ve trafik realizasyonu',
     passed: commonConditions,
     detail: `${conditionGroups.size} seed-hücre-senaryo grubu`,
   },
   {
     id: 'normalized-load-formula',
     label: 'Normalize yük formülü',
     passed: normalizedLoadFormula,
     detail: invalidNormalizedLoadRuns.length === 0
       ? 'normalizedOfferedLoad = offeredLoadMbps / capacityReferenceMbps; tolerans 1e-9'
       : `${invalidNormalizedLoadRuns.length} koşuda kapasite veya normalize yük formülü geçersiz`,
   },
   {
     id: 'summary-coverage',
     label: 'İstatistiksel özet kapsamı',
     passed: summaryRows.length === expectedSummaryCount
       && summaryRows.every((row) => row.metrics.cellThroughputMbps.sampleCount === seeds.length),
     detail: `${summaryRows.length}/${expectedSummaryCount} özet satırı`,
   },
   {
     id: 'paired-coverage',
     label: 'Eşleştirilmiş aday–baseline farkları',
     passed: pairwiseRows.length === expectedPairwiseCount
       && pairwiseRows.every((row) => row.metrics.cellThroughputMbps.sampleCount === seeds.length),
     detail: `${pairwiseRows.length}/${expectedPairwiseCount} fark satırı`,
   },
   {
     id: 'finite-statistics',
     label: 'Sonlu istatistikler',
     passed: finiteStatistics,
     detail: 'Ortalama, örnek standart sapması ve Student-t %95 GA',
   },
 ]
}
export function runM3ScientificExperiment(
 request: M3ExperimentRequest,
): M3ScientificExperimentResult {
 const limits = M3_CONFIG.scientificExperiment
 if (!Number.isInteger(request.seedCount)
   || request.seedCount < limits.minimumSeedCount
   || request.seedCount > limits.maximumSeedCount) {
   throw new Error(`M3 seed sayısı ${limits.minimumSeedCount}–${limits.maximumSeedCount} arasında olmalıdır.`)
 }
 const seedRole = request.seedRole ?? 'development'
 const roleSeeds = [...seedsForRole(seedRole)]
 const configuredSeeds = request.seeds ?? roleSeeds
 if (configuredSeeds.some((seed) => !roleSeeds.includes(seed))) {
   throw new Error(`M3 seed listesi seçilen ${seedRole} protokol listesiyle uyumlu değil.`)
 }
 if (request.seedCount > configuredSeeds.length) {
   throw new Error(`${seedRole} seed listesinde ${request.seedCount} koşu için yeterli seed yok.`)
 }
 const seeds = configuredSeeds.slice(0, request.seedCount)
 if (new Set(seeds).size !== seeds.length) throw new Error('M3 seed listesi yinelenen değer içeremez.')
 if (seeds.some((seed) => !Number.isSafeInteger(seed))) {
   throw new Error('M3 seed listesi güvenli tam sayı aralığını aşıyor.')
 }
 const scenarios = createM3ScenarioDefinitions(request.m2Config)
 const rawRuns: M3RawRun[] = []
 for (const scenarioDefinition of scenarios) {
   for (const cell of CELL_CONFIGS) {
     for (const seed of seeds) {
       const m0 = runM0(cell, { ...request.baseScenario, seed })
       const sinr = sinrFingerprint(m0)
       const capacityReferenceMbps = m0.sampledFullBandUpperBoundMbps
       for (const loadProfileId of M3_LOAD_PROFILE_IDS) {
       const resolvedLoad = resolveM2LoadProfile(
         loadProfileId,
         scenarioDefinition.kind,
         m0.ues.length,
         capacityReferenceMbps,
       )
       const conditionConfig: M2Config = {
         ...scenarioDefinition.config,
         trafficClasses: scenarioDefinition.config.trafficClasses.map((traffic) => ({
           ...traffic,
           arrivalRatePacketsPerSecond: traffic.arrivalRatePacketsPerSecond * resolvedLoad.arrivalRateMultiplier,
         })),
       }
       const schedulerResults = M3_SCHEDULERS.map((scheduler) =>
         runM2(cell, m0.ues, scheduler, conditionConfig, seed))
       const trafficFingerprints = schedulerResults.map(trafficFingerprint)
       if (new Set(trafficFingerprints).size !== 1) {
         throw new Error(`Scheduler’lar ortak trafiği kullanmıyor: ${scenarioDefinition.kind}/${cell.id}/${seed}`)
       }
       for (let index = 0; index < schedulerResults.length; index += 1) {
         const result = schedulerResults[index]
         rawRuns.push({
           scenarioKind: scenarioDefinition.kind,
           scenarioLabel: scenarioDefinition.label,
           loadProfileId,
           loadProfileLabel: resolvedLoad.profile.label,
           offeredLoadMbps: resolvedLoad.offeredLoadMbps,
           capacityReferenceMbps,
           normalizedOfferedLoad: resolvedLoad.normalizedOfferedLoad,
           cell,
           seed,
           scheduler: result.scheduler,
           schedulerLabel: result.schedulerLabel,
           effectiveTrafficSeed: result.effectiveTrafficSeed,
           sinrFingerprint: sinr,
           trafficFingerprint: trafficFingerprints[index],
           metrics: metricsFromResult(result),
           qosMetrics: qosMetricsFromResult(result),
         })
       }
       }
     }
   }
 }
 const summaryRows = buildSummaryRows(rawRuns)
 const pairwiseRows = buildPairwiseRows(rawRuns, seeds)
 const integrityChecks = buildIntegrityChecks(rawRuns, summaryRows, pairwiseRows, seeds, scenarios)
 return {
   schemaVersion: 2,
   generatedAt: new Date().toISOString(),
   request: {
     baseScenario: { ...request.baseScenario },
     m2Config: {
       ...request.m2Config,
       trafficClasses: request.m2Config.trafficClasses.map((item) => ({ ...item })),
     },
     seedCount: request.seedCount,
     seedRole,
     seeds: [...seeds],
   },
   seedRole,
   seedListFingerprint: seedListFingerprint(seeds),
   seeds,
   scenarioDefinitions: scenarios,
   rawRuns,
   summaryRows,
   pairwiseRows,
   integrityChecks,
   allIntegrityChecksPassed: integrityChecks.every((check) => check.passed),
 }
}
