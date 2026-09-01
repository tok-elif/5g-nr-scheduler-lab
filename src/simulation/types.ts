export interface CellConfig {
 id: string
 bandMHz: number
 bandwidthMHz: number
 resourceBlocks: number
 scsKHz: number
 slotDurationMs: number
}
export interface ScenarioConfig {
 ueCount: number
 seed: number
 meanSinrDb: number
 stdDevSinrDb: number
 minSinrDb: number
 maxSinrDb: number
 layers: number
 overheadFraction: number
}
export interface LinkAdaptationResult {
 cqi: number
 cqiSpectralEfficiency: number
 mcsIndex: number
 mcs: string
 mcsTable: 'PDSCH Table 1' | 'PDSCH Table 3' | '—'
 modulation: string
 targetCodeRateX1024: number
 mcsSpectralEfficiency: number
 spectralEfficiency: number
}
export interface UeResult extends LinkAdaptationResult {
 id: number
 sinrDb: number
 achievableRateMbps: number
}
export interface M0Result {
 cell: CellConfig
 scenario: ScenarioConfig
 ues: UeResult[]
 /** Geriye dönük uyumluluk için korunan eski alan. */
 theoreticalCellCapacityMbps: number
 sampledFullBandUpperBoundMbps: number
 capacityDefinition: 'sampled-best-ue-full-band-rate'
 averageUeRateMbps: number
 averageSinrDb: number
}
export type SchedulerKind = string
export interface ResourceAllocation {
 ueIndex: number
 resourceBlocks: number
 /**
  * Tahsis edilen RB indeksleri. Yalnız frekans seçici (RB başına) scheduling
  * açıkken doldurulur; wideband modda RB'ler ayırt edilemez olduğu için
  * indeks bilgisi üretilmez ve bu alan tanımsız kalır.
  */
 resourceBlockIndices?: readonly number[]
}
export interface SchedulerRunContext {
 ues: readonly UeResult[]
 resourceBlocks: number
}
export interface SchedulerSlotContext {
 slotIndex: number
 averageThroughputMbps: readonly number[]
}
export interface SchedulerSession {
 selectAllocations(context: SchedulerSlotContext): readonly ResourceAllocation[]
}
export interface Scheduler {
 readonly kind: SchedulerKind
 readonly label: string
 readonly shortLabel: string
 readonly color: string
 readonly order?: number
 readonly tracksAverageThroughput?: boolean
 createSession(context: SchedulerRunContext): SchedulerSession
}
export interface M1Config {
 slotCount: number
 pfWindowSlots: number
 traceSlotLimit?: number
}
export interface M1UeResult {
 ueId: number
 sinrDb: number
 achievableRateMbps: number
 throughputMbps: number
 selectedSlots: number
 airtimePercent: number
}
export interface M1Result {
 scheduler: SchedulerKind
 schedulerLabel: string
 cellThroughputMbps: number
 jainFairness: number | null
 totalDeliveredMbits: number
 simulationDurationSeconds: number
 slotTrace: number[]
 ueResults: M1UeResult[]
}
export interface MetricStatistics {
 mean: number
 standardDeviation: number
 confidence95HalfWidth: number
 minimum: number
 maximum: number
}
export interface M1BatchSchedulerResult {
 scheduler: SchedulerKind
 schedulerLabel: string
 runCount: number
 throughputMbps: MetricStatistics
 jainFairness: MetricStatistics
}
export interface M1PairwiseComparison {
 baselineScheduler: SchedulerKind
 baselineSchedulerLabel: string
 comparatorScheduler: SchedulerKind
 comparatorSchedulerLabel: string
 runCount: number
 throughputDifferenceMbps: MetricStatistics
 jainFairnessDifference: MetricStatistics
}
export interface M1BatchResult {
 seeds: number[]
 schedulerResults: M1BatchSchedulerResult[]
 pairwiseComparisons: M1PairwiseComparison[]
}
export interface M1CellMatrixRow extends M1BatchSchedulerResult {
 cell: CellConfig
}
export interface M1CellPairwiseRow extends M1PairwiseComparison {
 cell: CellConfig
}
export interface M1CellMatrixResult {
 seeds: number[]
 rows: M1CellMatrixRow[]
 pairwiseRows: M1CellPairwiseRow[]
}
