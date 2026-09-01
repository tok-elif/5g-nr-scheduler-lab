export const M4_SLICE_IDS = ['embb', 'urllc', 'mmtc'] as const
export const M4_SCHEDULER_KINDS = [
 'round-robin',
 'max-ci',
 'proportional-fair',
 'm-lwdf',
 'exp-pf',
 'qdf-pf',
] as const
export type SliceId = typeof M4_SLICE_IDS[number]
export type M4SchedulerKind = typeof M4_SCHEDULER_KINDS[number]
export type InterSlicePolicyKind = 'static-weighted'
export interface M4SliceMetadata {
 readonly id: SliceId
 readonly label: string
 readonly description: string
 readonly color: string
 readonly defaultWeight: number
 readonly defaultMinimumShare: number
 readonly defaultScheduler: M4SchedulerKind
 readonly allowedFiveQis: readonly number[]
}
export interface M4Config {
 readonly schemaVersion: 1
 readonly interSlicePolicy: InterSlicePolicyKind
 readonly redistributionEnabled: boolean
 readonly slices: readonly M4SliceMetadata[]
}
export interface M4RuntimeSliceConfig extends M4SliceMetadata {
 readonly enabled: boolean
 readonly ueCount: number
 readonly weight: number
 readonly minimumShare: number
 readonly scheduler: M4SchedulerKind
}
export interface M4RuntimeConfig {
 readonly schemaVersion: 1
 readonly totalUeCount: number
 readonly interSlicePolicy: InterSlicePolicyKind
 readonly redistributionEnabled: boolean
 readonly slices: readonly M4RuntimeSliceConfig[]
}
export interface UeSliceMappingEntry {
 readonly ueIndex: number
 readonly sliceId: SliceId
}
export interface UeSliceMapping {
 readonly entries: readonly UeSliceMappingEntry[]
 readonly sliceByUeIndex: readonly SliceId[]
 readonly ueIndicesBySlice: Readonly<Record<SliceId, readonly number[]>>
}
export interface InterSliceSliceDemand {
 readonly sliceId: SliceId
 readonly enabled: boolean
 readonly weight: number
 readonly minimumShare: number
 readonly demandResourceBlocks: number
}
export interface InterSliceAllocatorInput {
 readonly totalResourceBlocks: number
 readonly slotIndex: number
 readonly policy: InterSlicePolicyKind
 readonly redistributionEnabled: boolean
 readonly slices: readonly InterSliceSliceDemand[]
}
export interface IntegerGuaranteeDecision {
 readonly sliceId: SliceId
 readonly exactQuotaResourceBlocks: number
 readonly floorQuotaResourceBlocks: number
 readonly remainder: number
 readonly roundedQuotaResourceBlocks: number
}
export interface InterSliceTransfer {
 readonly fromSliceId: SliceId
 readonly toSliceId: SliceId
 readonly resourceBlocks: number
}
export interface InterSliceSliceAllocation {
 readonly sliceId: SliceId
 readonly requestedResourceBlocks: number
 readonly roundedGuaranteeQuotaResourceBlocks: number
 readonly guaranteedResourceBlocks: number
 readonly ordinarySharedResourceBlocks: number
 readonly redistributedResourceBlocks: number
 readonly allocatedResourceBlocks: number
 readonly unmetDemandResourceBlocks: number
 readonly borrowedResourceBlocks: number
 readonly lentResourceBlocks: number
}
export interface InterSliceAllocationResult {
 readonly totalResourceBlocks: number
 readonly totalRequestedResourceBlocks: number
 readonly totalAllocatedResourceBlocks: number
 readonly totalUnallocatedResourceBlocks: number
 readonly ordinarySharedPoolResourceBlocks: number
 readonly ordinarySharedAllocatedResourceBlocks: number
 readonly ordinarySharedUnallocatedResourceBlocks: number
 readonly unusedGuaranteePoolResourceBlocks: number
 readonly redistributedGuaranteeResourceBlocks: number
 readonly unusedRedistributionRemainderResourceBlocks: number
 readonly insufficientResources: boolean
 readonly conservationSatisfied: boolean
 readonly guaranteeDecisions: readonly IntegerGuaranteeDecision[]
 readonly transfers: readonly InterSliceTransfer[]
 readonly slices: readonly InterSliceSliceAllocation[]
}
export interface M4UeDemand {
 readonly ueIndex: number
 readonly sliceId: SliceId
 readonly demandResourceBlocks: number
 readonly queuedMbits: number
}
export interface M4SliceDemand {
 readonly sliceId: SliceId
 readonly demandResourceBlocks: number
 readonly queuedMbits: number
 readonly activeUeCount: number
}
export interface M4DemandResult {
 readonly ueDemands: readonly M4UeDemand[]
 readonly sliceDemands: readonly M4SliceDemand[]
}
export interface M4UeTrafficAssignment {
 readonly ueIndex: number
 readonly sliceId: SliceId
 readonly fiveQi: number
 readonly trafficClass: Readonly<import('./m2Types').M2TrafficClassConfig>
}
export interface M4SliceSlotTelemetry {
 readonly sliceId: SliceId
 readonly schedulerKind: M4SchedulerKind
 readonly demandResourceBlocks: number
 readonly queuedMbits: number
 readonly activeUeCount: number
 readonly roundedGuaranteeQuotaResourceBlocks: number
 readonly guaranteedResourceBlocks: number
 readonly ordinarySharedResourceBlocks: number
 readonly redistributedResourceBlocks: number
 readonly allocatedResourceBlocks: number
 readonly schedulerUsedResourceBlocks: number
 readonly schedulerUnusedResourceBlocks: number
 readonly borrowedResourceBlocks: number
 readonly lentResourceBlocks: number
}
export interface M4SlotResourceTelemetry {
 readonly slotIndex: number
 readonly totalResourceBlocks: number
 readonly totalRequestedResourceBlocks: number
 readonly totalAllocatedResourceBlocks: number
 readonly totalUnallocatedResourceBlocks: number
 readonly totalSchedulerUsedResourceBlocks: number
 readonly totalSchedulerUnusedResourceBlocks: number
 readonly slices: readonly M4SliceSlotTelemetry[]
 readonly conservationSatisfied: boolean
}
export interface M4SliceResourceTotals {
 readonly sliceId: SliceId
 readonly requestedResourceBlocks: number
 readonly roundedGuaranteeQuotaResourceBlocks: number
 readonly guaranteedResourceBlocks: number
 readonly ordinarySharedResourceBlocks: number
 readonly redistributedResourceBlocks: number
 readonly allocatedResourceBlocks: number
 readonly schedulerUsedResourceBlocks: number
 readonly schedulerUnusedResourceBlocks: number
 readonly borrowedResourceBlocks: number
 readonly lentResourceBlocks: number
}
export interface M4CellResourceTotals {
 readonly processedSlotCount: number
 readonly totalAvailableResourceBlocks: number
 readonly totalRequestedResourceBlocks: number
 readonly totalAllocatedResourceBlocks: number
 readonly totalSchedulerUsedResourceBlocks: number
 readonly totalSchedulerUnusedResourceBlocks: number
 readonly totalUnallocatedResourceBlocks: number
 readonly conservationSatisfied: boolean
}
export interface M4ResourceAccumulatorSnapshot {
 readonly slices: readonly M4SliceResourceTotals[]
 readonly cell: M4CellResourceTotals
}
export interface M4RunInput {
 readonly cell: import('./types').CellConfig
 readonly ues: readonly import('./types').UeResult[]
 readonly m2Config: import('./m2Types').M2Config
 readonly m4Config: M4RuntimeConfig
 readonly baseSeed: number
 readonly resourceTraceSlotLimit: number
}
export interface M4Result {
 readonly schemaVersion: 1
 readonly config: M4RuntimeConfig
 readonly mapping: UeSliceMapping
 readonly trafficAssignment: readonly M4UeTrafficAssignment[]
 readonly m2Result: import('./m2Types').M2Result
 readonly resourceTrace: readonly M4SlotResourceTelemetry[]
 readonly sliceResourceTotals: readonly M4SliceResourceTotals[]
 readonly cellResourceTotals: M4CellResourceTotals
 readonly schedulerKindBySlice: Readonly<Record<SliceId, M4SchedulerKind>>
 readonly reproducibilityFingerprint: string
 readonly metrics: M4MetricsResult
}
export interface M4SlicePerformanceMetrics {
 readonly sliceId: SliceId
 readonly ueCount: number
 readonly configuredOfferedLoadMbps: number
 readonly realizedOfferedMbits: number
 readonly deliveredMbits: number
 readonly aggregateThroughputMbps: number
 readonly finalQueuedMbits: number
 readonly arrivedPacketCount: number
 readonly deliveredPacketCount: number
 readonly packetDeliveryRatio: number | null
 readonly meanPacketDelayMs: number | null
 readonly p50PacketDelayMs: number | null
 readonly p95PacketDelayMs: number | null
 readonly p99PacketDelayMs: number | null
 readonly delayViolationPacketCount: number
 readonly delayViolationRatio: number | null
 readonly gbrUeCount: number
 readonly gbrMetUeCount: number
 readonly gbrMeetingRatio: number | null
 readonly jainFairness: number | null
 readonly allocatedResourceBlocks: number
 readonly schedulerUsedResourceBlocks: number
 readonly schedulerUnusedResourceBlocks: number
 readonly resourceAllocationShare: number | null
 readonly schedulerUtilizationRatio: number | null
}
export interface M4CellPerformanceMetrics {
 readonly ueCount: number
 readonly configuredOfferedLoadMbps: number
 readonly realizedOfferedMbits: number
 readonly deliveredMbits: number
 readonly aggregateThroughputMbps: number
 readonly finalQueuedMbits: number
 readonly arrivedPacketCount: number
 readonly deliveredPacketCount: number
 readonly packetDeliveryRatio: number | null
 readonly meanPacketDelayMs: number | null
 readonly p50PacketDelayMs: number | null
 readonly p95PacketDelayMs: number | null
 readonly p99PacketDelayMs: number | null
 readonly delayViolationPacketCount: number
 readonly delayViolationRatio: number | null
 readonly gbrUeCount: number
 readonly gbrMetUeCount: number
 readonly gbrMeetingRatio: number | null
 readonly jainFairness: number | null
 readonly allocatedResourceBlocks: number
 readonly schedulerUsedResourceBlocks: number
 readonly schedulerUnusedResourceBlocks: number
 readonly schedulerUtilizationRatio: number | null
}
export interface M4MetricsResult {
 readonly slices: readonly M4SlicePerformanceMetrics[]
 readonly cell: M4CellPerformanceMetrics
}
