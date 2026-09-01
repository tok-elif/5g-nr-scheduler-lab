import { PlotlyChart } from '../../../components/PlotlyChart'
import type { ReturnTypeM4ViewModel } from '../types'

export function M4ThroughputChart({ view }: { view: ReturnTypeM4ViewModel }) {
  return <section className="panel m4-interactive-chart">
    <header><div><h2>Slice throughput karşılaştırması</h2><p>Her slice için simülasyon boyunca teslim edilen toplam veri üzerinden hesaplanan aggregate throughput.</p></div><span className="m4-chart-hint">Tekerlek: zoom · sürükle: pan · çift tık: sıfırla</span></header>
    <PlotlyChart
      data={[{
        type: 'bar',
        x: view.slices.map((slice) => slice.label),
        y: view.slices.map((slice) => slice.throughputMbps),
        marker: { color: view.slices.map((slice) => slice.color) },
        customdata: view.slices.map((slice) => [slice.scheduler, slice.resourceShare]),
        text: view.slices.map((slice) => `${slice.throughputMbps.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} Mbps`),
        textposition: 'outside',
        hovertemplate: '<b>%{x}</b><br>Throughput %{y:.2f} Mbps<br>Scheduler %{customdata[0]}<br>RB payı %{customdata[1]}<extra></extra>',
      }]}
      ariaLabel="Slice throughput çubuk grafiği"
      minHeight={390}
      layout={{
        dragmode: 'pan', hovermode: 'closest', showlegend: false,
        margin: { l: 75, r: 24, t: 18, b: 65 },
        xaxis: { title: { text: 'Network slice' } },
        yaxis: { title: { text: 'Throughput (Mbps)' }, rangemode: 'tozero' },
      }}
    />
  </section>
}
