import { useState, type CSSProperties } from 'react'
import type { TimeAllocationCell, TimeAllocationItem } from '../../viewModels/timeAllocationViewModel'
import { rbDetailRows } from './allocationPresentation'
import { FloatingInfoCard } from './FloatingInfoCard'
import { positionFloatingCard, type FloatingCardPosition } from './floatingCardPosition'
export interface M2AllocationGridProps { readonly cell:TimeAllocationCell; readonly selectedRbIndex:number|null; readonly onSelectRb:(rbIndex:number)=>void; readonly colorForUe:(ueId:number)=>string }
function ownerForRb(cell:TimeAllocationCell,rbIndex:number):TimeAllocationItem|null { let cursor=0; for(const
allocation of cell.allocations){cursor+=allocation.resourceBlocks;if(rbIndex<cursor)return allocation} return null }
export function M2AllocationGrid({cell,selectedRbIndex,onSelectRb,colorForUe}:M2AllocationGridProps){
 const [hoveredRbIndex,setHoveredRbIndex]=useState<number|null>(null)
 const [tooltipPosition,setTooltipPosition]=useState<FloatingCardPosition|null>(null)
 const selectedAllocation=selectedRbIndex===null?null:ownerForRb(cell,selectedRbIndex)
 const hoveredAllocation=hoveredRbIndex===null?null:ownerForRb(cell,hoveredRbIndex)
 const hoveredRows=hoveredRbIndex===null?[]:hoveredAllocation?rbDetailRows(cell,hoveredAllocation, hoveredRbIndex):[{label:'RB numarası',value:String(hoveredRbIndex+1)},{label:'Durum',value:'Boş'}]
 const show=(target:HTMLElement,index:number)=>{setHoveredRbIndex(index);setTooltipPosition( positionFloatingCard(target,330))}
 const hide=()=>{setHoveredRbIndex(null);setTooltipPosition(null)}
 return <section className="m2-rb-analysis" aria-label="RB allocation analizi">
   <FloatingInfoCard id="m2-rb-tooltip" position={tooltipPosition} title={hoveredRbIndex===null?'':`RB${hoveredRbIndex+1}`}><dl>{hoveredRows.map((row)=><div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></FloatingInfoCard>
   <div className="rb-grid m2-rb-grid" style={{gridTemplateColumns:`repeat(${Math.min(cell.totalRb,26)}, 1fr)`}}> {Array.from({length:cell.totalRb},(_,rbIndex)=>{const allocation=ownerForRb(cell,rbIndex);return <div className="m2-rb-cell" key={rbIndex}><button type="button" className={`${allocation?'owned':''}${selectedRbIndex===rbIndex?'selected':''}`} style={allocation?{'--rb-color':colorForUe(allocation.ueId)} as CSSProperties:undefined} aria-pressed= {selectedRbIndex===rbIndex} aria-describedby="m2-rb-tooltip" onMouseEnter={(event)=>show( event.currentTarget,rbIndex)} onMouseLeave={hide} onFocus={(event)=>show(event.currentTarget,rbIndex)} onBlur= {hide} onClick={()=>onSelectRb(rbIndex)}>{cell.totalRb<=26||(rbIndex+1)%10===0?rbIndex+1:''}</button></div>})} </div>
   {selectedRbIndex!==null&&<div className="m2-rb-selection" aria-live="polite"><header><span>Kalıcı RB seçimi</span><strong>RB {selectedRbIndex+1}</strong></header>{selectedAllocation?<dl>{rbDetailRows(cell, selectedAllocation,selectedRbIndex).map((row)=><div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd> </div>)}</dl>:<p>Bu RB boş.</p>}</div>}
 </section>
}
