import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NrTimeOverview } from './NrTimeOverview'
import { SlotDetailPanel } from './SlotDetailPanel'
import { buildM1TimeAllocationView } from '../../viewModels/timeAllocationViewModel'
import type { CellConfig } from '../../simulation/types'

const CELL: CellConfig = {
  id: '2600-20',
  bandMHz: 2600,
  bandwidthMHz: 20,
  resourceBlocks: 106,
  scsKHz: 15,
  slotDurationMs: 1,
}
const CELL_30: CellConfig = {
  id: '3500-100',
  bandMHz: 3500,
  bandwidthMHz: 100,
  resourceBlocks: 273,
  scsKHz: 30,
  slotDurationMs: 0.5,
}
const rates = new Map([
  [1, { sinrDb: 12, achievableRateMbps: 100 }],
  [2, { sinrDb: 6, achievableRateMbps: 40 }],
])
const smallView = buildM1TimeAllocationView({
  schedulerLabel: 'RR',
  slotTrace: [1, 2, 1, 2, 1, 2],
  cell: CELL,
  ueRates: rates,
})
const denseView = buildM1TimeAllocationView({
  schedulerLabel: 'RR',
  slotTrace: Array.from({ length: 200 }, (_, i) => (i % 2) + 1),
  cell: CELL_30,
  ueRates: rates,
})
const render = (selected: number | null, view = smallView) =>
  renderToStaticMarkup(<NrTimeOverview view={view} selectedSlot={selected} onSelect={() => {}} />)

describe('NrTimeOverview', () => {
  it('1. renders every slot as a button', () => {
    const html = render(null)
    expect((html.match(/data-slot=/g) ?? []).length).toBe(6)
  })

  it('2. never uses horizontal slot scrolling', () => {
    const html = render(null)
    expect(html).toContain('class="nr-time-overview"')
    expect(html).not.toContain('overflow-x: scroll')
    expect(html).not.toContain('overflow-x:scroll')
    expect(html).not.toContain('overflow-x: auto')
  })

  it('3. shows subframe headers', () => {
    const html = render(null)
    expect(html).toContain('<span>Subframe</span><strong>0</strong>')
    expect(html).toContain('<span>Subframe</span><strong>1</strong>')
  })

  it('4. shows frame headers', () => {
    expect(render(null)).toContain('Frame 0')
  })

  it('5. dense mode drops per-cell text labels', () => {
    expect(denseView.density).toBe('color')
    const html = renderToStaticMarkup(
      <NrTimeOverview view={denseView} selectedSlot={null} onSelect={() => {}} />,
    )
    expect(html).toContain('data-density="color"')
    expect(html).not.toContain('nr-slot-label')
  })

  it('6. renders a visible legend', () => {
    const html = render(null)
    expect(html).toContain('Slot renk açıklaması')
    expect(html).toContain('>U1<')
    expect(html).toContain('>Seçili<')
  })

  it('7. marks the selected slot with aria-selected', () => {
    const html = render(2)
    expect((html.match(/aria-selected="true"/g) ?? []).length).toBe(1)
    expect((html.match(/aria-selected="false"/g) ?? []).length).toBe(5)
    expect(html).toContain('nr-slot selected')
  })

  it('8. connects every slot to the unclipped portal tooltip', () => {
    const html = render(0)
    expect(html).toContain('aria-describedby="nr-time-tooltip"')
    expect(smallView.cells[0].tooltipRows).toContainEqual({ label: 'UE wideband SINR', value: '12 dB' })
    expect(smallView.cells[0].tooltipRows).toContainEqual({ label: 'RB', value: '106' })
  })

  it('9. M1 tooltip and detail render the same SINR and rate from one cell', () => {
    const detail = renderToStaticMarkup(<SlotDetailPanel cell={smallView.cells[0]} onClose={() => {}} />)
    for (const metric of ['12 dB', '100 Mbps']) {
      expect(smallView.cells[0].tooltipRows.some((row) => row.value === metric)).toBe(true)
      expect(detail).toContain(metric)
    }
  })

  it('10. displays distinct global slot numbers instead of repeating local slot zero', () => {
    const html = render(null)
    for (const slot of [1, 2, 3, 4, 5, 6]) {
      expect(html).toContain(`>S${slot}<`)
    }
    expect(smallView.cells[0].tooltipRows).toContainEqual({ label: 'Slot', value: '1' })
    expect(smallView.cells[5].tooltipRows).toContainEqual({ label: 'Slot', value: '6' })
  })
})
