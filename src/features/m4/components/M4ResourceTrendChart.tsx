import { PlotlyChart } from '../../../components/PlotlyChart'
import type { ReturnTypeM4ViewModel } from '../types'

export function M4ResourceTrendChart({ view }: { view: ReturnTypeM4ViewModel }) {
  if (view.trace.length === 0) {
    return <section className="panel"><h2>Slot bazlı kaynak trendi</h2><p className="m4-no-data">Resource trace kaydedilmedi. Trace limitini artırarak yeniden çalıştırın.</p></section>
  }

  const data = view.slices.flatMap((slice) => [
    {
      type: 'scatter', mode: 'lines', name: `${slice.label} allocated`,
      x: view.trace.map((slot) => slot.slotIndex),
      y: view.trace.map((slot) => slot.slices.find((entry) => entry.id === slice.id)?.allocated ?? 0),
      line: { color: slice.color, width: 2.5 },
      hovertemplate: `<b>${slice.label}</b><br>Slot %{x}<br>Allocated %{y:,.0f} RB<extra></extra>`,
    },
    {
      type: 'scatter', mode: 'lines', name: `${slice.label} used`,
      x: view.trace.map((slot) => slot.slotIndex),
      y: view.trace.map((slot) => slot.slices.find((entry) => entry.id === slice.id)?.used ?? 0),
      line: { color: slice.color, width: 1.4, dash: 'dot' },
      opacity: 0.72,
      hovertemplate: `<b>${slice.label}</b><br>Slot %{x}<br>Used %{y:,.0f} RB<extra></extra>`,
    },
  ])

  return <section className="panel m4-interactive-chart">
    <header><div><h2>Slot bazlı kaynak trendi</h2><p>İlk {view.trace.length} slot için allocated ve scheduler-used RB değerleri. Kesikli çizgiler gerçek kullanımı gösterir.</p></div><span className="m4-chart-hint">Tekerlek: zoom · sürükle: pan · çift tık: sıfırla</span></header>
    <PlotlyChart
      data={data}
      ariaLabel="Slot bazlı allocated ve used RB trend grafiği"
      minHeight={420}
      layout={{
        dragmode: 'pan', hovermode: 'x unified',
        margin: { l: 70, r: 24, t: 18, b: 80 },
        xaxis: { title: { text: 'Slot index' }, rangeslider: { visible: true, thickness: 0.08 } },
        yaxis: { title: { text: 'RB / slot' }, rangemode: 'tozero' },
        legend: { orientation: 'h', x: 0, y: -0.28 },
      }}
    />
  </section>
}
