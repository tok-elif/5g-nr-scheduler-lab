import { CELL_CONFIGS } from '../config/cells'
import {
 DEFAULT_M2_EXPERIMENT_SCENARIO_ID,
 DEFAULT_M2_LOAD_PROFILE_ID,
 DEFAULT_M2_MATRIX_SETTINGS,
 createM2ScenarioConfig,
 getM2ExperimentScenario,
 getM2LoadProfile,
 resolveM2LoadProfile,
 type M2LoadProfileMode,
} from '../config/m2Scenarios'
import { M2_SCHEDULERS } from '../m2Schedulers'
import { DEFAULT_SCENARIO, runM0 } from './m0'
import { runM2 } from './m2'
import { maximumFinite } from '../metrics/percentiles'
import type { PercentileStatus } from './m2Types'
import type { CellConfig } from './types'
export interface M2MatrixRequest {
 scenarioId: string
 loadProfileId?: string
 durationMs: number
 ueCount: number
 baseSeed: number
}
export interface M2MatrixProgress {
 completedRuns: number
 totalRuns: number
 cellLabel: string
 schedulerLabel: string
}
export interface M2MatrixRow {
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
 slotCount: number
 scheduler: string
 schedulerLabel: string
 baseSeed: number
 effectiveTrafficSeed: number
 sinrPopulationFingerprint: string
 simulationDurationSeconds: number
 totalThroughputMbps: number
 jainFairness: number
 deliveryRatio: number
 undeliveredRatio: number
 gbrUeMeetingRatio: number | null
 gbrMeanFulfillmentRatio: number | null
 aggregateGbrServiceRatio: number | null
 /** @deprecated Use gbrUeMeetingRatio. */
 gbrSatisfactionRatio: number | null
 worstQosP99Ms: number | null
 worstQosP99Status: PercentileStatus
 latencySamplePackets: number
 pdbViolationRatio: number
 generatedPackets: number
 deliveredPackets: number
 queuedPackets: number
 queuedBytes: number
 overdueQueuedPackets: number
 oldestQueuedPacketAgeMs: number
}
export interface M2MatrixResult {
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
 cellCount: number
 schedulerCount: number
 totalRuns: number
 rows: M2MatrixRow[]
}
type CellMetadata = CellConfig & {
 id?: unknown
 label?: unknown
 bandwidthMhz?: unknown
 bandMhz?: unknown
}
function validateRequest(request: M2MatrixRequest): void {
 getM2ExperimentScenario(request.scenarioId)
 getM2LoadProfile(request.loadProfileId ?? DEFAULT_M2_LOAD_PROFILE_ID)
 if (!Number.isFinite(request.durationMs) || request.durationMs <= 0 || request.durationMs > 60_000) {
   throw new Error('M2 matris süresi 0 ile 60000 ms arasında olmalıdır.')
 }
 if (!Number.isSafeInteger(request.ueCount) || request.ueCount < 1 || request.ueCount > 500) {
   throw new Error('M2 matris UE sayısı 1 ile 500 arasında güvenli bir tam sayı olmalıdır.')
 }
 if (!Number.isSafeInteger(request.baseSeed) || request.baseSeed < 0 || request.baseSeed > 2_147_483_647) {
   throw new Error('M2 matris temel seed değeri 0 ile 2147483647 arasında olmalıdır.')
 }
}
function cellId(cell: CellConfig, index: number): string {
 const value = (cell as CellMetadata).id
 return typeof value === 'string' && value.trim() ? value : `cell-${index + 1}`
}
function cellLabel(cell: CellConfig, index: number): string {
 const metadata = cell as CellMetadata
 if (typeof metadata.label === 'string' && metadata.label.trim()) return metadata.label
 const bandwidth = typeof metadata.bandwidthMhz === 'number'
   ? `${metadata.bandwidthMhz} MHz`
   : typeof metadata.bandMhz === 'number'
     ? `${metadata.bandMhz} MHz`
     : `${cell.resourceBlocks} RB`
 return `Hücre ${index + 1} · ${bandwidth}`
}
function fnv1a(value: string): string {
 let hash = 0x811c9dc5
 for (let index = 0; index < value.length; index += 1) {
   hash ^= value.charCodeAt(index)
   hash = Math.imul(hash, 0x01000193)
 }
 return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0')
}
function sinrFingerprint(sinrValues: number[]): string {
 return `SINR-${fnv1a(sinrValues.map((value) => value.toFixed(9)).join('|'))}`
}
function boundedRatio(value: number): number {
 if (!Number.isFinite(value)) return 0
 return Math.min(1, Math.max(0, value))
}
function jainFairness(values: number[]): number {
 if (values.length === 0) return 1
 const sum = values.reduce((total, value) => total + value, 0)
 const squareSum = values.reduce((total, value) => total + value * value, 0)
 if (squareSum === 0) return 1
 return boundedRatio((sum * sum) / (values.length * squareSum))
}
function safeRatio(numerator: number, denominator: number, emptyValue = 1): number {
 return denominator > 0 ? boundedRatio(numerator / denominator) : emptyValue
}
export function createDefaultM2MatrixRequest(): M2MatrixRequest {
 return {
   scenarioId: DEFAULT_M2_EXPERIMENT_SCENARIO_ID,
   loadProfileId: DEFAULT_M2_LOAD_PROFILE_ID,
   durationMs: DEFAULT_M2_MATRIX_SETTINGS.durationMs,
   ueCount: DEFAULT_M2_MATRIX_SETTINGS.ueCount,
   baseSeed: DEFAULT_M2_MATRIX_SETTINGS.baseSeed,
 }
}
export function runM2Matrix(
 request: M2MatrixRequest,
 onProgress?: (progress: M2MatrixProgress) => void,
): M2MatrixResult {
 validateRequest(request)
 const scenario = getM2ExperimentScenario(request.scenarioId)
 const loadProfile = getM2LoadProfile(request.loadProfileId ?? DEFAULT_M2_LOAD_PROFILE_ID)
 const rows: M2MatrixRow[] = []
 const totalRuns = CELL_CONFIGS.length * M2_SCHEDULERS.length
 let completedRuns = 0
 let commonSinrFingerprint: string | undefined
 CELL_CONFIGS.forEach((cell, cellIndex) => {
   const m0Result = runM0(cell, {
     ...DEFAULT_SCENARIO,
     ueCount: request.ueCount,
     seed: request.baseSeed,
   })
   const fingerprint = sinrFingerprint(m0Result.ues.map((ue) => ue.sinrDb))
   if (commonSinrFingerprint === undefined) commonSinrFingerprint = fingerprint
   if (fingerprint !== commonSinrFingerprint) {
     throw new Error('Hücreler arasında ortak SINR popülasyonu korunamadı.')
   }
   const capacityReferenceMbps = m0Result.sampledFullBandUpperBoundMbps
   const resolvedLoad = resolveM2LoadProfile(
     loadProfile.id,
     scenario.id,
     request.ueCount,
     capacityReferenceMbps,
   )
   const m2Config = createM2ScenarioConfig(
     request.scenarioId,
     cell,
     request.durationMs,
     loadProfile.id,
     { ueCount: request.ueCount, capacityReferenceMbps },
   )
   for (const scheduler of M2_SCHEDULERS) {
     const result = runM2(cell, m0Result.ues, scheduler.kind, m2Config, request.baseSeed)
     const throughputs = result.ueResults.map((ue) => ue.throughputMbps)
     const generatedPackets = result.ueResults.reduce((sum, ue) => sum + ue.generatedPackets, 0)
     const deliveredPackets = result.ueResults.reduce((sum, ue) => sum + ue.deliveredPackets, 0)
     const queuedPackets = result.ueResults.reduce((sum, ue) => sum + ue.queuedPackets, 0)
     const p99Values = result.qosResults.flatMap((qos) =>
       qos.delayP99Ms === null ? [] : [qos.delayP99Ms])
     const worstQosP99Ms = p99Values.length > 0 ? maximumFinite(p99Values) : null
     const latencySamplePackets = result.qosResults.reduce(
       (sum, qos) => sum + qos.delayP99Estimate.sampleCount,
       0,
     )
     const worstQosP99Status: PercentileStatus = latencySamplePackets === 0
       ? 'empty'
       : result.qosResults.every((qos) => qos.delayP99Estimate.status === 'sufficient')
         ? 'sufficient'
         : 'insufficient'
     rows.push({
       scenarioId: scenario.id,
       scenarioLabel: scenario.label,
       loadProfileId: loadProfile.id,
       loadProfileLabel: loadProfile.label,
       loadMode: loadProfile.mode,
       targetLoadFraction: resolvedLoad.targetLoadFraction,
       arrivalRateMultiplier: resolvedLoad.arrivalRateMultiplier,
       baselineOfferedLoadMbps: resolvedLoad.baselineOfferedLoadMbps,
       offeredLoadMbps: resolvedLoad.offeredLoadMbps,
       capacityReferenceMbps: resolvedLoad.capacityReferenceMbps,
       normalizedOfferedLoad: resolvedLoad.normalizedOfferedLoad,
       cellIndex,
       cellId: cellId(cell, cellIndex),
       cellLabel: cellLabel(cell, cellIndex),
       resourceBlocks: cell.resourceBlocks,
       slotDurationMs: cell.slotDurationMs,
       slotCount: m2Config.slotCount,
       scheduler: result.scheduler,
       schedulerLabel: result.schedulerLabel,
       baseSeed: result.baseSeed,
       effectiveTrafficSeed: result.effectiveTrafficSeed,
       sinrPopulationFingerprint: fingerprint,
       simulationDurationSeconds: result.simulationDurationSeconds,
       totalThroughputMbps: throughputs.reduce((sum, throughput) => sum + throughput, 0),
       jainFairness: jainFairness(throughputs),
       deliveryRatio: safeRatio(deliveredPackets, generatedPackets),
       undeliveredRatio: safeRatio(queuedPackets, generatedPackets, 0),
       gbrUeMeetingRatio: result.gbrUeMeetingRatio,
       gbrMeanFulfillmentRatio: result.gbrMeanFulfillmentRatio,
       aggregateGbrServiceRatio: result.aggregateGbrServiceRatio,
       gbrSatisfactionRatio: result.gbrUeMeetingRatio,
       worstQosP99Ms,
       worstQosP99Status,
       latencySamplePackets,
       pdbViolationRatio: boundedRatio(result.pdbViolationRatio),
       generatedPackets,
       deliveredPackets,
       queuedPackets,
       queuedBytes: Math.max(0, result.queuedBytes),
       overdueQueuedPackets: Math.max(0, result.overdueQueuedPackets),
       oldestQueuedPacketAgeMs: Math.max(0, result.oldestQueuedPacketAgeMs),
     })
     completedRuns += 1
     onProgress?.({
       completedRuns,
       totalRuns,
       cellLabel: cellLabel(cell, cellIndex),
       schedulerLabel: result.schedulerLabel,
     })
   }
 })
 return {
   scenarioId: scenario.id,
   scenarioLabel: scenario.label,
   scenarioDescription: scenario.description,
   loadProfileId: loadProfile.id,
   loadProfileLabel: loadProfile.label,
   loadProfileDescription: loadProfile.description,
   loadMode: loadProfile.mode,
   targetLoadFraction: loadProfile.targetLoadFraction ?? null,
   durationMs: request.durationMs,
   ueCount: request.ueCount,
   baseSeed: request.baseSeed,
   cellCount: CELL_CONFIGS.length,
   schedulerCount: M2_SCHEDULERS.length,
   totalRuns,
   rows,
 }
}
