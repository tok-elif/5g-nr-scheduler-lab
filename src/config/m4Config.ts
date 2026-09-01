import configJson from './m4.json'
import {
 M4_SCHEDULER_KINDS,
 M4_SLICE_IDS,
 type M4Config,
 type M4RuntimeConfig,
 type M4RuntimeSliceConfig,
 type M4SchedulerKind,
 type M4SliceMetadata,
 type SliceId,
} from '../simulation/m4Types'
function isRecord(value: unknown): value is Record<string, unknown> {
 return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function isSliceId(value: unknown): value is SliceId {
 return typeof value === 'string' && M4_SLICE_IDS.some((id) => id === value)
}
function isSchedulerKind(value: unknown): value is M4SchedulerKind {
 return typeof value === 'string' && M4_SCHEDULER_KINDS.some((kind) => kind === value)
}
function assertFiniteNonNegative(value: unknown, label: string): asserts value is number {
 if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
   throw new Error(`${label} sonlu ve negatif olmayan bir sayı olmalıdır.`)
 }
}
function assertShare(value: unknown, label: string): asserts value is number {
 if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
   throw new Error(`${label} 0 ile 1 arasında olmalıdır.`)
 }
}
function assertSafeCount(value: unknown, label: string, positive = false): asserts value is number {
 if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
   throw new Error(`${label} güvenli tam sayı olmalıdır.`)
 }
 if (value < 0) throw new Error(`${label} negatif olmayan güvenli tam sayı olmalıdır.`)
 if (positive && value === 0) throw new Error(`${label} pozitif güvenli tam sayı olmalıdır.`)
}
function freezeMetadata(metadata: M4SliceMetadata): M4SliceMetadata {
 return Object.freeze({
   ...metadata,
   allowedFiveQis: Object.freeze([...metadata.allowedFiveQis]),
 })
}
function parseMetadata(value: unknown, index: number): M4SliceMetadata {
 if (!isRecord(value)) throw new Error(`M4 slice metadata[${index}] nesne olmalıdır.`)
 if (!isSliceId(value.id)) throw new Error(`Bilinmeyen M4 slice kimliği: ${String(value.id)}`)
 if (typeof value.label !== 'string' || value.label.trim() === '') throw new Error(`${value.id} etiketi geçersizdir.`)
 if (typeof value.description !== 'string' || value.description.trim() === '') {
   throw new Error(`${value.id} açıklaması geçersizdir.`)
 }
 if (typeof value.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(value.color)) {
   throw new Error(`${value.id} rengi geçersizdir.`)
 }
 assertFiniteNonNegative(value.defaultWeight, `${value.id} varsayılan ağırlığı`)
 assertShare(value.defaultMinimumShare, `${value.id} varsayılan minimum payı`)
 if (!isSchedulerKind(value.defaultScheduler)) {
   throw new Error(`${value.id} scheduler türü desteklenmiyor: ${String(value.defaultScheduler)}`)
 }
 if (!Array.isArray(value.allowedFiveQis)
   || value.allowedFiveQis.length === 0
   || value.allowedFiveQis.some((fiveQi) => !Number.isSafeInteger(fiveQi) || Number(fiveQi) <= 0)) {
   throw new Error(`${value.id} allowedFiveQis listesi geçersizdir.`)
 }
 return freezeMetadata({
   id: value.id,
   label: value.label,
   description: value.description,
   color: value.color,
   defaultWeight: value.defaultWeight,
   defaultMinimumShare: value.defaultMinimumShare,
   defaultScheduler: value.defaultScheduler,
   allowedFiveQis: value.allowedFiveQis.map((fiveQi) => Number(fiveQi)),
 })
}
export function validateM4Config(value: unknown): M4Config {
 if (!isRecord(value)) throw new Error('M4 config nesne olmalıdır.')
 if (value.schemaVersion !== 1) throw new Error('M4 config schemaVersion yalnızca 1 olabilir.')
 if (value.interSlicePolicy !== 'static-weighted') throw new Error('Desteklenmeyen M4 inter-slice policy.')
 if (typeof value.redistributionEnabled !== 'boolean') {
   throw new Error('M4 redistributionEnabled boolean olmalıdır.')
 }
 if (!Array.isArray(value.slices) || value.slices.length !== M4_SLICE_IDS.length) {
   throw new Error('M4 config tam olarak üç canonical slice içermelidir.')
 }
 const slices = value.slices.map(parseMetadata)
 for (let index = 0; index < M4_SLICE_IDS.length; index += 1) {
   if (slices[index].id !== M4_SLICE_IDS[index]) {
     throw new Error(`M4 slice sırası canonical olmalıdır: ${M4_SLICE_IDS.join(', ')}`)
   }
 }
 if (new Set(slices.map((slice) => slice.id)).size !== M4_SLICE_IDS.length) {
   throw new Error('M4 config duplicate slice içeremez.')
 }
 if (slices.every((slice) => slice.defaultWeight === 0)) {
   throw new Error('Tüm varsayılan M4 ağırlıkları aynı anda sıfır olamaz.')
 }
 if (slices.reduce((sum, slice) => sum + slice.defaultMinimumShare, 0) > 1 + Number.EPSILON) {
   throw new Error('Varsayılan minimum pay toplamı 1’i aşamaz.')
 }
 return Object.freeze({
   schemaVersion: 1,
   interSlicePolicy: 'static-weighted',
   redistributionEnabled: value.redistributionEnabled,
   slices: Object.freeze(slices),
 })
}
export const M4_CONFIG = validateM4Config(configJson)
function freezeRuntimeSlice(slice: M4RuntimeSliceConfig): M4RuntimeSliceConfig {
 return Object.freeze({
   ...slice,
   allowedFiveQis: Object.freeze([...slice.allowedFiveQis]),
 })
}
export function validateM4RuntimeConfig(value: unknown): M4RuntimeConfig {
 if (!isRecord(value)) throw new Error('M4 runtime config nesne olmalıdır.')
 if (value.schemaVersion !== 1) throw new Error('M4 runtime schemaVersion yalnızca 1 olabilir.')
 assertSafeCount(value.totalUeCount, 'Toplam UE sayısı', true)
 if (value.interSlicePolicy !== 'static-weighted') throw new Error('Desteklenmeyen M4 inter-slice policy.')
 if (typeof value.redistributionEnabled !== 'boolean') {
   throw new Error('M4 runtime redistributionEnabled boolean olmalıdır.')
 }
 if (!Array.isArray(value.slices) || value.slices.length !== M4_SLICE_IDS.length) {
   throw new Error('M4 runtime config tam olarak üç canonical slice içermelidir.')
 }
 const runtimeSlices: M4RuntimeSliceConfig[] = value.slices.map((candidate, index) => {
   const metadata = parseMetadata(candidate, index)
   if (!isRecord(candidate)) throw new Error(`M4 runtime slice[${index}] nesne olmalıdır.`)
   if (metadata.id !== M4_SLICE_IDS[index]) {
     throw new Error(`M4 runtime slice sırası canonical olmalıdır: ${M4_SLICE_IDS.join(', ')}`)
   }
   assertSafeCount(candidate.ueCount, `${metadata.id} UE sayısı`)
   if (typeof candidate.enabled !== 'boolean' || candidate.enabled !== (candidate.ueCount > 0)) {
     throw new Error(`${metadata.id} enabled değeri UE sayısından türetilmelidir.`)
   }
   assertFiniteNonNegative(candidate.weight, `${metadata.id} ağırlığı`)
   assertShare(candidate.minimumShare, `${metadata.id} minimum payı`)
   if (!isSchedulerKind(candidate.scheduler)) {
     throw new Error(`${metadata.id} scheduler türü desteklenmiyor: ${String(candidate.scheduler)}`)
   }
   return freezeRuntimeSlice({
     ...metadata,
     enabled: candidate.enabled,
     ueCount: candidate.ueCount,
     weight: candidate.weight,
     minimumShare: candidate.minimumShare,
     scheduler: candidate.scheduler,
   })
 })
 if (new Set(runtimeSlices.map((slice) => slice.id)).size !== M4_SLICE_IDS.length) {
   throw new Error('M4 runtime config duplicate slice içeremez.')
 }
 if (runtimeSlices.reduce((sum, slice) => sum + slice.ueCount, 0) !== value.totalUeCount) {
   throw new Error('Slice UE toplamı totalUeCount ile eşleşmelidir.')
 }
 const enabled = runtimeSlices.filter((slice) => slice.enabled)
 if (enabled.length === 0) throw new Error('En az bir M4 slice enabled olmalıdır.')
 if (enabled.every((slice) => slice.weight === 0)) {
   throw new Error('Tüm enabled slice ağırlıkları aynı anda sıfır olamaz.')
 }
 if (enabled.reduce((sum, slice) => sum + slice.minimumShare, 0) > 1 + Number.EPSILON) {
   throw new Error('Enabled slice minimum pay toplamı 1’i aşamaz.')
 }
 return Object.freeze({
   schemaVersion: 1,
   totalUeCount: value.totalUeCount,
   interSlicePolicy: 'static-weighted',
   redistributionEnabled: value.redistributionEnabled,
   slices: Object.freeze(runtimeSlices),
 })
}
export function createM4RuntimeConfig(
 totalUeCount: number,
 ueCounts: Readonly<Record<SliceId, number>>,
): M4RuntimeConfig {
 assertSafeCount(totalUeCount, 'Toplam UE sayısı', true)
 for (const sliceId of M4_SLICE_IDS) assertSafeCount(ueCounts[sliceId], `${sliceId} UE sayısı`)
 if (M4_SLICE_IDS.reduce((sum, sliceId) => sum + ueCounts[sliceId], 0) !== totalUeCount) {
   throw new Error('Slice UE toplamı totalUeCount ile eşleşmelidir.')
 }
 return validateM4RuntimeConfig({
   schemaVersion: M4_CONFIG.schemaVersion,
   totalUeCount,
   interSlicePolicy: M4_CONFIG.interSlicePolicy,
   redistributionEnabled: M4_CONFIG.redistributionEnabled,
   slices: M4_CONFIG.slices.map((metadata) => ({
     ...metadata,
     enabled: ueCounts[metadata.id] > 0,
     ueCount: ueCounts[metadata.id],
     weight: metadata.defaultWeight,
     minimumShare: metadata.defaultMinimumShare,
     scheduler: metadata.defaultScheduler,
   })),
 })
}
