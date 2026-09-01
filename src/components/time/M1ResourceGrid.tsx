import { useState, type CSSProperties } from 'react'
import type { TimeAllocationCell } from '../../viewModels/timeAllocationViewModel'
import { rbDetailRows } from './allocationPresentation'
import { FloatingInfoCard } from './FloatingInfoCard'
import { positionFloatingCard, type FloatingCardPosition } from './floatingCardPosition'
export function M1ResourceGrid({ cell, color }: { readonly cell: TimeAllocationCell | null; readonly color: string }) {
 const [hoveredRbIndex, setHoveredRbIndex] = useState<number | null>(null)
 const [tooltipPosition, setTooltipPosition] = useState<FloatingCardPosition | null>(null)
 if (!cell) return null
 const allocation = cell.allocations[0] ?? null
 const rows = hoveredRbIndex === null
   ? []
   : allocation
     ? rbDetailRows(cell, allocation, hoveredRbIndex)
     : [{ label: 'RB numarası', value: String(hoveredRbIndex + 1) }, { label: 'Durum', value: 'Boş' }]
 const show = (target: HTMLElement, index: number) => {
   setHoveredRbIndex(index)
   setTooltipPosition(positionFloatingCard(target, 340))
 }
 const hide = () => {
   setHoveredRbIndex(null)
   setTooltipPosition(null)
 }
 return <section className="m1-rb-analysis" aria-label="M1 tam bant RB ayrıntıları">
   <FloatingInfoCard id="m1-rb-tooltip" position={tooltipPosition} title={hoveredRbIndex === null ? '' : `RB ${hoveredRbIndex + 1}`}>
     <dl>{rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
   </FloatingInfoCard>
   <div className="rb-grid allocated" style={{ gridTemplateColumns: `repeat(${Math.min(cell.totalRb, 26)}, 1fr)` }}>
     {Array.from({ length: cell.totalRb }, (_, rbIndex) => {
       const buttonRows = allocation
         ? rbDetailRows(cell, allocation, rbIndex)
         : [{ label: 'RB numarası', value: String(rbIndex + 1) }, { label: 'Durum', value: 'Boş' }]
       return <button
         type="button"
         key={rbIndex}
         className="m1-rb-cell"
         style={{ '--rb-color': color } as CSSProperties}
         aria-describedby="m1-rb-tooltip"
         aria-label={buttonRows.map((row) => `${row.label}: ${row.value}`).join('; ')}
         onMouseEnter={(event) => show(event.currentTarget, rbIndex)}
         onMouseLeave={hide}
         onFocus={(event) => show(event.currentTarget, rbIndex)}
         onBlur={hide}
       >{cell.totalRb <= 26 || (rbIndex + 1) % 10 === 0 ? rbIndex + 1 : ''}</button>
     })}
   </div>
 </section>
}
