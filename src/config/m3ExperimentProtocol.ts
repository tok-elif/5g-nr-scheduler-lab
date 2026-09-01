import protocolJson from '../../configs/M3_EXPERIMENT_PROTOCOL.json'
import schemaJson from '../../configs/M3_EXPERIMENT_PROTOCOL.schema.json'
export type ExperimentSeedRole = 'development' | 'evaluation'
export interface M3ExperimentProtocol {
 schemaVersion: 1
 protocolId: string
 seedProtocol: {
   developmentSeeds: number[]
   evaluationSeeds: number[]
 }
 scenarios: string[]
 loadFractions: number[]
 loadDefinition: 'offeredLoadMbps / capacityReferenceMbps'
 candidateSchedulers: string[]
 currentPrototypeSchedulers: string[]
 baselinePolicy: {
   qos: string[]
   throughput: string
   fairness: string[]
 }
 latencyPercentiles: {
   method: string
   minimumSampleCountForP99: number
 }
 nullPolicy: Record<string, null>
 confidenceInterval: {
   level: number
   method: string
 }
 practicalImportance: {
   provisionalProjectThresholds: boolean
   throughputNonInferiorityLossFractions: number[]
   defaultThroughputNonInferiorityLossFraction: number
   jainLossThresholds: number[]
   defaultJainLossThreshold: number
 }
 integrityPolicy: Record<string, 'fail'>
}
function assertUniqueSafeSeeds(values: unknown, label: string): asserts values is number[] {
 if (!Array.isArray(values) || values.length < 2) throw new Error(`${label} en az iki seed içermelidir.`)
 if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
   throw new Error(`${label} yalnız sıfır veya pozitif güvenli tam sayılar içermelidir.`)
 }
 if (new Set(values).size !== values.length) throw new Error(`${label} yinelenen seed içeremez.`)
}
export function validateM3ExperimentProtocol(value: unknown): M3ExperimentProtocol {
 if (!value || typeof value !== 'object') throw new Error('M3 deney protokolü nesne olmalıdır.')
 const protocol = value as Record<string, unknown>
 if (protocol.schemaVersion !== 1 || schemaJson.properties.schemaVersion.const !== 1) {
   throw new Error('M3 deney protokolü/schema sürümü desteklenmiyor.')
 }
 if (typeof protocol.protocolId !== 'string' || protocol.protocolId.length === 0) {
   throw new Error('M3 deney protokol kimliği gereklidir.')
 }
 if (protocol.loadDefinition !== 'offeredLoadMbps / capacityReferenceMbps') {
   throw new Error('Normalize yük offeredLoadMbps / capacityReferenceMbps olmalıdır.')
 }
 const seedProtocol = protocol.seedProtocol as Record<string, unknown> | undefined
 if (!seedProtocol) throw new Error('M3 seed protokolü gereklidir.')
 assertUniqueSafeSeeds(seedProtocol.developmentSeeds, 'Development seed listesi')
 assertUniqueSafeSeeds(seedProtocol.evaluationSeeds, 'Evaluation seed listesi')
 const evaluationSet = new Set(seedProtocol.evaluationSeeds)
 if (seedProtocol.developmentSeeds.some((seed) => evaluationSet.has(seed))) {
   throw new Error('Development ve evaluation seed listeleri kesişemez.')
 }
 const arrays = ['scenarios', 'loadFractions', 'candidateSchedulers', 'currentPrototypeSchedulers'] as const
 for (const key of arrays) {
   if (!Array.isArray(protocol[key]) || protocol[key].length === 0) {
     throw new Error(`M3 deney protokolünde ${key} boş olamaz.`)
   }
 }
 if ((protocol.loadFractions as unknown[]).some((value) => typeof value !== 'number' || value <= 0)) {
   throw new Error('M3 yük oranları pozitif sayılar olmalıdır.')
 }
 const latency = protocol.latencyPercentiles as Record<string, unknown> | undefined
 if (!latency
   || typeof latency.method !== 'string'
   || !Number.isSafeInteger(latency.minimumSampleCountForP99)
   || Number(latency.minimumSampleCountForP99) < 1) {
   throw new Error('M3 latency percentile protokolü geçersiz.')
 }
 return value as M3ExperimentProtocol
}
export const M3_EXPERIMENT_PROTOCOL = Object.freeze(validateM3ExperimentProtocol(protocolJson))
export function seedsForRole(role: ExperimentSeedRole): readonly number[] {
 return role === 'development'
   ? M3_EXPERIMENT_PROTOCOL.seedProtocol.developmentSeeds
   : M3_EXPERIMENT_PROTOCOL.seedProtocol.evaluationSeeds
}
export function seedListFingerprint(seeds: readonly number[]): string {
 let hash = 0x811c9dc5
 const text = seeds.join(',')
 for (let index = 0; index < text.length; index += 1) {
   hash ^= text.charCodeAt(index)
   hash = Math.imul(hash, 0x01000193)
 }
 return `SEEDS-${(hash >>> 0).toString(16).padStart(8, '0').toUpperCase()}`
}
