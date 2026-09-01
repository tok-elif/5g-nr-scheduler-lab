import { PlotlyChart } from '../../../components/PlotlyChart'
import type { ReturnTypeM4ViewModel } from '../types'

export function M4ResourceCompositionChart({ view }: { view: ReturnTypeM4ViewModel }) {
  const labels = view.slices.map((slice) => slice.label)
  const trace = (name: string, values: number[], color: string, explanation: string) => ({
    type: 'bar', orientation: 'h', name, y: labels, x: values,
    marker: { color }, customdata: labels,
    hovertemplate: `<b>%{customdata}</b><br>${explanation}: %{x:,.0f} RB-slot<extra></extra>`,
  })
  const data = [
    trace('Minimum garanti', view.slices.map((slice) => slice.guaranteed), '#0f766e', 'Garanti'),
    trace('Ortak havuz', view.slices.map((slice) => slice.ordinaryShared), '#2563eb', 'Ortak havuz'),
    trace('Yeniden dağıtılan', view.slices.map((slice) => slice.redistributed), '#f59e0b', 'Yeniden dağıtılan'),
  ]

  return <section className="panel m4-interactive-chart">
    <header><div><h2>Kaynak kompozisyonu</h2><p>Her slice tahsisinin minimum garanti, ordinary shared ve unused-guarantee redistribution bileşenlerini gösterir.</p></div><span className="m4-chart-hint">Tekerlek: zoom · sürükle: pan · çift tık: sıfırla</span></header>
    <PlotlyChart
      data={data}
      ariaLabel="Slice kaynak kompozisyonu yığılmış çubuk grafiği"
      minHeight={390}
      layout={{
        barmode: 'stack', dragmode: 'pan', hovermode: 'closest',
        margin: { l: 95, r: 24, t: 18, b: 70 },
        xaxis: { title: { text: 'Toplam RB-slot' }, rangemode: 'tozero' },
        yaxis: { autorange: 'reversed' },
        legend: { orientation: 'h', x: 0, y: -0.24 },
      }}
    />
    <div className="m4-transfer-summary">{view.slices.map((slice) => <span key={slice.id}><b>{slice.label}:</b> {slice.borrowed.toLocaleString('tr-TR')} aldı · {slice.lent.toLocaleString('tr-TR')} verdi</span>)}</div>
  </section>
}
