import { PlotlyChart } from '../../../components/PlotlyChart'
import type { ReturnTypeM4ViewModel } from '../types'

export function M4ServiceQualityChart({ view }: { view: ReturnTypeM4ViewModel }) {
  const labels = view.slices.map((slice) => slice.label)
  const metric = (name: string, values: Array<number | null>, color: string) => ({
    type: 'bar', name, x: labels, y: values.map((value) => value === null ? null : value * 100),
    marker: { color },
    hovertemplate: `<b>%{x}</b><br>${name}: %{y:.2f}%<extra></extra>`,
  })

  return <section className="panel m4-interactive-chart">
    <header><div><h2>Servis kalitesi göstergeleri</h2><p>Teslim, GBR karşılama, Jain fairness ve scheduler utilization aynı yüzde ölçeğinde karşılaştırılır. N/A değerler boş bırakılır.</p></div><span className="m4-chart-hint">Tekerlek: zoom · sürükle: pan · çift tık: sıfırla</span></header>
    <PlotlyChart
      data={[
        metric('Paket teslim', view.slices.map((slice) => slice.deliveryRatio), '#2563eb'),
        metric('GBR karşılama', view.slices.map((slice) => slice.gbrMeetingRatio), '#0f766e'),
        metric('Jain fairness', view.slices.map((slice) => slice.jainFairness), '#7c3aed'),
        metric('Scheduler utilization', view.slices.map((slice) => slice.utilizationRatio), '#f59e0b'),
      ]}
      ariaLabel="Slice servis kalitesi yüzdeleri karşılaştırma grafiği"
      minHeight={430}
      layout={{
        barmode: 'group', dragmode: 'pan', hovermode: 'closest',
        margin: { l: 75, r: 24, t: 18, b: 80 },
        xaxis: { title: { text: 'Network slice' } },
        yaxis: { title: { text: 'Oran (%)' }, range: [0, 105] },
        legend: { orientation: 'h', x: 0, y: -0.24 },
      }}
    />
  </section>
}
