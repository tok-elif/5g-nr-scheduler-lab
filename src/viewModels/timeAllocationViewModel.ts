import { toNrTimeIndex, type NrTimeIndex, type NrTimingInput } from '../time/nrTimeIndex'
import type { CellConfig } from '../simulation/types'
/**
* §22 ortak zaman-tahsis view-model'i.
*
* M0–M4 farklı sonuç türlerini, UI bileşenlerinin ham simülasyon yapısına
* dağınık bağlanmadan tükettiği tek bir modele dönüştürür. Eksik alanlar `null`
* olur; asla `"undefined"` string'i veya sahte `0` üretilmez. Bilimsel motor ve
* fingerprint etkilenmez; bu yalnız türetilmiş bir görünüm katmanıdır.
*/
export interface TooltipRow {
 readonly label: string
 readonly value: string
}
export interface TimeAllocationItem {
 readonly ueIndex: number | null
 readonly ueId: number
 readonly resourceBlocks: number
 /** Gerçek RB indeksleri; yalnız frekans seçici modda doludur. */
 readonly resourceBlockIndices?: readonly number[]
 readonly fiveQi: number | null
 readonly achievableRateMbps: number | null
 /** UE-level wideband SINR; this is never a fabricated per-RB measurement. */
 readonly widebandSinrDb: number | null
}
export interface TimeAllocationCell {
 readonly kind: 'm1' | 'm2'
 readonly globalSlotIndex: number
 readonly time: NrTimeIndex
 /** Hücre içi birincil etiket (ör. "U3"); yoğun modda gizlenebilir. */
 readonly label: string | null
 readonly status: 'allocated' | 'empty'
 readonly ueId: number | null
 readonly allocatedRb: number | null
 readonly totalRb: number
 readonly sinrDb: number | null
 readonly slotRateMbps: number | null
 readonly scheduler: string | null
 readonly fiveQi: number | null
 readonly sliceId: string | null
 readonly queuedMbits: number | null
 readonly holDelayMs: number | null
 readonly allocations: readonly TimeAllocationItem[]
 readonly tooltipRows: readonly TooltipRow[]
}
export interface TimeLegendEntry {
 readonly key: string
 readonly label: string
 readonly color?: string
}
export type TimeOverviewDensity = 'label' | 'compact' | 'color'
export interface TimeAllocationView {
 readonly title: string
 readonly timing: NrTimingInput
 readonly slotsPerSubframe: number
 readonly density: TimeOverviewDensity
 readonly cells: readonly TimeAllocationCell[]
 readonly legend: readonly TimeLegendEntry[]
}
const LABEL_MODE_MAX = 24
const COMPACT_MODE_MAX = 120
export function densityForSlotCount(slotCount: number): TimeOverviewDensity {
 if (slotCount <= LABEL_MODE_MAX) return 'label'
 if (slotCount <= COMPACT_MODE_MAX) return 'compact'
 return 'color'
}
function numberRow(label: string, value: number | null, unit = '', digits = 2): TooltipRow | null {
 if (value === null) return null
 const shown = Number.isInteger(value) ? String(value) : value.toFixed(digits)
 return { label, value: unit ? `${shown} ${unit}` : shown }
}
function buildTooltipRows(
 time: NrTimeIndex,
 fields: Pick<TimeAllocationCell, 'ueId' | 'scheduler' | 'allocatedRb' | 'sinrDb' | 'slotRateMbps'>, ): TooltipRow[] {
 const rows: (TooltipRow | null)[] = [
   { label: 'Frame', value: String(time.frameIndex) },
   { label: 'Subframe', value: String(time.subframeInFrame) },
   { label: 'Slot', value: String(time.globalSlotIndex + 1) },
   time.slotsPerSubframe > 1
     ? { label: 'Subframe içi slot', value: String(time.slotInSubframe + 1) }
     : null,
   fields.ueId === null ? null : { label: 'UE', value: `U${fields.ueId}` },
   fields.scheduler === null ? null : { label: 'Scheduler', value: fields.scheduler },
   numberRow('RB', fields.allocatedRb),
   numberRow('UE wideband SINR', fields.sinrDb, 'dB', 1),
   numberRow('Achievable / slot rate', fields.slotRateMbps, 'Mbps'),
 ]
 return rows.filter((row): row is TooltipRow => row !== null)
}
/**
* M1 (full-buffer, slot başına tek UE) sonucundan zaman-tahsis görünümü kurar.
* M1'de her slotta tüm RB tek UE'ye verilir; slot-rate UE'nin ulaşılabilir
* hızıdır (uydurulmuş RB-throughput DEĞİLDİR).
*/
export function buildM1TimeAllocationView(input: {
 readonly schedulerLabel: string
 readonly slotTrace: readonly number[]
 readonly cell: CellConfig
 readonly ueRates: ReadonlyMap<number, { readonly sinrDb: number; readonly achievableRateMbps: number }>
 readonly ueColors?: ReadonlyMap<number, string>
}): TimeAllocationView {
 const timing: NrTimingInput = { scsKHz: input.cell.scsKHz, slotDurationMs: input.cell.slotDurationMs }
 const cells: TimeAllocationCell[] = input.slotTrace.map((ueId, globalSlotIndex) => {
   const time = toNrTimeIndex(globalSlotIndex, timing)
   const rate = input.ueRates.get(ueId)
   const fields = {
     ueId,
     allocatedRb: input.cell.resourceBlocks,
     sinrDb: rate?.sinrDb ?? null,
     slotRateMbps: rate?.achievableRateMbps ?? null,
     scheduler: input.schedulerLabel,
     fiveQi: null,
     sliceId: null,
     queuedMbits: null,
     holDelayMs: null,
   }
   return {
     kind: 'm1' as const,
     globalSlotIndex,
     time,
     label: `U${ueId}`,
     status: 'allocated' as const,
     totalRb: input.cell.resourceBlocks,
     allocations: [{
       ueIndex: null,
       ueId,
       resourceBlocks: input.cell.resourceBlocks,
       fiveQi: null,
       achievableRateMbps: rate?.achievableRateMbps ?? null,
       widebandSinrDb: rate?.sinrDb ?? null,
     }],
     ...fields,
     tooltipRows: buildTooltipRows(time, fields),
   }
 })
 const uniqueUes = [...new Set(input.slotTrace)].sort((a, b) => a - b)
 const legend: TimeLegendEntry[] = uniqueUes.map((ueId) => ({
   key: `U${ueId}`,
   label: `U${ueId}`,
   color: input.ueColors?.get(ueId),
 }))
 legend.push({ key: 'selected', label: 'Seçili' })
 return {
   title: `${input.schedulerLabel} · slot tahsisi`,
   timing,
   slotsPerSubframe: cells[0]?.time.slotsPerSubframe ?? 1,
   density: densityForSlotCount(cells.length),
   cells,
   legend,
 }
}
interface M2SlotTraceEntry {
 readonly slotIndex: number
 readonly allocations: readonly {
   readonly ueIndex: number
   readonly resourceBlocks: number
   readonly resourceBlockIndices?: readonly number[]
 }[]
}
interface M2UeLike {
 readonly ueId: number
 readonly fiveQi: number
 readonly achievableRateMbps: number
 readonly sinrDb?: number | null
}
/**
* M2 (greedy RB paylaşımı) sonucunun gerçek slot trace'inden zaman-tahsis
* görünümü kurar. Bir slotta birden çok UE olabilir: hücre birincil UE'yi
* (en çok RB alan) gösterir; toplam kullanılan RB ve UE sayısı gerçektir.
* M2 çıktısında per-slot SINR/throughput bulunmadığından bu alanlar `null`'dır
* (uydurulmaz). Yalnız trace sınırındaki slotlar gösterilir.
*/
export function buildM2TimeAllocationView(input: {
 readonly schedulerLabel: string
 readonly slotTrace: readonly M2SlotTraceEntry[]
 readonly cell: CellConfig
 readonly ueResults: readonly M2UeLike[]
 readonly ueColors?: ReadonlyMap<number, string>
}): TimeAllocationView {
 const timing: NrTimingInput = { scsKHz: input.cell.scsKHz, slotDurationMs: input.cell.slotDurationMs }
 const seenUeIds = new Set<number>()
 const cells: TimeAllocationCell[] = input.slotTrace.map((entry) => {
   const time = toNrTimeIndex(entry.slotIndex, timing)
   const usedRb = entry.allocations.reduce((sum, allocation) => sum + allocation.resourceBlocks, 0)
   const primary = entry.allocations.reduce<M2SlotTraceEntry['allocations'][number] | null>(
     (best, allocation) => best === null || allocation.resourceBlocks > best.resourceBlocks ? allocation : best,
     null,
   )
   const primaryUe = primary ? input.ueResults[primary.ueIndex] : undefined
   const ueId = primaryUe?.ueId ?? null
   if (ueId !== null) seenUeIds.add(ueId)
   const status: 'allocated' | 'empty' = entry.allocations.length > 0 ? 'allocated' : 'empty'
   const tooltipRows: TooltipRow[] = [
     { label: 'Frame', value: String(time.frameIndex) },
     { label: 'Subframe', value: String(time.subframeInFrame) },
     { label: 'Slot', value: String(time.globalSlotIndex + 1) },
     ...(time.slotsPerSubframe > 1
       ? [{ label: 'Subframe içi slot', value: String(time.slotInSubframe + 1) }]
       : []),
     ...(ueId === null ? [] : [{ label: 'Birincil UE', value: `U${ueId}` }]),
     { label: 'Tahsis edilen UE', value: String(entry.allocations.length) },
     { label: 'Kullanılan RB', value: `${usedRb} / ${input.cell.resourceBlocks}` },
     ...(primaryUe ? [{ label: '5QI', value: String(primaryUe.fiveQi) }] : []),
     { label: 'Scheduler', value: input.schedulerLabel },
   ]
   const allocations: TimeAllocationItem[] = entry.allocations.flatMap((allocation) => {
     const ue = input.ueResults[allocation.ueIndex]
     return ue ? [{
       ueIndex: allocation.ueIndex,
       ueId: ue.ueId,
       resourceBlocks: allocation.resourceBlocks,
       ...(allocation.resourceBlockIndices ? { resourceBlockIndices: allocation.resourceBlockIndices } : {}),
       fiveQi: ue.fiveQi,
       achievableRateMbps: ue.achievableRateMbps,
       widebandSinrDb: ue.sinrDb ?? null,
     }] : []
   })
   return {
     kind: 'm2' as const,
     globalSlotIndex: entry.slotIndex,
     time,
     label: ueId === null ? '·' : `U${ueId}`,
     status,
     totalRb: input.cell.resourceBlocks,
     allocations,
     ueId,
     allocatedRb: usedRb,
     sinrDb: null,
     slotRateMbps: null,
     scheduler: input.schedulerLabel,
     fiveQi: primaryUe?.fiveQi ?? null,
     sliceId: null,
     queuedMbits: null,
     holDelayMs: null,
     tooltipRows,
   }
 })
 const legend: TimeLegendEntry[] = [...seenUeIds].sort((a, b) => a - b).map((ueId) => ({
   key: `U${ueId}`, label: `U${ueId}`, color: input.ueColors?.get(ueId),
 }))
 legend.push({ key: 'empty', label: 'Boş' }, { key: 'selected', label: 'Seçili' })
 return {
   title: `${input.schedulerLabel} · RB paylaşımı`,
   timing,
   slotsPerSubframe: cells[0]?.time.slotsPerSubframe ?? 1,
   density: densityForSlotCount(cells.length),
   cells,
   legend,
 }
}
