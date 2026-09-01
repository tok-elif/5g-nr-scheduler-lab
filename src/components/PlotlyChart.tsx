import { useEffect, useRef, useState } from 'react'
import { withChartStandard } from './chartStandard'
interface PlotlyChartProps {
 data: ReadonlyArray<Record<string, unknown>>
 layout: Record<string, unknown>
 ariaLabel: string
 id?: string
 minHeight?: number
}
const PLOTLY_CDN_URL = 'https://cdn.plot.ly/plotly-basic-3.7.0.min.js'
const PLOTLY_SCRIPT_ID = 'plotly-basic-3-7-0'
const PLOT_CONFIG: Record<string, unknown> = {
 responsive: true,
 displaylogo: false,
 scrollZoom: true,
 displayModeBar: true,
 doubleClick: 'reset+autosize',
 modeBarButtonsToRemove: ['lasso2d', 'select2d'],
 toImageButtonOptions: { format: 'png', scale: 2 },
}
let plotlyLoadPromise: Promise<PlotlyStatic> | null = null
function loadPlotly(): Promise<PlotlyStatic> {
 if (window.Plotly) return Promise.resolve(window.Plotly)
 if (plotlyLoadPromise) return plotlyLoadPromise
 plotlyLoadPromise = new Promise<PlotlyStatic>((resolve, reject) => {
   const existing = document.getElementById(PLOTLY_SCRIPT_ID) as HTMLScriptElement | null
   const resolveLoaded = () => {
     if (window.Plotly) {
       resolve(window.Plotly)
     } else {
       reject(new Error('Plotly betiği yüklendi ancak window.Plotly oluşmadı.'))
     }
   }
   if (existing) {
     if (window.Plotly) {
       resolve(window.Plotly)
       return
     }
     existing.addEventListener('load', resolveLoaded, { once: true })
     existing.addEventListener('error', () => reject(new Error('Plotly betiği yüklenemedi.')), { once: true })
     return
   }
   const script = document.createElement('script')
   script.id = PLOTLY_SCRIPT_ID
   script.src = PLOTLY_CDN_URL
   script.async = true
   script.crossOrigin = 'anonymous'
   script.addEventListener('load', resolveLoaded, { once: true })
   script.addEventListener(
     'error',
     () => reject(new Error('Plotly CDN betiği yüklenemedi. Ağ veya kurum proxy ayarlarını kontrol edin.')),
     { once: true },
   )
   document.head.appendChild(script)
 }).catch((error: unknown) => {
   plotlyLoadPromise = null
   throw error
 })
 return plotlyLoadPromise
}
export function PlotlyChart({ data, layout, ariaLabel, id, minHeight = 440 }: PlotlyChartProps) {
 const rootRef = useRef<HTMLDivElement | null>(null)
 const [errorMessage, setErrorMessage] = useState<string | null>(null)
 useEffect(() => {
   const root = rootRef.current
   if (!root) return
   let cancelled = false
   let activePlotly: PlotlyStatic | null = null
   void loadPlotly()
     .then((plotly) => {
       if (cancelled) return
       activePlotly = plotly
       setErrorMessage(null)
       // §13: her grafiğe ortak okunabilirlik standardı (autosize + automargin) uygulanır.
       return plotly.react(root, data, withChartStandard(layout), PLOT_CONFIG)
     })
     .catch((error: unknown) => {
       if (cancelled) return
       setErrorMessage(error instanceof Error ? error.message : 'Plotly grafiği yüklenemedi.')
     })
   return () => {
     cancelled = true
     if (activePlotly) activePlotly.purge(root)
   }
 }, [data, layout])
 if (errorMessage) {
   return (
     <div className="m2-plotly-chart m2-plotly-chart--error" role="alert">
       {errorMessage}
     </div>
   )
 }
 return <div id={id} className="m2-plotly-chart" style={{ minHeight }} ref={rootRef} role="img" aria-label={ariaLabel} />
}
