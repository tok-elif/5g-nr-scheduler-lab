import type { TimeAllocationCell, TimeAllocationItem, TooltipRow } from '../../viewModels/timeAllocationViewModel'
function formatNumber(value: number, digits: number): string {
 return Number.isInteger(value) ? String(value) : value.toFixed(digits)
}
export function allocationDetailRows(allocation: TimeAllocationItem): TooltipRow[] {
 return [
   { label: 'UE', value: `U${allocation.ueId}` },
   { label: 'RB adedi', value: String(allocation.resourceBlocks) },
   ...(allocation.fiveQi === null ? [] : [{ label: '5QI', value: String(allocation.fiveQi) }]),
   ...(allocation.achievableRateMbps === null ? [] : [{ label: 'Achievable rate', value: `${formatNumber(allocation.achievableRateMbps, 2)} Mbps` }]),
   ...(allocation.widebandSinrDb === null ? [] : [{ label: 'UE wideband SINR', value: `${formatNumber(allocation.widebandSinrDb, 1)} dB` }]),
 ]
}
export function rbDetailRows(cell: TimeAllocationCell, allocation: TimeAllocationItem, rbIndex: number): TooltipRow[] {
 return [
   { label: 'RB numarası', value: String(rbIndex + 1) },
   { label: 'UE', value: `U${allocation.ueId}` },
   { label: 'Frame', value: String(cell.time.frameIndex) },
   { label: 'Subframe', value: String(cell.time.subframeInFrame) },
   { label: 'Slot', value: String(cell.globalSlotIndex + 1) },
   ...(cell.time.slotsPerSubframe > 1
     ? [{ label: 'Subframe içi slot', value: String(cell.time.slotInSubframe + 1) }]
     : []),
   ...(cell.scheduler === null ? [] : [{ label: 'Scheduler', value: cell.scheduler }]),
   ...allocationDetailRows(allocation).filter((row) => row.label !== 'UE'),
 ]
}
