import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CellConfig } from '../../simulation/types'
import { buildM1TimeAllocationView } from '../../viewModels/timeAllocationViewModel'
import { M1ResourceGrid } from './M1ResourceGrid'

const CELL: CellConfig = {
 id: '700-3',
 bandMHz: 700,
 bandwidthMHz: 3,
 resourceBlocks: 15,
 scsKHz: 15,
 slotDurationMs: 1,
}
const view = buildM1TimeAllocationView({
 schedulerLabel: 'Proportional Fair',
 slotTrace: [2],
 cell: CELL,
 ueRates: new Map([[2, { sinrDb: 7.25, achievableRateMbps: 14.5 }]]),
})

describe('M1ResourceGrid', () => {
 it('exposes UE, scheduler, rate and wideband SINR for every RB', () => {
   const html = renderToStaticMarkup(<M1ResourceGrid cell={view.cells[0]} color='#2563eb' />)
   expect((html.match(/class="m1-rb-cell"/g) ?? [])).toHaveLength(15)
   expect(html).toContain('UE wideband SINR: 7.3 dB')
   expect(html).toContain('Achievable rate: 14.50 Mbps')
   expect(html).toContain('Scheduler: Proportional Fair')
   expect(html).toContain('Slot: 1')
 })
})
