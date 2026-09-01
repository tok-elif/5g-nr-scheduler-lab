import { validateM4RuntimeConfig } from '../config/m4Config'
import { M4_SLICE_IDS, type M4Result } from '../simulation/m4Types'
function isRecord(value: unknown): value is Record<string, unknown> {
 return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function validateJsonValue(value: unknown, path = 'result'): void {
 if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`${path} non-finite sayı içeriyor.`)
 if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
   throw new Error(`${path} JSON ile serileştirilemeyen değer içeriyor.`)
 }
 if (Array.isArray(value)) value.forEach((item, index) => validateJsonValue(item, `${path}[${index}]`))
 else if (isRecord(value)) Object.entries(value).forEach(([key, item]) => validateJsonValue(item, `${path}.${key}`)) }
function deepFreeze<T>(value: T): T {
 if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value
 Object.freeze(value)
 Object.values(value).forEach(deepFreeze)
 return value
}
function assertRatio(value: unknown, label: string): void {
 if (value !== null && (typeof value !== 'number' || value < 0 || value > 1)) throw new Error(`${label} ratio geçersiz.`) }
export function validateM4Result(value: unknown): M4Result {
 validateJsonValue(value)
 if (!isRecord(value) || value.schemaVersion !== 1) throw new Error('M4 result schemaVersion geçersiz.')
 const config = validateM4RuntimeConfig(value.config)
 if (!isRecord(value.mapping) || !Array.isArray(value.mapping.entries)
   || !Array.isArray(value.mapping.sliceByUeIndex) || !isRecord(value.mapping.ueIndicesBySlice)) {
   throw new Error('M4 mapping geçersiz.')
 }
 const mapping = value.mapping
 const mappingEntries = mapping.entries as unknown[]
 const sliceByUeIndex = mapping.sliceByUeIndex as unknown[]
 if (mappingEntries.length !== config.totalUeCount
   || sliceByUeIndex.length !== config.totalUeCount) throw new Error('M4 mapping UE count mismatch.')
 mappingEntries.forEach((entry, index) => {
   if (!isRecord(entry) || entry.ueIndex !== index || entry.sliceId !== sliceByUeIndex[index]) {
     throw new Error('M4 mapping bütünlüğü geçersiz.')
   }
 })
 if (!Array.isArray(value.trafficAssignment) || value.trafficAssignment.length !== config.totalUeCount) {
   throw new Error('M4 traffic assignment mismatch.')
 }
 value.trafficAssignment.forEach((assignment, index) => {
   if (!isRecord(assignment) || assignment.ueIndex !== index
     || assignment.sliceId !== sliceByUeIndex[index]
     || !Number.isSafeInteger(assignment.fiveQi) || !isRecord(assignment.trafficClass)
     || assignment.trafficClass.fiveQi !== assignment.fiveQi) throw new Error('M4 traffic assignment bütünlüğügeçersiz.')
 })
 if (!isRecord(value.m2Result) || !Array.isArray(value.m2Result.ueResults)
   || value.m2Result.ueResults.length !== config.totalUeCount
   || typeof value.m2Result.trafficFingerprint !== 'string'
   || typeof value.m2Result.ueSinrFingerprint !== 'string') throw new Error('M2 result temel yapısı geçersiz.')
 if (!Array.isArray(value.resourceTrace) || !Array.isArray(value.sliceResourceTotals)
   || value.sliceResourceTotals.length !== 3 || !isRecord(value.cellResourceTotals)) {
   throw new Error('M4 resource telemetry geçersiz.')
 }
 if (value.sliceResourceTotals.some((item, index) => !isRecord(item) || item.sliceId !== M4_SLICE_IDS[index])) {
   throw new Error('M4 resource slice sırası geçersiz.')
 }
 const cell = value.cellResourceTotals
 for (const key of [
   'totalAllocatedResourceBlocks',
   'totalUnallocatedResourceBlocks',
   'totalAvailableResourceBlocks',
   'totalSchedulerUsedResourceBlocks',
   'totalSchedulerUnusedResourceBlocks',
 ]) {
   if (!Number.isSafeInteger(cell[key])) throw new Error(`M4 cell resource ${key} geçersiz.`)
 }
 const allocated = cell.totalAllocatedResourceBlocks as number
 const unallocated = cell.totalUnallocatedResourceBlocks as number
 const available = cell.totalAvailableResourceBlocks as number
 const used = cell.totalSchedulerUsedResourceBlocks as number
 const unused = cell.totalSchedulerUnusedResourceBlocks as number
 if (allocated + unallocated !== available
   || used + unused !== allocated
   || cell.conservationSatisfied !== true) throw new Error('M4 resource conservation geçersiz.')
 if (!isRecord(value.metrics) || !Array.isArray(value.metrics.slices)
   || value.metrics.slices.length !== 3 || !isRecord(value.metrics.cell)) throw new Error('M4 metrics eksik veyageçersiz.')
 value.metrics.slices.forEach((metric, index) => {
   if (!isRecord(metric) || metric.sliceId !== M4_SLICE_IDS[index]) throw new Error('M4 metrics slice sırası geçersiz.')
   assertRatio(metric.packetDeliveryRatio, 'Packet delivery')
   assertRatio(metric.delayViolationRatio, 'Delay violation')
   assertRatio(metric.gbrMeetingRatio, 'GBR meeting')
   assertRatio(metric.jainFairness, 'Jain fairness')
   assertRatio(metric.resourceAllocationShare, 'Resource allocation')
   assertRatio(metric.schedulerUtilizationRatio, 'Scheduler utilization')
   const p50 = metric.p50PacketDelayMs
   const p95 = metric.p95PacketDelayMs
   const p99 = metric.p99PacketDelayMs
   if (!([p50, p95, p99].every((item) => item === null || (typeof item === 'number' && item >= 0)))) {
     throw new Error('M4 percentile değeri geçersiz.')
   }
   if ((typeof p50 === 'number' && typeof p95 === 'number' && p50 > p95)
     || (typeof p95 === 'number' && typeof p99 === 'number' && p95 > p99)) throw new Error('M4 percentile sırasıgeçersiz.')
 })
 if (typeof value.reproducibilityFingerprint !== 'string'
   || !/^M4-[0-9A-F]{8}$/.test(value.reproducibilityFingerprint)) throw new Error('M4 fingerprint geçersiz.')
 if (!isRecord(value.schedulerKindBySlice)
   || M4_SLICE_IDS.some((id, index) =>
     (value.schedulerKindBySlice as Record<string, unknown>)[id] !== config.slices[index].scheduler)) {
   throw new Error('M4 scheduler mapping geçersiz.')
 }
 return deepFreeze(structuredClone(value) as unknown as M4Result)
}
export function serializeM4Result(result: M4Result): string {
 validateM4Result(result)
 return JSON.stringify(result, null, 2)
}
export function parseM4Result(serialized: string): M4Result {
 if (typeof serialized !== 'string') throw new Error('M4 serialized result string olmalıdır.')
 let parsed: unknown
 try {
   parsed = JSON.parse(serialized)
 } catch {
   throw new Error('Geçersiz M4 JSON.')
 }
 return validateM4Result(parsed)
}
