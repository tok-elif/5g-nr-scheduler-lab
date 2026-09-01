import type { CellConfig, ResourceAllocation, UeResult } from './types'
export type QosResourceType = 'GBR' | 'Non-GBR'
export type PercentileStatus = 'sufficient' | 'insufficient' | 'empty'
export interface PercentileEstimate {
 value: number | null
 sampleCount: number
 status: PercentileStatus
 method: string
 percentile: number
 minimumRequiredSampleCount: number
}
export interface QosProfile {
 fiveQi: number
 label: string
 resourceType: QosResourceType
 priorityLevel: number
 packetDelayBudgetMs: number
 packetErrorRate: number
 delayViolationProbability: number
}
export interface M2TrafficClassConfig {
 fiveQi: number
 arrivalRatePacketsPerSecond: number
 packetSizeBytes: number
 gbrMbps: number
}
export interface M2Config {
 slotCount: number
 pfWindowSlots: number
 traceSlotLimit?: number
 trafficSeedOffset: number
 trafficClasses: M2TrafficClassConfig[]
}
export interface M2RunOptions {
 readonly trafficClassByUeIndex?: readonly M2TrafficClassConfig[]
 readonly observationSink?: import('./m2Observation').M2ObservationSink
}
export interface M2QueueState {
 ueIndex: number
 ue: UeResult
 qos: QosProfile
 traffic: M2TrafficClassConfig
 queuedMbits: number
 headOfLineDelayMs: number
 averageThroughputMbps: number
}
export interface M2SchedulerSlotContext {
 slotIndex: number
 slotDurationSeconds: number
 resourceBlocks: number
 queues: readonly M2QueueState[]
}
export interface M2SchedulerSession {
 selectAllocations(context: M2SchedulerSlotContext): readonly ResourceAllocation[]
}
export interface M2Scheduler {
 readonly kind: string
 readonly label: string
 readonly shortLabel: string
 readonly color: string
 readonly order?: number
 createSession(): M2SchedulerSession
}
export interface M2SlotTrace {
 slotIndex: number
 allocations: ResourceAllocation[]
}
export interface M2UeResult {
 ueId: number
 fiveQi: number
 qosLabel: string
 resourceType: QosResourceType
 packetDelayBudgetMs: number
 priorityLevel?: number
 achievableRateMbps: number
 offeredLoadMbps: number
 gbrMbps: number
 gbrTargetMbps: number | null
 throughputMbps: number
 gbrSatisfied: boolean | null
 gbrFulfillmentRatio: number | null
 generatedPackets: number
 deliveredPackets: number
 queuedPackets: number
 queuedMbits: number
 queuedBytes: number
 undeliveredRatio: number
 latencySamplePackets: number
 pdbViolationPackets: number
 pdbViolationRatio: number
 overdueQueuedPackets: number
 oldestQueuedPacketAgeMs: number
 delayP50Ms: number | null
 delayP95Ms: number | null
 delayP99Ms: number | null
 delayP50Estimate: PercentileEstimate
 delayP95Estimate: PercentileEstimate
 delayP99Estimate: PercentileEstimate
}
export interface M2QosResult {
 fiveQi: number
 qosLabel: string
 resourceType: QosResourceType
 packetDelayBudgetMs: number
 ueCount: number
 gbrUeCount: number
 gbrUeMeetingRatio: number | null
 gbrMeanFulfillmentRatio: number | null
 aggregateGbrServiceRatio: number | null
 /** @deprecated Use gbrUeMeetingRatio. */
 gbrMeetingRatio: number | null
 generatedPackets: number
 deliveredPackets: number
 queuedPackets: number
 queuedBytes: number
 undeliveredRatio: number
 latencySamplePackets: number
 pdbViolationPackets: number
 pdbViolationRatio: number
 overdueQueuedPackets: number
 oldestQueuedPacketAgeMs: number
 delayP50Ms: number | null
 delayP95Ms: number | null
 delayP99Ms: number | null
 delayP50Estimate: PercentileEstimate
 delayP95Estimate: PercentileEstimate
 delayP99Estimate: PercentileEstimate
}
export interface M2Result {
 scheduler: string
 schedulerLabel: string
 cell: CellConfig
 config: M2Config
 baseSeed: number
 trafficSeedOffset: number
 effectiveTrafficSeed: number
 trafficFingerprint: string
 ueSinrFingerprint: string
 capacityReferenceMbps: number
 offeredLoadMbps: number
 normalizedOfferedLoad: number
 latencyScope: 'delivered-packets-arrival-to-completion'
 latencySamplePackets: number
 simulationDurationSeconds: number
 cellThroughputMbps: number
 jainFairness: number | null
 gbrUeMeetingRatio: number | null
 gbrMeanFulfillmentRatio: number | null
 aggregateGbrServiceRatio: number | null
 generatedPackets: number
 deliveredPackets: number
 queuedPackets: number
 queuedBytes: number
 undeliveredRatio: number
 pdbViolationPackets: number
 pdbViolationRatio: number
 overdueQueuedPackets: number
 oldestQueuedPacketAgeMs: number
 slotTrace: M2SlotTrace[]
 ueResults: M2UeResult[]
 qosResults: M2QosResult[]
}
