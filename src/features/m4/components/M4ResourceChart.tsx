import { PlotlyChart } from '../../../components/PlotlyChart'
import type { ReturnTypeM4ViewModel } from '../types'

export function M4ResourceChart({ view }: { view: ReturnTypeM4ViewModel }) {
  const labels = [...view.slices.map((slice) => slice.label), 'Hücrede ayrılmayan']
  const used = [...view.slices.map((slice) => slice.used), 0]
  const unused = [...view.slices.map((slice) => slice.unused), 0]
  const unallocated = [...view.slices.map(() => 0), view.cell.unallocated]

  const data = [
    {
      type: 'bar', orientation: 'h', name: 'Scheduler tarafından kullanılan',
      y: labels, x: used, marker: { color: '#2563eb' },
      customdata: labels,
      hovertemplate: '<b>%{customdata}</b><br>Kullanılan: %{x:,.0f} RB-slot<extra></extra>',
    },
    {
      type: 'bar', orientation: 'h', name: 'Slice içinde kullanılmayan',
      y: labels, x: unused, marker: { color: '#cbd5e1' },
      customdata: labels,
      hovertemplate: '<b>%{customdata}</b><br>Kullanılmayan: %{x:,.0f} RB-slot<extra></extra>',
    },
    {
      type: 'bar', orientation: 'h', name: 'Hücrede ayrılmayan',
      y: labels, x: unallocated, marker: { color: '#f59e0b' },
      customdata: labels,
      hovertemplate: '<b>%{customdata}</b><br>Ayrılmayan: %{x:,.0f} RB-slot<extra></extra>',
    },
  ]

  return <section className="panel m4-interactive-chart">
    <header><div><h2>Kaynak kullanımı</h2><p>Ayrılan RB bütçesinin kullanılan, slice içinde boş kalan ve hücrede hiç ayrılmayan bölümünü karşılaştırır.</p></div><span className="m4-chart-hint">Tekerlek: zoom · sürükle: pan · çift tık: sıfırla</span></header>
    <PlotlyChart
      data={data}
      ariaLabel="Slice bazında kaynak kullanımı yığılmış çubuk grafiği"
      minHeight={390}
      layout={{
        barmode: 'stack', dragmode: 'pan', hovermode: 'closest',
        margin: { l: 120, r: 24, t: 18, b: 70 },
        xaxis: { title: { text: 'Toplam RB-slot' }, rangemode: 'tozero' },
        yaxis: { autorange: 'reversed' },
        legend: { orientation: 'h', x: 0, y: -0.24 },
      }}
    />
  </section>
}
