import { useEffect, useRef, type KeyboardEvent } from 'react'
import { formatNrTimeLabel } from '../../time/nrTimeIndex'
import type { TimeAllocationCell } from '../../viewModels/timeAllocationViewModel'
import { allocationDetailRows } from './allocationPresentation'
import './SlotDetailPanel.css'
export interface SlotDetailPanelProps {
 readonly cell: TimeAllocationCell | null
 readonly onClose: () => void
}
export function SlotDetailPanel({ cell, onClose }: SlotDetailPanelProps) {
 const headingRef = useRef<HTMLHeadingElement | null>(null)
 useEffect(() => { if (cell) headingRef.current?.focus() }, [cell])
 if (!cell) return null
 const handleKey = (event: KeyboardEvent<HTMLElement>) => {
   if (event.key === 'Escape') { event.stopPropagation(); onClose() }
 }
 return <aside className="slot-detail-panel" role="dialog" aria-modal="false" aria-labelledby="slot-detail-title" onKeyDown={handleKey}>
   <div className="slot-detail-head"><div><span>Seçili slot analizi</span><h3 id="slot-detail-title" ref={headingRef} tabIndex={-1}>{formatNrTimeLabel(cell.time)}</h3></div><button type="button" className="slot-detail-close"
onClick={onClose} aria-label="Ayrıntı panelini kapat">×</button></div>
   <dl className="slot-detail-metrics">{cell.tooltipRows.map((row) => <div className="slot-detail-row" key= {row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
   {cell.kind === 'm2' && cell.allocations.length > 0 && <section className="slot-allocation-analysis" aria-label="Slotallocation listesi"><h4>Allocation listesi</h4><div>{cell.allocations.map((allocation) => <article key= {allocation.ueIndex ?? allocation.ueId}><dl>{allocationDetailRows(allocation).map((row) => <div key={row.label}><dt> {row.label}</dt><dd>{row.value}</dd></div>)}</dl></article>)}</div></section>}
 </aside>
}
