import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildM2TimeAllocationView } from '../../viewModels/timeAllocationViewModel'
import type { CellConfig } from '../../simulation/types'
import { SlotDetailPanel } from './SlotDetailPanel'
import { M2AllocationGrid } from './M2AllocationGrid'
import { rbDetailRows } from './allocationPresentation'
const CELL: CellConfig = { id: '3500-100', bandMHz: 3500, bandwidthMHz: 100, resourceBlocks: 4, scsKHz: 30, slotDurationMs: 0.5 }
const view = buildM2TimeAllocationView({
 schedulerLabel: 'M-LWDF',
 slotTrace: [{ slotIndex: 3, allocations: [{ ueIndex: 0, resourceBlocks: 3 }, { ueIndex: 1, resourceBlocks: 1 }] }],
 cell: CELL,
 ueResults: [
   { ueId: 7, fiveQi: 1, achievableRateMbps: 84.25, sinrDb: 11.5 },
   { ueId: 9, fiveQi: 9, achievableRateMbps: 24, sinrDb: null },
 ],
})
const cell = view.cells[0]
describe('M2AllocationGrid', () => {
 it('shows 5QI and achievable rate in the RB tooltip', () => {
   const html = renderToStaticMarkup(<M2AllocationGrid cell={cell} selectedRbIndex={0} onSelectRb={() => {}}
colorForUe={() => '#2563eb'} />)
   expect(html).toContain('<dt>5QI</dt><dd>1</dd>')
   expect(html).toContain('<dt>Achievable rate</dt><dd>84.25 Mbps</dd>')
 })
 it('uses the same real UE wideband SINR in RB tooltip and allocation detail', () => {
   const rbRows = rbDetailRows(cell, cell.allocations[0], 0)
   expect(rbRows).toContainEqual({ label: 'UE wideband SINR', value: '11.5 dB' })
   const grid = renderToStaticMarkup(<M2AllocationGrid cell={cell} selectedRbIndex={0} onSelectRb={() => {}}
colorForUe={() => '#2563eb'} />)
   const detail = renderToStaticMarkup(<SlotDetailPanel cell={cell} onClose={() => {}} />)
   expect(grid).toContain('<dt>UE wideband SINR</dt><dd>11.5 dB</dd>')
   expect(detail).toContain('<dt>UE wideband SINR</dt><dd>11.5 dB</dd>')
   expect(grid).not.toContain('RB SINR')
 })
 it('renders a persistent analysis for the clicked RB selection', () => {
   const html = renderToStaticMarkup(<M2AllocationGrid cell={cell} selectedRbIndex={2} onSelectRb={() => {}}
colorForUe={() => '#2563eb'} />)
   expect(html).toContain('Kalıcı RB seçimi')
   expect(html).toContain('<strong>RB 3</strong>')
 })
})
