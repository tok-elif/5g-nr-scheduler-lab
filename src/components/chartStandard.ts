/**
* §13 ortak grafik standardı.
*
* Tüm Plotly grafiklerine uygulanan okunabilirlik varsayılanları: responsive
* autosize, eksen `automargin` (yazı kesilmesini önler), makul hovermode ve
* çakışmayan tick yoğunluğu. Saf yardımcılar test edilebilir; `withChartStandard`
* PlotlyChart tarafından merkezî olarak uygulanır.
*/
type Layout = Record<string, unknown>
function mergeAxis(axis: unknown): Layout {
 const base: Layout = { automargin: true }
 if (axis && typeof axis === 'object') return { ...base, ...(axis as Layout) }
 return base
}
/** Layout'a autosize + eksen automargin + varsayılan hovermode ekler (mevcut değerleri ezmez). */export function withChartStandard(layout: Layout): Layout {
 return {
   autosize: true,
   hovermode: 'closest',
   ...layout,
   xaxis: mergeAxis(layout.xaxis),
   yaxis: mergeAxis(layout.yaxis),
   ...(layout.yaxis2 !== undefined ? { yaxis2: mergeAxis(layout.yaxis2) } : {}),
   margin: { t: 24, r: 16, b: 44, l: 56, ...(layout.margin as Layout | undefined) },
 }
}
export interface TickSettings {
 readonly nticks: number
 readonly tickangle: number
}
/**
* Nokta sayısı ve viewport genişliğine göre tick yoğunluğu. Her veri noktasının
* etiketi eksene zorlanmaz; dar ekranda tickler açılandırılır ve seyrekleştirilir.
*/
export function tickSettings(pointCount: number, viewportWidth: number): TickSettings {
 const perTickPx = 64
 const maxTicks = Math.max(2, Math.floor(viewportWidth / perTickPx))
 const nticks = Math.max(2, Math.min(pointCount, maxTicks))
 const crowded = pointCount > maxTicks || viewportWidth < 640
 return { nticks, tickangle: crowded ? -45 : 0 }
}
/**
* Farklı birimlerin aynı y-eksenini paylaşmasını engellemek için uyarı.
* Örn. Throughput (Mbps) ve SINR (dB) tek eksende gösterilmemelidir.
*/
export function sharesSingleAxisImproperly(units: readonly string[]): boolean {
 return new Set(units.filter((unit) => unit.trim() !== '')).size > 1
}
/** Birimli bir hovertemplate satırı üretir (ör. "Throughput: %{y:.2f} Mbps"). */
export function hoverTemplateLine(label: string, ref: string, unit = '', precision = 2): string {
 const number = ref.startsWith('%{') ? ref : `%{${ref}:.${precision}f}`
 return unit ? `${label}: ${number} ${unit}` : `${label}: ${number}`
}
/** Satırları eksiksiz bir hovertemplate'e birleştirir (Plotly trace adını gizler). */export function buildHoverTemplate(lines: readonly string[]): string {
 return `${lines.join('<br>')}<extra></extra>`
}
