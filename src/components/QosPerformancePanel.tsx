import type { CSSProperties } from 'react'
import type { M2QosResult, M2Result, PercentileStatus } from '../simulation/m2Types'
import { PlotlyChart } from './PlotlyChart'

const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })
const percent = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 })

const QOS_COLORS: Record<number, string> = {
  1: '#7c3aed',
  2: '#2563eb',
  6: '#0f766e',
  9: '#c2410c',
}

const QOS_SHORT_LABELS: Record<number, string> = {
  1: 'Ses',
  2: 'Canlı video',
  6: 'TCP / video',
  9: 'Best effort',
}

function qosColor(fiveQi: number): string {
  return QOS_COLORS[fiveQi] ?? '#475569'
}

function shortQosLabel(qos: M2QosResult): string {
  return `5QI ${qos.fiveQi} · ${QOS_SHORT_LABELS[qos.fiveQi] ?? qos.qosLabel}`
}

function statusLabel(status: PercentileStatus): string {
  if (status === 'sufficient') return 'Yeterli örnek'
  if (status === 'insufficient') return 'Örnek sayısı yetersiz'
  return 'Teslim gecikmesi örneği yok'
}

function ratioPercent(value: number | null): number | null {
  return value === null ? null : value * 100
}

function latencyLabel(value: number | null): string {
  return value === null ? 'N/A' : `${number.format(value)} ms`
}

function ratioLabel(value: number | null): string {
  return value === null ? 'N/A' : `%${percent.format(value * 100)}`
}

function queueSeverity(qos: M2QosResult): 'good' | 'warning' | 'critical' {
  if (qos.queuedPackets === 0) return 'good'
  if (qos.overdueQueuedPackets > 0 || qos.pdbViolationRatio >= 0.1) return 'critical'
  return 'warning'
}

export interface QosPerformancePanelProps {
  result: Pick<M2Result, 'qosResults'>
  chartIdPrefix?: string
  showLatencyChart?: boolean
}

export function QosPerformancePanel({
  result,
  chartIdPrefix = 'qos',
  showLatencyChart = true,
}: QosPerformancePanelProps) {
  const rows = result.qosResults
  const labels = rows.map(shortQosLabel)
  const customData = rows.map((qos) => [
    qos.qosLabel,
    qos.resourceType,
    qos.packetDelayBudgetMs,
    qos.latencySamplePackets,
    statusLabel(qos.delayP99Estimate.status),
  ])

  const latencyRangeTraces: ReadonlyArray<Record<string, unknown>> = rows.flatMap((qos) => {
    if (qos.delayP50Ms === null || qos.delayP99Ms === null) return []
    return [{
      type: 'scatter',
      mode: 'lines',
      x: [qos.delayP50Ms, qos.delayP99Ms],
      y: [shortQosLabel(qos), shortQosLabel(qos)],
      line: { color: qosColor(qos.fiveQi), width: 10 },
      opacity: 0.18,
      hoverinfo: 'skip',
      showlegend: false,
    }]
  })

  const latencyData: ReadonlyArray<Record<string, unknown>> = [
    ...latencyRangeTraces,
    {
      type: 'scatter',
      mode: 'markers',
      name: 'P50',
      x: rows.map((qos) => qos.delayP50Ms),
      y: labels,
      marker: { color: '#64748b', size: 11, symbol: 'circle', line: { color: '#ffffff', width: 1.5 } },
      customdata: customData,
      hovertemplate: '<b>%{y}</b><br>%{customdata[0]}<br>P50: %{x:.2f} ms<br>PDB: %{customdata[2]:.2f} ms<extra></extra>',
    },
    {
      type: 'scatter',
      mode: 'markers',
      name: 'P95',
      x: rows.map((qos) => qos.delayP95Ms),
      y: labels,
      marker: { color: '#2563eb', size: 12, symbol: 'diamond', line: { color: '#ffffff', width: 1.5 } },
      customdata: customData,
      hovertemplate: '<b>%{y}</b><br>%{customdata[0]}<br>P95: %{x:.2f} ms<br>PDB: %{customdata[2]:.2f} ms<extra></extra>',
    },
    {
      type: 'scatter',
      mode: 'markers',
      name: 'P99',
      x: rows.map((qos) => qos.delayP99Ms),
      y: labels,
      marker: { color: '#dc2626', size: 13, symbol: 'square', line: { color: '#ffffff', width: 1.5 } },
      customdata: customData,
      hovertemplate: '<b>%{y}</b><br>%{customdata[0]}<br>P99: %{x:.2f} ms<br>PDB: %{customdata[2]:.2f} ms<br>%{customdata[4]} · n=%{customdata[3]}<extra></extra>',
    },
    {
      type: 'scatter',
      mode: 'markers',
      name: 'PDB sınırı',
      x: rows.map((qos) => qos.packetDelayBudgetMs),
      y: labels,
      marker: { color: '#0f172a', size: 13, symbol: 'x', line: { color: '#0f172a', width: 2 } },
      customdata: customData,
      hovertemplate: '<b>%{y}</b><br>PDB sınırı: %{x:.2f} ms<extra></extra>',
    },
  ]

  const deliveryData: ReadonlyArray<Record<string, unknown>> = [
    {
      type: 'bar',
      orientation: 'h',
      name: 'Paket teslimi',
      y: labels,
      x: rows.map((qos) => qos.generatedPackets > 0 ? qos.deliveredPackets / qos.generatedPackets * 100 : null),
      marker: { color: '#2563eb' },
      texttemplate: '%{x:.1f}%',
      textposition: 'auto',
      customdata: rows.map((qos) => [qos.qosLabel, qos.deliveredPackets, qos.generatedPackets]),
      hovertemplate: '<b>%{y}</b><br>%{customdata[0]}<br>Paket teslimi: %{x:.1f}%<br>%{customdata[1]} / %{customdata[2]} paket<extra></extra>',
    },
    {
      type: 'bar',
      orientation: 'h',
      name: 'PDB uyumu',
      y: labels,
      x: rows.map((qos) => (1 - qos.pdbViolationRatio) * 100),
      marker: { color: '#0f766e' },
      texttemplate: '%{x:.1f}%',
      textposition: 'auto',
      customdata: rows.map((qos) => [qos.qosLabel, qos.pdbViolationPackets]),
      hovertemplate: '<b>%{y}</b><br>%{customdata[0]}<br>PDB uyumu: %{x:.1f}%<br>İhlal eden paket: %{customdata[1]}<extra></extra>',
    },
  ]

  const gbrRows = rows.filter((qos) => qos.resourceType === 'GBR')
  const gbrLabels = gbrRows.map(shortQosLabel)
  const gbrData: ReadonlyArray<Record<string, unknown>> = [
    {
      type: 'bar',
      orientation: 'h',
      name: 'Hedefi karşılayan UE',
      y: gbrLabels,
      x: gbrRows.map((qos) => ratioPercent(qos.gbrUeMeetingRatio)),
      marker: { color: '#7c3aed' },
      texttemplate: '%{x:.1f}%',
      textposition: 'auto',
      customdata: gbrRows.map((qos) => [qos.qosLabel, qos.gbrUeCount]),
      hovertemplate: '<b>%{y}</b><br>%{customdata[0]}<br>Hedefi karşılayan UE: %{x:.1f}%<br>%{customdata[1]} GBR UE<extra></extra>',
    },
    {
      type: 'bar',
      orientation: 'h',
      name: 'Ortalama karşılama',
      y: gbrLabels,
      x: gbrRows.map((qos) => ratioPercent(qos.gbrMeanFulfillmentRatio)),
      marker: { color: '#2563eb' },
      texttemplate: '%{x:.1f}%',
      textposition: 'auto',
      customdata: gbrRows.map((qos) => [qos.qosLabel]),
      hovertemplate: '<b>%{y}</b><br>%{customdata[0]}<br>Ortalama GBR karşılama: %{x:.1f}%<extra></extra>',
    },
    {
      type: 'bar',
      orientation: 'h',
      name: 'Toplam servis',
      y: gbrLabels,
      x: gbrRows.map((qos) => ratioPercent(qos.aggregateGbrServiceRatio)),
      marker: { color: '#c2410c' },
      texttemplate: '%{x:.1f}%',
      textposition: 'auto',
      customdata: gbrRows.map((qos) => [qos.qosLabel]),
      hovertemplate: '<b>%{y}</b><br>%{customdata[0]}<br>Toplam GBR servisi: %{x:.1f}%<extra></extra>',
    },
  ]

  return <div className="qos-performance">
    <div className="qos-performance__charts qos-performance__charts--clear">
      {showLatencyChart && <article className="qos-chart-card qos-chart-card--wide qos-latency-workspace">
        <header>
          <div>
            <span>GECİKME PROFİLİ</span>
            <h3>5QI sınıflarında yüzdelikler ve PDB hedefi</h3>
          </div>
          <small>Her mini panel kendi gecikme ölçeğini kullanır. Renkli bant P50–P99 aralığını, kesikli çizgi ilgili PDB hedefini gösterir.</small>
        </header>

        <div className="qos-latency-legend" aria-label="Gecikme profili gösterge açıklaması">
          <span><i className="is-band" />P50–P99 aralığı</span>
          <span><i className="is-p50" />P50</span>
          <span><i className="is-p95" />P95</span>
          <span><i className="is-p99" />P99</span>
          <span><i className="is-pdb" />PDB hedefi</span>
        </div>

        <div className="qos-latency-grid">
          {rows.map((qos) => {
            const p50 = qos.delayP50Ms
            const p95 = qos.delayP95Ms
            const p99 = qos.delayP99Ms
            const latencyMaximum = Math.max(p50 ?? 0, p95 ?? 0, p99 ?? 0)
            const scaleMaximum = Math.max(qos.packetDelayBudgetMs * 1.2, latencyMaximum * 1.08, 1)
            const position = (value: number | null) => value === null ? 0 : Math.min(100, value / scaleMaximum * 100)
            const p50Position = position(p50)
            const p95Position = position(p95)
            const p99Position = position(p99)
            const pdbPosition = position(qos.packetDelayBudgetMs)
            const bandLeft = Math.min(p50Position, p99Position)
            const bandWidth = Math.max(1.5, Math.abs(p99Position - p50Position))
            const p99Ratio = p99 === null || qos.packetDelayBudgetMs <= 0 ? null : p99 / qos.packetDelayBudgetMs
            const withinTarget = p99 !== null && p99 <= qos.packetDelayBudgetMs

            return <article
              key={`latency-${qos.fiveQi}`}
              className={`qos-latency-card ${withinTarget ? 'is-within-target' : 'is-over-target'}`}
              style={{ '--qos-color': qosColor(qos.fiveQi) } as CSSProperties}
            >
              <div className="qos-latency-card__header">
                <div className="qos-latency-card__identity">
                  <strong>5QI {qos.fiveQi}</strong>
                  <span>{QOS_SHORT_LABELS[qos.fiveQi] ?? qos.qosLabel}</span>
                </div>
                <span className="qos-latency-card__status">
                  {p99 === null ? 'P99 N/A' : withinTarget ? 'P99 hedef içinde' : `P99 = ${number.format(p99Ratio ?? 0)}× PDB`}
                </span>
              </div>

              <div className="qos-latency-card__values">
                <div><span>P50</span><b>{latencyLabel(p50)}</b></div>
                <div><span>P95</span><b>{latencyLabel(p95)}</b></div>
                <div><span>P99</span><b>{latencyLabel(p99)}</b></div>
                <div className="is-pdb"><span>PDB</span><b>{number.format(qos.packetDelayBudgetMs)} ms</b></div>
              </div>

              <div
                className="qos-latency-scale"
                role="img"
                aria-label={`5QI ${qos.fiveQi}: P50 ${latencyLabel(p50)}, P95 ${latencyLabel(p95)}, P99 ${latencyLabel(p99)}, PDB ${number.format(qos.packetDelayBudgetMs)} ms`}
              >
                <div className="qos-latency-scale__safe" style={{ width: `${pdbPosition}%` }} />
                <div className="qos-latency-scale__late" style={{ left: `${pdbPosition}%` }} />
                <div className="qos-latency-scale__band" style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }} />
                {p50 !== null && <i className="qos-latency-marker is-p50" style={{ left: `${p50Position}%` }} title={`P50: ${latencyLabel(p50)}`} />}
                {p95 !== null && <i className="qos-latency-marker is-p95" style={{ left: `${p95Position}%` }} title={`P95: ${latencyLabel(p95)}`} />}
                {p99 !== null && <i className="qos-latency-marker is-p99" style={{ left: `${p99Position}%` }} title={`P99: ${latencyLabel(p99)}`} />}
                <em className="qos-latency-scale__pdb" style={{ left: `${pdbPosition}%` }} title={`PDB: ${number.format(qos.packetDelayBudgetMs)} ms`}><span>PDB</span></em>
              </div>

              <div className="qos-latency-scale__axis" aria-hidden="true">
                <span>0 ms</span>
                <span style={{ left: `${pdbPosition}%` }}>PDB</span>
                <span>{number.format(scaleMaximum)} ms</span>
              </div>

              <footer>
                <span>{statusLabel(qos.delayP99Estimate.status)}</span>
                <span>n={qos.latencySamplePackets.toLocaleString('tr-TR')}</span>
                <span>PDB ihlali %{percent.format(qos.pdbViolationRatio * 100)}</span>
              </footer>
            </article>
          })}
        </div>

        <details className="qos-latency-detail">
          <summary>Etkileşimli ayrıntılı grafiği aç <small>zoom · pan · PNG</small></summary>
          <PlotlyChart
            id={`${chartIdPrefix}-latency-chart`}
            ariaLabel="5QI P50 P95 P99 gecikme dağılımı ve PDB hedefi"
            minHeight={430}
            data={latencyData}
            layout={{
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: '#fbfdff',
              font: { family: 'Inter, Segoe UI, sans-serif', color: '#334155', size: 12 },
              legend: { orientation: 'h', x: 0, y: -0.24, xanchor: 'left', yanchor: 'top', bgcolor: 'rgba(255,255,255,.94)' },
              margin: { t: 24, r: 34, b: 96, l: 132 },
              xaxis: { title: { text: 'Gecikme (ms)', standoff: 16 }, rangemode: 'tozero', gridcolor: '#e2e8f0', zeroline: false, fixedrange: false },
              yaxis: { title: { text: '' }, autorange: 'reversed', tickfont: { size: 12 }, fixedrange: false },
            }}
          />
        </details>
      </article>}

      <article className="qos-chart-card">
        <header>
          <div><span>PAKET SERVİSİ</span><h3>Teslim başarısı ve PDB uyumu</h3></div>
          <small>İki metrik bütün 5QI sınıflarında doğrudan karşılaştırılır.</small>
        </header>
        <PlotlyChart
          id={`${chartIdPrefix}-delivery-chart`}
          ariaLabel="5QI paket teslimi ve PDB uyumu karşılaştırması"
          minHeight={390}
          data={deliveryData}
          layout={{
            barmode: 'group',
            bargap: 0.28,
            bargroupgap: 0.08,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: '#fbfdff',
            font: { family: 'Inter, Segoe UI, sans-serif', color: '#334155', size: 12 },
            legend: { orientation: 'h', x: 0, y: -0.25, xanchor: 'left', yanchor: 'top', bgcolor: 'rgba(255,255,255,.94)' },
            margin: { t: 22, r: 30, b: 92, l: 128 },
            xaxis: { title: { text: 'Başarı oranı (%)', standoff: 16 }, range: [0, 100], dtick: 20, gridcolor: '#e2e8f0', fixedrange: false },
            yaxis: { title: { text: '' }, autorange: 'reversed', tickfont: { size: 12 }, fixedrange: false },
          }}
        />
      </article>

      <article className="qos-chart-card">
        <header>
          <div><span>GBR PERFORMANSI</span><h3>Yalnız GBR sınıfları</h3></div>
          <small>5QI 6 ve 9 Non-GBR olduğu için bu grafiğe eklenmez; N/A değerleri sıfıra çevrilmez.</small>
        </header>
        {gbrRows.length > 0 ? <PlotlyChart
          id={`${chartIdPrefix}-gbr-chart`}
          ariaLabel="GBR 5QI sınıflarında hedef karşılama ve toplam servis karşılaştırması"
          minHeight={390}
          data={gbrData}
          layout={{
            barmode: 'group',
            bargap: 0.3,
            bargroupgap: 0.08,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: '#fbfdff',
            font: { family: 'Inter, Segoe UI, sans-serif', color: '#334155', size: 12 },
            legend: { orientation: 'h', x: 0, y: -0.25, xanchor: 'left', yanchor: 'top', bgcolor: 'rgba(255,255,255,.94)' },
            margin: { t: 22, r: 30, b: 92, l: 128 },
            xaxis: { title: { text: 'GBR karşılama oranı (%)', standoff: 16 }, range: [0, 100], dtick: 20, gridcolor: '#e2e8f0', fixedrange: false },
            yaxis: { title: { text: '' }, autorange: 'reversed', tickfont: { size: 12 }, fixedrange: false },
          }}
        /> : <div className="qos-empty-state" role="status">
          <strong>Bu koşulda GBR sınıfı yok.</strong>
          <span>GBR karşılaştırması yalnız pozitif GBR hedefli 5QI sınıflarında hesaplanır.</span>
        </div>}
      </article>
    </div>

    <div className="m2-qos-list m2-qos-list--cards">
      {rows.map((qos) => {
        const deliveryRatio = qos.generatedPackets > 0 ? qos.deliveredPackets / qos.generatedPackets : null
        const latencyValues = [qos.delayP50Ms, qos.delayP95Ms, qos.delayP99Ms]
        const scaleMax = Math.max(qos.packetDelayBudgetMs * 1.15, ...latencyValues.map((value) => value ?? 0), 1)
        const markerLeft = Math.min(100, qos.packetDelayBudgetMs / scaleMax * 100)
        const latencyRows = [
          ['P50', qos.delayP50Ms, qos.delayP50Estimate.status],
          ['P95', qos.delayP95Ms, qos.delayP95Estimate.status],
          ['P99', qos.delayP99Ms, qos.delayP99Estimate.status],
        ] as const
        const isGbr = qos.resourceType === 'GBR'
        const severity = queueSeverity(qos)
        return <article key={qos.fiveQi} className={`m2-qos-card ${isGbr ? 'is-gbr' : 'is-non-gbr'}`} style={{ '--qos-color': qosColor(qos.fiveQi) } as CSSProperties}>
          <header className="m2-qos-card__header">
            <div className="m2-qos-identity"><span>5QI</span><strong>{qos.fiveQi}</strong></div>
            <div className="m2-qos-title"><b>{qos.qosLabel}</b><small>{qos.ueCount} UE · PDB {number.format(qos.packetDelayBudgetMs)} ms</small></div>
            <span className={`m2-qos-type ${isGbr ? 'gbr' : 'non-gbr'}`}>{qos.resourceType}</span>
          </header>

          <div className="m2-qos-kpis">
            <div><span>Paket teslimi</span><strong>{deliveryRatio === null ? 'N/A' : `%${percent.format(deliveryRatio * 100)}`}</strong><small>{qos.deliveredPackets.toLocaleString('tr-TR')} / {qos.generatedPackets.toLocaleString('tr-TR')} paket</small></div>
            <div><span>GBR karşılayan UE</span><strong>{ratioLabel(qos.gbrUeMeetingRatio)}</strong><small>{qos.gbrUeCount === 0 ? 'Non-GBR sınıfı' : `${qos.gbrUeCount} GBR UE`}</small></div>
            <div><span>Ortalama GBR</span><strong>{ratioLabel(qos.gbrMeanFulfillmentRatio)}</strong><small>Talep sınırlı hedef</small></div>
            <div><span>Toplam GBR servisi</span><strong>{ratioLabel(qos.aggregateGbrServiceRatio)}</strong><small>Toplam hedefe göre</small></div>
          </div>

          <section className="m2-latency-profile" aria-label={`5QI ${qos.fiveQi} gecikme profili`}>
            <div className="m2-latency-heading"><span>Teslim gecikmesi</span><b>PDB {number.format(qos.packetDelayBudgetMs)} ms</b></div>
            {latencyRows.map(([label, value, status]) => {
              const width = value === null ? 0 : Math.min(100, value / scaleMax * 100)
              const exceeded = value !== null && value > qos.packetDelayBudgetMs
              return <div className={`m2-latency-row${exceeded ? ' exceeded' : ''}`} key={label}>
                <span>{label}</span>
                <div className="m2-latency-track" style={{ '--pdb-position': `${markerLeft}%` } as CSSProperties} title={`${label}: ${latencyLabel(value)} · PDB: ${number.format(qos.packetDelayBudgetMs)} ms`}>
                  <i style={{ width: `${width}%` }} />
                  <em aria-hidden="true" />
                </div>
                <b>{latencyLabel(value)}</b>
                <small>{statusLabel(status)}</small>
              </div>
            })}
          </section>

          <footer>
            <span className={`qos-status-pill qos-status-pill--${severity}`}>{qos.queuedPackets.toLocaleString('tr-TR')} kuyrukta</span>
            <span>{qos.latencySamplePackets.toLocaleString('tr-TR')} gecikme örneği</span>
            <span>PDB ihlali %{percent.format(qos.pdbViolationRatio * 100)}</span>
            <span>En yaşlı paket {number.format(qos.oldestQueuedPacketAgeMs)} ms</span>
          </footer>
        </article>
      })}
    </div>
  </div>
}
