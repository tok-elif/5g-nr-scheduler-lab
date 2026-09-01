import { describe, expect, it } from 'vitest'
import {
 buildHoverTemplate,
 hoverTemplateLine,
 sharesSingleAxisImproperly,
 tickSettings,
 withChartStandard,
} from './chartStandard'
describe('withChartStandard', () => {
 it('applies autosize and axis automargin', () => {
   const layout = withChartStandard({})
   expect(layout.autosize).toBe(true)
   expect(layout.xaxis).toMatchObject({ automargin: true })
   expect(layout.yaxis).toMatchObject({ automargin: true })
 })
 it('does not override caller-provided axis settings', () => {
   const layout = withChartStandard({ xaxis: { title: 'Slot', tickangle: -30 } })
   expect(layout.xaxis).toMatchObject({ automargin: true, title: 'Slot', tickangle: -30 })
 })
 it('adds automargin to a secondary axis when present', () => {
   const layout = withChartStandard({ yaxis2: { overlaying: 'y', side: 'right' } })
   expect(layout.yaxis2).toMatchObject({ automargin: true, overlaying: 'y', side: 'right' })
 })
})
describe('tickSettings', () => {
 it('reduces tick count and angles labels on narrow viewports', () => {
   const narrow = tickSettings(50, 390)
   expect(narrow.nticks).toBeLessThan(50)
   expect(narrow.tickangle).toBe(-45)
 })
 it('keeps labels horizontal when there is room', () => {
   const wide = tickSettings(5, 1440)
   expect(wide.tickangle).toBe(0)
   expect(wide.nticks).toBe(5)
 })
})
describe('sharesSingleAxisImproperly', () => {
 it('flags mixing throughput and SINR units on one axis', () => {
   expect(sharesSingleAxisImproperly(['Mbps', 'dB'])).toBe(true)
 })
 it('allows a single unit', () => {
   expect(sharesSingleAxisImproperly(['Mbps', 'Mbps', ''])).toBe(false)
 })
})
describe('hovertemplate helpers', () => {
 it('builds a unit-bearing line', () => {
   expect(hoverTemplateLine('Throughput', 'y', 'Mbps')).toBe('Throughput: %{y:.2f} Mbps')
   expect(hoverTemplateLine('UE', '%{text}')).toBe('UE: %{text}')
 })
 it('joins lines and hides the default trace name', () => {
   expect(buildHoverTemplate(['Slot: %{x}', 'Throughput: %{y:.2f} Mbps']))
     .toBe('Slot: %{x}<br>Throughput: %{y:.2f} Mbps<extra></extra>')
 })
})
