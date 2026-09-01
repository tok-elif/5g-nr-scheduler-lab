/**
* Frame–subframe–slot zaman indeksleme yardımcısı.
*
* Bu modül YALNIZ UI gruplama, zaman etiketleme, raporlama ve hover/detay
* görünümü içindir. Bilimsel scheduler motoru slot bazlı kalır; bu türetilmiş
* alanlar bilimsel sonuca veya fingerprint'e dahil edilmez.
*
* NR zaman hiyerarşisi:
*   Frame (10 ms) -> 10 Subframe (1 ms) -> her subframe'de 2^numerology slot.
*/
const SUBFRAMES_PER_FRAME = 10
const FLOAT_TOLERANCE = 1e-9
export interface NrTimeIndex {
 readonly globalSlotIndex: number
 readonly frameIndex: number
 readonly subframeIndex: number
 readonly subframeInFrame: number
 readonly slotInSubframe: number
 readonly slotsPerSubframe: number
}
export interface NrTimingInput {
 /** OFDM numerolojisi μ (0..4). Verilirse slotsPerSubframe = 2^μ. */
 readonly numerology?: number
 /** Slot süresi (ms). Verilirse slotsPerSubframe = round(1/slotDurationMs). */
 readonly slotDurationMs?: number
 /** Alt taşıyıcı aralığı (kHz). Verilirse numeroloji doğrulaması için kullanılır. */
 readonly scsKHz?: number
}
function numerologyFromScsKHz(scsKHz: number): number {
 // SCS = 15 kHz * 2^μ  ->  μ = log2(scsKHz / 15)
 const ratio = scsKHz / 15
 const mu = Math.log2(ratio)
 const rounded = Math.round(mu)
 if (Math.abs(mu - rounded) > FLOAT_TOLERANCE || rounded < 0) {
   throw new Error(`Geçersiz SCS ${scsKHz} kHz: 15·2^μ biçiminde olmalıdır.`)
 }
 return rounded
}
/**
* Slot süresinden numeroloji türetir. NR normal cyclic prefix altında bir
* subframe (1 ms) tam olarak 2^μ slot içerir, yani slotDurationMs = 1 / 2^μ.
*/
function slotsPerSubframeFromSlotDuration(slotDurationMs: number): number {
 if (!Number.isFinite(slotDurationMs) || slotDurationMs <= 0) {
   throw new Error('Slot süresi pozitif ve sonlu bir sayı olmalıdır.')
 }
 const raw = 1 / slotDurationMs
 const rounded = Math.round(raw)
 if (Math.abs(raw - rounded) > FLOAT_TOLERANCE || rounded < 1) {
   throw new Error(`Slot süresi ${slotDurationMs} ms bir subframe'i tam bölmüyor (1 ms / 2^μ olmalı).`)
 }
 // 2'nin kuvveti olmalıdır (normal CP).
 if ((rounded & (rounded - 1)) !== 0) {
   throw new Error(`Slot/subframe sayısı ${rounded} iki'nin kuvveti değil.`)
 }
 return rounded
}
/**
* Zamanlama girdisinden subframe başına slot sayısını hesaplar ve verilen
* bağımsız kaynakların (numerology / slotDuration / scs) tutarlılığını doğrular.
*/
export function resolveSlotsPerSubframe(input: NrTimingInput): number {
 const candidates: number[] = []
 if (input.numerology !== undefined) {
   if (!Number.isInteger(input.numerology) || input.numerology < 0 || input.numerology > 4) {
     throw new Error('Numeroloji 0–4 arası bir tam sayı olmalıdır.')
   }
   candidates.push(2 ** input.numerology)
 }
 if (input.scsKHz !== undefined) {
   candidates.push(2 ** numerologyFromScsKHz(input.scsKHz))
 }
 if (input.slotDurationMs !== undefined) {
   candidates.push(slotsPerSubframeFromSlotDuration(input.slotDurationMs))
 }
 if (candidates.length === 0) {
   throw new Error('En az numerology, scsKHz veya slotDurationMs verilmelidir.')
 }
 const [first, ...rest] = candidates
 for (const value of rest) {
   if (value !== first) {
     throw new Error(
       `Zamanlama girdileri çelişiyor: subframe başına slot değerleri {${candidates.join(', ')}} aynı olmalıdır.`,
     )
   }
 }
 return first
}
/**
* Global slot indeksini frame/subframe/slot bileşenlerine ayırır.
*/
export function toNrTimeIndex(globalSlotIndex: number, input: NrTimingInput): NrTimeIndex {
 if (!Number.isSafeInteger(globalSlotIndex) || globalSlotIndex < 0) {
   throw new Error('Global slot indeksi negatif olmayan güvenli bir tam sayı olmalıdır.')
 }
 const slotsPerSubframe = resolveSlotsPerSubframe(input)
 const subframeIndex = Math.floor(globalSlotIndex / slotsPerSubframe)
 const slotInSubframe = globalSlotIndex % slotsPerSubframe
 const frameIndex = Math.floor(subframeIndex / SUBFRAMES_PER_FRAME)
 const subframeInFrame = subframeIndex % SUBFRAMES_PER_FRAME
 return Object.freeze({
   globalSlotIndex,
   frameIndex,
   subframeIndex,
   subframeInFrame,
   slotInSubframe,
   slotsPerSubframe,
 })
}
/** İnsan-okur zaman etiketi. Ana slot numarası global ve 1 tabanlıdır. */
export function formatNrTimeLabel(index: NrTimeIndex): string {
 const base = `Frame ${index.frameIndex} / Subframe ${index.subframeInFrame} / Slot ${index.globalSlotIndex + 1}`
 return index.slotsPerSubframe > 1
   ? `${base} / Subframe içi ${index.slotInSubframe + 1}`
   : base
}
