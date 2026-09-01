import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SlotDetailPanel } from './SlotDetailPanel'
import { buildM1TimeAllocationView } from '../../viewModels/timeAllocationViewModel'
import type { CellConfig } from '../../simulation/types'
const CELL: CellConfig = { id: '3500-100', bandMHz: 3500, bandwidthMHz: 100, resourceBlocks: 273, scsKHz: 30, slotDurationMs: 0.5 }
const view = buildM1TimeAllocationView({
 schedulerLabel: 'Max C/I',
 slotTrace: [1, 2, 1, 2],
 cell: CELL,
 ueRates: new Map([[1, { sinrDb: 20, achievableRateMbps: 800 }], [2, { sinrDb: 5, achievableRateMbps: 90 }]]), })
const render = (index: number | null) =>
 renderToStaticMarkup(<SlotDetailPanel cell={index === null ? null : view.cells[index]} onClose={() => {}} />)
describe('SlotDetailPanel', () => {
 it('renders nothing when no slot is selected', () => {
   expect(render(null)).toBe('')
 })
 it('renders the frame/subframe/slot title', () => {
   // slot 3 at 30 kHz -> Frame 0 / Subframe 1 / Slot 1
   expect(render(3)).toContain('Frame 0 / Subframe 1 / Slot 4 / Subframe içi 2')
 })
 it('is an accessible dialog labelled by its heading', () => {
   const html = render(0)
   expect(html).toContain('role="dialog"')
   expect(html).toContain('aria-labelledby="slot-detail-title"')
   expect(html).toContain('id="slot-detail-title"')
 })
 it('shows the real KPIs that exist in the source data', () => {
   const html = render(0)
   expect(html).toContain('U1')
   expect(html).toContain('Max C/I')
   expect(html).toContain('273') // allocated RB
   expect(html).toContain('20 dB')
   expect(html).toContain('800 Mbps')
 })
 it('omits KPIs not modelled by M1 instead of rendering irrelevant N/A cards', () => {
   const html = render(0)
   expect(html).not.toContain('5QI')
   expect(html).not.toContain('Slice')
   expect(html).not.toContain('Queue')
   expect(html).not.toContain('HOL delay')
 })
 it('shows the real full-band RB allocation', () => {
   expect(render(0)).toContain('<dt>RB</dt><dd>273</dd>')
 })
 it('has an accessible close control', () => {
   expect(render(0)).toContain('aria-label="Ayrıntı panelini kapat"')
 })
})
