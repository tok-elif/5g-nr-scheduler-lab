export interface SchedulerChartStyle {
 readonly color: string
 readonly symbol: string
 readonly size: number
 readonly textPosition: string
 readonly dash: string
}
const DEFAULT_STYLE: SchedulerChartStyle = {
 color: '#475569',
 symbol: 'circle',
 size: 14,
 textPosition: 'top center',
 dash: 'solid',
}
const STYLES: Readonly<Record<string, SchedulerChartStyle>> = Object.freeze({
 'round-robin': {
   color: '#2563eb',
   symbol: 'circle-open',
   size: 23,
   textPosition: 'top left',
   dash: 'dot',
 },
 'max-ci': {
   color: '#c2410c',
   symbol: 'triangle-up',
   size: 16,
   textPosition: 'bottom right',
   dash: 'dashdot',
 },
 'proportional-fair': {
   color: '#0f766e',
   symbol: 'diamond',
   size: 14,
   textPosition: 'top right',
   dash: 'solid',
 },
 'm-lwdf': {
   color: '#7c3aed',
   symbol: 'square-open',
   size: 21,
   textPosition: 'bottom left',
   dash: 'dash',
 },
 'exp-pf': {
   color: '#be123c',
   symbol: 'x',
   size: 16,
   textPosition: 'top center',
   dash: 'longdash',
 },
 'qdf-pf': {
   color: '#0891b2',
   symbol: 'star',
   size: 17,
   textPosition: 'bottom center',
   dash: 'solid',
 },
})
export function schedulerChartStyle(kind: string, fallbackColor?: string): SchedulerChartStyle {
 const style = STYLES[kind]
 return style ?? { ...DEFAULT_STYLE, color: fallbackColor ?? DEFAULT_STYLE.color }
}
