import type { M2QosResult } from '../simulation/m2Types'
import { PlotlyChart } from './PlotlyChart'

const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 })

const QOS_SHORT_LABELS: Record<number, string> = {
  1: 'Ses',
  2: 'Canlı video',
  6: 'TCP / video',
  9: 'Best effort',
}

function shortLabel(qos: M2QosResult): string {
  return `5QI ${qos.fiveQi}<br>${QOS_SHORT_LABELS[qos.fiveQi] ?? qos.qosLabel}`
}

function valueOrNull(value: number | null): number | null {
  return value === null || !Number.isFinite(value) ? null : value
}

function ratioLabel(qos: M2QosResult): string {
  if (qos.delayP99Ms === null || qos.packetDelayBudgetMs <= 0) return 'P99 / PDB: N/A'
  return `P99 / PDB: ${number.format(qos.delayP99Ms / qos.packetDelayBudgetMs)}×`
}

export interface M3VerticalQosLatencyChartProps {
  rows: readonly M2QosResult[]
  chartId?: string
}

export function M3VerticalQosLatencyChart({
  rows,
  chartId = 'm3-qos-latency-vertical-chart',
}: M3VerticalQosLatencyChartProps) {
  const labels = rows.map(shortLabel)
  const customData = rows.map((qos) => [
    qos.qosLabel,
    qos.resourceType,
    qos.packetDelayBudgetMs,
    qos.latencySamplePackets,
    qos.delayP99Estimate.status,
  ])

  const chartData: ReadonlyArray<Record<string, unknown>> = [
    {
      type: 'bar',
      name: 'P50',
      x: labels,
      y: rows.map((qos) => valueOrNull(qos.delayP50Ms)),
      marker: { color: '#94a3b8' },
      texttemplate: '%{y:.0f}',
      textposition: 'outside',
      cliponaxis: false,
      customdata: customData,
      hovertemplate: '<b>%{x}</b><br>%{customdata[0]}<br>P50: %{y:.2f} ms<br>PDB: %{customdata[2]:.2f} ms<extra></extra>',
    },
    {
      type: 'bar',
      name: 'P95',
      x: labels,
      y: rows.map((qos) => valueOrNull(qos.delayP95Ms)),
      marker: { color: '#60a5fa' },
      texttemplate: '%{y:.0f}',
      textposition: 'outside',
      cliponaxis: false,
      customdata: customData,
      hovertemplate: '<b>%{x}</b><br>%{customdata[0]}<br>P95: %{y:.2f} ms<br>PDB: %{customdata[2]:.2f} ms<extra></extra>',
    },
    {
      type: 'bar',
      name: 'P99',
      x: labels,
      y: rows.map((qos) => valueOrNull(qos.delayP99Ms)),
      marker: {
        color: rows.map((qos) => (
          qos.delayP99Ms !== null && qos.delayP99Ms <= qos.packetDelayBudgetMs
            ? '#059669'
            : '#1d4ed8'
        )),
        line: {
          color: rows.map((qos) => (
            qos.delayP99Ms !== null && qos.delayP99Ms > qos.packetDelayBudgetMs
              ? '#dc2626'
              : '#047857'
          )),
          width: 2,
        },
      },
      texttemplate: '%{y:.0f}',
      textposition: 'outside',
      cliponaxis: false,
      customdata: customData,
      hovertemplate: '<b>%{x}</b><br>%{customdata[0]}<br>P99: %{y:.2f} ms<br>PDB: %{customdata[2]:.2f} ms<br>Örnek: %{customdata[3]}<extra></extra>',
    },
    {
      type: 'scatter',
      mode: 'markers+text',
      name: 'PDB hedefi',
      x: labels,
      y: rows.map((qos) => qos.packetDelayBudgetMs),
      marker: {
        color: '#dc2626',
        size: 13,
        symbol: 'diamond',
        line: { color: '#ffffff', width: 2 },
      },
      text: rows.map((qos) => `PDB ${number.format(qos.packetDelayBudgetMs)}`),
      textposition: 'top center',
      textfont: { color: '#991b1b', size: 10 },
      cliponaxis: false,
      customdata: customData,
      hovertemplate: '<b>%{x}</b><br>%{customdata[0]}<br>PDB hedefi: %{y:.2f} ms<extra></extra>',
    },
  ]

  const finiteValues = rows.flatMap((qos) => [
    qos.delayP50Ms,
    qos.delayP95Ms,
    qos.delayP99Ms,
    qos.packetDelayBudgetMs,
  ]).filter((value): value is number => value !== null && Number.isFinite(value))
  const yMaximum = Math.max(100, ...finiteValues) * 1.18

  return <article className="qos-chart-card qos-chart-card--wide m3-vertical-latency-card">
    <header>
      <div>
        <span>GECİKME KARŞILAŞTIRMASI</span>
        <h3>5QI sınıflarında P50, P95, P99 ve PDB hedefi</h3>
      </div>
      <small>Her 5QI bir sütun grubudur. Kırmızı elmas sınıfın PDB hedefini; sütunlar teslim edilen paketlerin gecikme yüzdeliklerini gösterir.</small>
    </header>

    <PlotlyChart
      id={chartId}
      ariaLabel="M3 5QI sınıflarında dikey P50 P95 P99 gecikme ve PDB hedefi karşılaştırması"
      minHeight={520}
      data={chartData}
      layout={{
        barmode: 'group',
        bargap: 0.26,
        bargroupgap: 0.08,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: '#fbfdff',
        font: { family: 'Inter, Segoe UI, sans-serif', color: '#334155', size: 12 },
        hovermode: 'closest',
        uniformtext: { minsize: 9, mode: 'hide' },
        legend: {
          orientation: 'h',
          x: 0,
          y: 1.15,
          xanchor: 'left',
          yanchor: 'bottom',
          bgcolor: 'rgba(255,255,255,.96)',
          bordercolor: '#dbe4ef',
          borderwidth: 1,
        },
        margin: { t: 94, r: 28, b: 92, l: 78 },
        xaxis: {
          title: { text: '5QI trafik sınıfı', standoff: 20 },
          categoryorder: 'array',
          categoryarray: labels,
          tickfont: { size: 12 },
          tickangle: 0,
          fixedrange: false,
        },
        yaxis: {
          title: { text: 'Gecikme (ms)', standoff: 18 },
          range: [0, yMaximum],
          rangemode: 'tozero',
          gridcolor: '#e2e8f0',
          zerolinecolor: '#cbd5e1',
          fixedrange: false,
        },
      }}
    />

    <div className="m3-latency-status-strip" aria-label="5QI P99 ve PDB durum özeti">
      {rows.map((qos) => {
        const available = qos.delayP99Ms !== null
        const withinTarget = available && qos.delayP99Ms! <= qos.packetDelayBudgetMs
        return <div
          key={`m3-latency-status-${qos.fiveQi}`}
          className={available ? (withinTarget ? 'is-good' : 'is-over') : 'is-na'}
        >
          <span>5QI {qos.fiveQi}</span>
          <strong>{ratioLabel(qos)}</strong>
          <small>{!available ? 'P99 hesaplanamadı' : withinTarget ? 'P99 hedef içinde' : 'P99 hedefi aşıyor'}</small>
        </div>
      })}
    </div>
  </article>
}
