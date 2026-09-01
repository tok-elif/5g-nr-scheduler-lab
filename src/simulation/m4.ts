import { validateM4RuntimeConfig } from '../config/m4Config'
import { runM2, validateM2Config, validateM2TrafficClass } from './m2'
import { createM4SchedulerOrchestrator } from './m4SchedulerOrchestrator'
import { createM4MetricsAccumulator } from './m4Metrics'
import {
 M4_SLICE_IDS,
 type M4Result,
 type M4RunInput,
 type M4RuntimeConfig,
 type M4UeTrafficAssignment,
 type SliceId,
 type UeSliceMapping,
} from './m4Types'
import { createUeSliceMapping } from './sliceMapping'
import { validateCellConfig, validateUes } from './validation'
function deepFreeze<T>(value: T): T {
 if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value
 Object.freeze(value)
 for (const nested of Object.values(value)) deepFreeze(nested)
 return value
}
function clone<T>(value: T): T {
 return structuredClone(value)
}
export function createM4TrafficAssignment(
 mapping: UeSliceMapping,
 config: M4RuntimeConfig,
 trafficClasses: readonly import('./m2Types').M2TrafficClassConfig[],
): readonly M4UeTrafficAssignment[] {
 const trafficByFiveQi = new Map(trafficClasses.map((traffic) => [traffic.fiveQi, traffic]))
 const assignments: M4UeTrafficAssignment[] = []
 for (const slice of config.slices) {
   const indices = mapping.ueIndicesBySlice[slice.id]
   indices.forEach((ueIndex, localIndex) => {
     const fiveQi = slice.allowedFiveQis[localIndex % slice.allowedFiveQis.length]
     const traffic = trafficByFiveQi.get(fiveQi)
     if (!traffic) throw new Error(`${slice.id} için gerekli 5QI ${fiveQi} M2 config içinde bulunamadı.`)
     validateM2TrafficClass(traffic)
     assignments.push(Object.freeze({
       ueIndex,
       sliceId: slice.id,
       fiveQi,
       trafficClass: Object.freeze({ ...traffic }),
     }))
   })
 }
 if (assignments.length !== mapping.entries.length
   || assignments.some((assignment, index) => assignment.ueIndex !== index)) {
   throw new Error('M4 trafik ataması mapping ile eşleşmiyor.')
 }
 return Object.freeze(assignments)
}
function canonicalFingerprintPayload(input: {
 readonly baseSeed: number
 readonly cell: M4RunInput['cell']
 readonly m2Config: M4RunInput['m2Config']
 readonly config: M4RuntimeConfig
 readonly mapping: UeSliceMapping
 readonly assignments: readonly M4UeTrafficAssignment[]
 readonly trafficFingerprint: string
 readonly ueSinrFingerprint: string
}): string {
 return JSON.stringify({
   baseSeed: input.baseSeed,
   cell: input.cell,
   m2: {
     slotCount: input.m2Config.slotCount,
     pfWindowSlots: input.m2Config.pfWindowSlots,
     trafficSeedOffset: input.m2Config.trafficSeedOffset,
     trafficFingerprint: input.trafficFingerprint,
     ueSinrFingerprint: input.ueSinrFingerprint,
   },
   mapping: input.mapping.entries,
   assignments: input.assignments.map((assignment) => ({
     ueIndex: assignment.ueIndex,
     sliceId: assignment.sliceId,
     fiveQi: assignment.fiveQi,
     arrivalRatePacketsPerSecond: assignment.trafficClass.arrivalRatePacketsPerSecond,
     packetSizeBytes: assignment.trafficClass.packetSizeBytes,
     gbrMbps: assignment.trafficClass.gbrMbps,
   })),
   slicing: {
     policy: input.config.interSlicePolicy,
     redistributionEnabled: input.config.redistributionEnabled,
     slices: input.config.slices.map((slice) => ({
       id: slice.id,
       enabled: slice.enabled,
       ueCount: slice.ueCount,
       weight: slice.weight,
       minimumShare: slice.minimumShare,
       scheduler: slice.scheduler,
     })),
   },
 })
}
export function createM4ReproducibilityFingerprint(input: Parameters<typeof canonicalFingerprintPayload>[0]): string {
 const text = canonicalFingerprintPayload(input)
 let hash = 0x811c9dc5
 for (let index = 0; index < text.length; index += 1) {
   hash ^= text.charCodeAt(index)
   hash = Math.imul(hash, 0x01000193)
 }
 return `M4-${(hash >>> 0).toString(16).padStart(8, '0').toUpperCase()}`
}
export function runM4(input: M4RunInput): M4Result {
 validateCellConfig(input.cell)
 validateUes(input.ues)
 validateM2Config(input.m2Config)
 if (!Number.isSafeInteger(input.baseSeed)) throw new Error('M4 base seed güvenli tam sayı olmalıdır.')
 if (!Number.isSafeInteger(input.resourceTraceSlotLimit) || input.resourceTraceSlotLimit < 0) {
   throw new Error('M4 resource trace limiti negatif olmayan güvenli tam sayı olmalıdır.')
 }
 const config = validateM4RuntimeConfig(clone(input.m4Config))
 if (input.ues.length !== config.totalUeCount) {
   throw new Error('M4 UE listesi uzunluğu runtime config totalUeCount ile eşleşmelidir.')
 }
 const counts = Object.fromEntries(
   config.slices.map((slice) => [slice.id, slice.ueCount]),
 ) as Record<SliceId, number>
 const mapping = createUeSliceMapping(config.totalUeCount, counts)
 const trafficAssignment = createM4TrafficAssignment(mapping, config, input.m2Config.trafficClasses)
 const metricsAccumulator = createM4MetricsAccumulator({
   mapping,
   trafficAssignment,
   slotDurationSeconds: input.cell.slotDurationMs / 1_000,
   slotCount: input.m2Config.slotCount,
 })
 const orchestrator = createM4SchedulerOrchestrator({
   config,
   mapping,
   cellTotalResourceBlocks: input.cell.resourceBlocks,
   resourceTraceSlotLimit: input.resourceTraceSlotLimit,
 })
 const orchestratorSession = orchestrator.createSession()
 const sessionBackedScheduler = Object.freeze({
   kind: 'm4-composite',
   label: 'M4 Composite Slice Scheduler',
   shortLabel: 'M4',
   color: '#1d4ed8',
   createSession: () => orchestratorSession.schedulerSession,
 })
 const m2Result = runM2(
   clone(input.cell),
   clone(input.ues),
   sessionBackedScheduler,
   clone(input.m2Config),
   input.baseSeed,
   {
     trafficClassByUeIndex: trafficAssignment.map((assignment) => assignment.trafficClass),
     observationSink: metricsAccumulator.observationSink,
   },
 )
 const totals = orchestratorSession.getResourceTotals()
 const metrics = metricsAccumulator.finalize({
   m2Result,
   sliceResourceTotals: totals.slices,
   cellResourceTotals: totals.cell,
 })
 if (totals.cell.processedSlotCount !== input.m2Config.slotCount) {
   throw new Error('M4 resource accumulator slot sayısı M2 slot sayısıyla eşleşmiyor.')
 }
 const reproducibilityFingerprint = createM4ReproducibilityFingerprint({
   baseSeed: input.baseSeed,
   cell: input.cell,
   m2Config: input.m2Config,
   config,
   mapping,
   assignments: trafficAssignment,
   trafficFingerprint: m2Result.trafficFingerprint,
   ueSinrFingerprint: m2Result.ueSinrFingerprint,
 })
 const schedulerKindBySlice = Object.freeze(Object.fromEntries(
   config.slices.map((slice) => [slice.id, slice.scheduler]),
 )) as Readonly<Record<SliceId, M4RuntimeConfig['slices'][number]['scheduler']>>
 return deepFreeze({
   schemaVersion: 1,
   config: clone(config),
   mapping: clone(mapping),
   trafficAssignment: clone(trafficAssignment),
   m2Result: clone(m2Result),
   resourceTrace: clone(orchestratorSession.getResourceTrace()),
   sliceResourceTotals: clone(totals.slices),
   cellResourceTotals: clone(totals.cell),
   schedulerKindBySlice,
   reproducibilityFingerprint,
   metrics: clone(metrics),
 })
}
export { M4_SLICE_IDS }
