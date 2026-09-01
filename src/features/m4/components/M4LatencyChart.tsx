import { PlotlyChart } from '../../../components/PlotlyChart'
import type { ReturnTypeM4ViewModel } from '../types'

export function M4LatencyChart({ view }: { view: ReturnTypeM4ViewModel }) {
  const labels = view.slices.map((slice) => slice.label)
  const percentile = (name: string, key: 'p50Ms' | 'p95Ms' | 'p99Ms', opacity: number) => ({
    type: 'bar', name, x: labels,
    y: view.slices.map((slice) => slice[key]),
    marker: { color: view.slices.map((slice) => slice.color), opacity },
    customdata: labels,
    hovertemplate: `<b>%{customdata}</b><br>${name}: %{y:.2f} ms<extra></extra>`,
  })

  return <section className="panel m4-interactive-chart">
    <header><div><h2>Packet-weighted latency yüzdelikleri</h2><p>P50, P95 ve P99 yalnız tamamlanan paketlerin arrival-to-completion gecikmesidir.</p></div><span className="m4-chart-hint">Tekerlek: zoom · sürükle: pan · çift tık: sıfırla</span></header>
    <PlotlyChart
      data={[percentile('P50', 'p50Ms', 0.45), percentile('P95', 'p95Ms', 0.72), percentile('P99', 'p99Ms', 1)]}
      ariaLabel="Slice bazında P50 P95 ve P99 gecikme grafiği"
      minHeight={410}
      layout={{
        barmode: 'group', dragmode: 'pan', hovermode: 'closest',
        margin: { l: 75, r: 24, t: 18, b: 70 },
        xaxis: { title: { text: 'Network slice' } },
        yaxis: { title: { text: 'Gecikme (ms)' }, rangemode: 'tozero' },
        legend: { orientation: 'h', x: 0, y: -0.22 },
      }}
    />
  </section>
}
