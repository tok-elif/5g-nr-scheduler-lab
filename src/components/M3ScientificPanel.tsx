import { useEffect, useMemo, useState } from 'react'
import {
 seedsForRole,
 type ExperimentSeedRole,
} from '../config/m3ExperimentProtocol'
import { downloadText } from '../exports/download'
import {
 createM3ScientificPairwiseCsv,
 createM3ScientificRawCsv,
 createM3ScientificSummaryCsv,
} from '../exports/m3ExperimentSerialize'
import { serializeM3ExperimentCanonical } from '../exports/m3ExperimentCanonical'
import { useM3ExperimentWorker } from '../hooks/useM3ExperimentWorker'
import { formatMetricValue, type KpiDescriptor } from '../metrics/kpiDescriptors'
import { getSchedulerDescriptor } from '../schedulers/metadata'
import type { M2Config } from '../simulation/m2Types'
import type {
 M3PairwiseRow,
 M3QosMetrics,
 M3SummaryRow,
 SampleStatistics,
} from '../simulation/m3Experiment'
import type { ScenarioConfig } from '../simulation/types'
import {
 aggregateQosP99,
 classifyDifference,
 heatmapDifference,
 practicalThreshold,
 SCIENTIFIC_KPIS,
 type ScientificMetricName,
} from './m3ScientificHelpers'
import { PlotlyChart } from './PlotlyChart'
import { LatexFormula } from './LatexFormula'
import { CELL_CONFIGS } from '../config/cells'
import { M3_SCHEDULERS } from '../m3Schedulers'
import { schedulerChartStyle } from './schedulerChartStyle'
function ciText(statistics: SampleStatistics, descriptor: KpiDescriptor): string {
 if (statistics.mean === null) return 'N/A'
 return `${formatMetricValue(descriptor, statistics.mean)} · %95 GA [${formatMetricValue(descriptor,statistics.confidence95Low)}, ${formatMetricValue(descriptor, statistics.confidence95High)}] ·n=${statistics.sampleCount}`
}
function m3SchedulerStyle(kind: string) {
 const scheduler = M3_SCHEDULERS.find((item) => item.kind === kind)
 return schedulerChartStyle(kind, scheduler?.color)
}
function m3SchedulerShortLabel(kind: string, fallback: string): string {
 return M3_SCHEDULERS.find((item) => item.kind === kind)?.shortLabel ?? fallback
}
function ThroughputFairnessFigure({ rows }: { rows: M3SummaryRow[] }) {
 const valid = rows.filter((row) =>
   row.metrics.cellThroughputMbps.mean !== null && row.metrics.jainFairness.mean !== null)
 if (valid.length === 0) return <p className='empty-state'>Bu filtre için çizilebilir değer yok.</p>
 const data = valid.map((row) => {
   const style = m3SchedulerStyle(row.scheduler)
   const throughput = row.metrics.cellThroughputMbps
   const fairness = row.metrics.jainFairness
   return {
     type:'scatter',
     mode:'markers+text',
     name:row.schedulerLabel,
     x:[throughput.mean],
     y:[fairness.mean],
     text:[m3SchedulerShortLabel(row.scheduler, row.schedulerLabel)],
     textposition:style.textPosition,
     textfont:{ color:style.color, size:12 },
     cliponaxis:false,
     marker:{
       size:style.size,
       color:style.color,
       symbol:style.symbol,
       line:{ color:style.color, width:style.symbol.includes('open') ? 3 : 1.5 },
       opacity:0.98,
     },
     error_x:{
       type:'data',
       symmetric:false,
       array:[(throughput.confidence95High as number) -(throughput.mean as number)],
       arrayminus:[(throughput.mean as number) - (throughput.confidence95Low as number)],
       visible:true,
       color:style.color,
       thickness:1.8,
       width:5,
     },
     error_y:{
       type:'data',
       symmetric:false,
       array:[(fairness.confidence95High as number) -(fairness.mean as number)],
       arrayminus:[(fairness.mean as number) -(fairness.confidence95Low as number)],
       visible:true,
       color:style.color,
       thickness:1.8,
       width:5,
     },
     customdata:[[throughput.confidence95Low,throughput.confidence95High,fairness.confidence95Low,fairness.confidence95High]],
     hovertemplate:'<b>%{fullData.name}</b><br>Throughput: %{x:.3f} Mbps<br>Throughput %95 GA: [%{customdata[0]:.3f}, %{customdata[1]:.3f}]<br>Jain: %{y:.4f}<br>Jain %95 GA: [%{customdata[2]:.4f}, %{customdata[3]:.4f}]<extra></extra>',
   }
 })
 return <PlotlyChart data={data} layout={{
   xaxis:{ title:'Hücre throughput (Mbps)', gridcolor:'#e5e7eb' },
   yaxis:{ title:'Jain adalet indeksi', gridcolor:'#e5e7eb' },
   legend:{ orientation:'h', y:1.14 },
   margin:{ t:85,r:45,b:70,l:80 },
   hovermode:'closest',
 }} ariaLabel='Renk ve sembolleri ayrılmış throughput ve Jain adalet güven aralığı grafiği' minHeight={520} />
}
function ForestFigure({
 rows,
 metric,
 baselineMeans,
 selectedConditionKey,
}: {
 rows: M3PairwiseRow[]
 metric: ScientificMetricName
 baselineMeans: Map<string, number | null>
 selectedConditionKey: string
}) {
 const descriptor = SCIENTIFIC_KPIS[metric]
 const valid = rows
   .filter((row) => row.metrics[metric].mean !== null)
   .sort((a, b) => a.normalizedOfferedLoad - b.normalizedOfferedLoad
     || a.cell.bandwidthMHz - b.cell.bandwidthMHz)
 if (valid.length === 0) return <p className='empty-state'>Bu KPI bu koşullarda uygulanabilir değil.</p>

 const labels = valid.map((row) => `${row.cell.id} · ${row.cell.bandwidthMHz} MHz · ρ=${row.normalizedOfferedLoad.toFixed(2)}`)
 const thresholds = valid.map((row) => practicalThreshold(
   metric,
   baselineMeans.get(`${row.loadProfileId}|${row.cell.id}`) ?? null,
 ))

 const thresholdX: Array<number | null> = []
 const thresholdY: Array<string | null> = []
 valid.forEach((_row, index) => {
   const label = labels[index]
   thresholdX.push(-thresholds[index], thresholds[index], null)
   thresholdY.push(label, label, null)
 })

 const data: Record<string, unknown>[] = [{
   type: 'scatter',
   mode: 'lines',
   name: 'Pratik önem aralığı',
   x: thresholdX,
   y: thresholdY,
   line: { color: 'rgba(148,163,184,.42)', width: 16 },
   hoverinfo: 'skip',
   showlegend: true,
 }]

 valid.forEach((row, index) => {
   const statistics = row.metrics[metric]
   const mean = statistics.mean as number
   const low = statistics.confidence95Low as number
   const high = statistics.confidence95High as number
   const conditionKey = `${row.loadProfileId}|${row.cell.id}`
   const selected = conditionKey === selectedConditionKey
   data.push({
     type: 'scatter',
     mode: 'markers',
     name: selected ? 'Seçili koşul' : row.cell.id,
     x: [mean],
     y: [labels[index]],
     marker: {
       size: selected ? 15 : 11,
       color: selected ? '#d49a15' : '#315d9b',
       symbol: selected ? 'diamond' : 'circle',
       line: { color: '#ffffff', width: 2 },
     },
     error_x: {
       type: 'data',
       symmetric: false,
       array: [high - mean],
       arrayminus: [mean - low],
       visible: true,
       thickness: 2,
       width: 6,
       color: selected ? '#a16207' : '#315d9b',
     },
     customdata: [[
       low,
       high,
       thresholds[index],
       row.comparatorSchedulerLabel,
       row.baselineSchedulerLabel,
       row.loadProfileLabel,
       row.cell.resourceBlocks,
     ]],
     hovertemplate: '<b>%{y}</b><br>Fark: %{x:.4f}<br>%95 GA: [%{customdata[0]:.4f}, %{customdata[1]:.4f}]<br>Pratik eşik: ±%{customdata[2]:.4f}<br>%{customdata[3]} − %{customdata[4]}<br>Yük: %{customdata[5]}<br>RB: %{customdata[6]}<extra></extra>',
     showlegend: selected,
   })
 })
 const endpointX: number[] = []
 const endpointY: string[] = []
 const endpointCustom: Array<[string, number, number, string, string]> = []
 const endpointColors: string[] = []
 valid.forEach((row, index) => {
   const statistics = row.metrics[metric]
   const low = statistics.confidence95Low as number
   const high = statistics.confidence95High as number
   const selected = `${row.loadProfileId}|${row.cell.id}` === selectedConditionKey
   endpointX.push(low, high)
   endpointY.push(labels[index], labels[index])
   endpointCustom.push(
     ['Alt %95 güven sınırı', low, high, row.comparatorSchedulerLabel, row.baselineSchedulerLabel],
     ['Üst %95 güven sınırı', low, high, row.comparatorSchedulerLabel, row.baselineSchedulerLabel],
   )
   endpointColors.push(selected ? '#a16207' : '#315d9b', selected ? '#a16207' : '#315d9b')
 })
 data.push({
   type:'scatter',
   mode:'markers',
   name:'%95 GA sınırları',
   x:endpointX,
   y:endpointY,
   marker:{ symbol:'line-ns', size:15, color:endpointColors, line:{ width:3 } },
   customdata:endpointCustom,
   hovertemplate:'<b>%{y}</b><br>%{customdata[0]}: %{x:.4f}<br>Tam %95 GA: [%{customdata[1]:.4f}, %{customdata[2]:.4f}]<br>%{customdata[3]} − %{customdata[4]}<extra></extra>',
   showlegend:false,
 })


 return <PlotlyChart
   data={data}
   layout={{
     xaxis: {
       title: `${descriptor.label} için aday − baseline${descriptor.unit ? ` (${descriptor.unit})` : ''}`,
       zeroline: false,
       gridcolor: '#e5e7eb',
     },
     yaxis: {
       automargin: true,
       autorange: 'reversed',
       categoryorder: 'array',
       categoryarray: labels,
       tickfont: { size: 11 },
     },
     shapes: [{
       type: 'line',
       x0: 0,
       x1: 0,
       y0: 0,
       y1: 1,
       yref: 'paper',
       line: { color: '#475569', width: 2, dash: 'dash' },
     }],
     legend: { orientation: 'h', y: 1.07 },
     margin: { t: 70, r: 35, b: 80, l: 260 },
     hovermode: 'closest',
   }}
   ariaLabel='Hücre ve yük koşullarına göre eşleştirilmiş fark forest grafiği'
   minHeight={Math.max(620, 210 + valid.length * 42)}
 />
}
function LoadResponseFigure({
 rows,
 metric,
 candidate,
 baseline,
}: {
 rows: M3SummaryRow[]
 metric: ScientificMetricName
 candidate: string
 baseline: string
}) {
 const schedulerKinds = [baseline, candidate]
 const plotRows = rows
   .filter((row) => schedulerKinds.includes(row.scheduler))
   .sort((a, b) => a.normalizedOfferedLoad - b.normalizedOfferedLoad)
 if (!plotRows.some((row) => row.metrics[metric].mean !== null)) {
   return <p className='empty-state'>Yük cevabı için uygulanabilir değer yok.</p>
 }
 const data = schedulerKinds.map((kind) => {
   const schedulerRows = plotRows.filter((row) => row.scheduler === kind && row.metrics[metric].mean !== null)
   const means = schedulerRows.map((row) => row.metrics[metric].mean as number)
   const style = m3SchedulerStyle(kind)
   const isBaseline = kind === baseline
   const labels = schedulerRows.map((_, index) => index === schedulerRows.length - 1
     ? m3SchedulerShortLabel(kind, schedulerRows[0]?.schedulerLabel ?? kind)
     : '')
   return {
     type:'scatter',
     mode:'lines+markers+text',
     connectgaps:false,
     name:schedulerRows[0]?.schedulerLabel ?? kind,
     x:schedulerRows.map((row) => row.normalizedOfferedLoad),
     y:means,
     text:labels,
     textposition:style.textPosition,
     textfont:{ color:style.color, size:11 },
     cliponaxis:false,
     line:{
       color:style.color,
       width:isBaseline ? 7 : 3.5,
       dash:isBaseline ? style.dash : 'solid',
     },
     opacity:isBaseline ? 0.48 : 1,
     marker:{
       size:isBaseline ? style.size + 5 : style.size,
       color:style.color,
       symbol:style.symbol,
       line:{ color:style.color, width:style.symbol.includes('open') ? 3 : 1.5 },
     },
     error_y:{
       type:'data',
       symmetric:false,
       array:schedulerRows.map((row,index) => (row.metrics[metric].confidence95High as number)-means[index]),
       arrayminus:schedulerRows.map((row,index) => means[index]-(row.metrics[metric].confidence95Low as number)),
       visible:true,
       color:style.color,
       thickness:1.7,
       width:5,
     },
     customdata:schedulerRows.map((row) => [row.metrics[metric].confidence95Low,row.metrics[metric].confidence95High,row.loadProfileId]),
     hovertemplate:'<b>%{fullData.name}</b><br>Normalize yük: %{x:.3f}<br>Değer: %{y:.4f}<br>%95 GA: [%{customdata[0]:.4f}, %{customdata[1]:.4f}]<br>Profil: %{customdata[2]}<extra></extra>',
   }
 })
 const descriptor=SCIENTIFIC_KPIS[metric]
 return <PlotlyChart data={data} layout={{
   xaxis:{ title:'Normalize sunulan yük = offeredLoad / capacityReference', gridcolor:'#e5e7eb' },
   yaxis:{ title:`${descriptor.label}${descriptor.unit?` (${descriptor.unit})`:''}`, gridcolor:'#e5e7eb' },
   legend:{ orientation:'h',y:1.14 },
   margin:{ t:85,r:45,b:80,l:90 },
   hovermode:'x unified',
 }} ariaLabel='Çakışan çizgileri halo, sembol ve etiketlerle ayıran normalize yük KPI cevabı' minHeight={540} />
}
function QosLatencyFigure({
 qos,
 candidate,
 baseline,
}: {
 qos: Array<{ scheduler: string; schedulerLabel: string; metrics: M3QosMetrics }>
 candidate: string
 baseline: string
}) {
 const fiveQis = [...new Set(qos.map((item) => item.metrics.fiveQi))].sort((a, b) => a - b)
 const schedulerKinds = [candidate, baseline]
 const aggregates = fiveQis.flatMap((fiveQi) => schedulerKinds.map((scheduler) => {
   const matching = qos.filter((item) => item.scheduler === scheduler && item.metrics.fiveQi === fiveQi)
   const p99 = aggregateQosP99(matching.map((item) => item.metrics))
   return {
     fiveQi,
     scheduler,
     label: matching[0]?.schedulerLabel ?? scheduler,
     p99: p99.displayableMean,
     p99Status: p99.status,
     sufficientCount: p99.sufficientCount,
     totalCount: p99.totalCount,
     pdb: matching[0]?.metrics.packetDelayBudgetMs ?? 0,
   }
 }))
 if (fiveQis.length === 0) return <p className='empty-state'>5QI gecikme verisi yok.</p>
 const data:Record<string,unknown>[] = schedulerKinds.map((scheduler,schedulerIndex) => {
   const items=aggregates.filter((item)=>item.scheduler===scheduler)
   return { type:'bar', name:items[0]?.label ?? scheduler, x:items.map((item)=>`5QI ${item.fiveQi}`), y:items.map((item)=>item.p99), marker:{ color:schedulerIndex===0?'#315d9b':'#b45309' }, customdata:items.map((item)=>[item.pdb,item.p99Status,item.sufficientCount,item.totalCount]), hovertemplate:'<b>%{fullData.name} · %{x}</b><br>P99: %{y:.3f} ms<br>PDB: %{customdata[0]:.3f} ms<br>Durum: %{customdata[1]}<br>Yeterli örnek: %{customdata[2]}/%{customdata[3]}<extra></extra>' }
 })
 data.push({ type:'scatter', mode:'lines+markers', name:'5QI PDB', x:fiveQis.map((fiveQi)=>`5QI ${fiveQi}`), y:fiveQis.map((fiveQi)=>aggregates.find((item)=>item.fiveQi===fiveQi)?.pdb ?? 0), line:{ color:'#dc2626',dash:'dash', width:2 }, marker:{ size:7 }, hovertemplate:'<b>%{x}</b><br>PDB sınırı: %{y:.3f} ms<extra></extra>' })
 return <PlotlyChart data={data} layout={{ barmode:'group', xaxis:{ title:'5QI sınıfı' }, yaxis:{ title:'Gecikme(ms)',rangemode:'tozero',gridcolor:'#e5e7eb' }, legend:{ orientation:'h',y:1.12 }, margin:{ t:70,r:30,b:70,l:80 } }}
ariaLabel='5QI bazında P99 gecikme ve PDB grafiği' minHeight={500} />
}
const ROLE_LABELS = {
 baseline: 'Karşılaştırma tabanı',
 literature: 'Literatür algoritması',
 'literature-adaptation': 'Literatür uyarlaması',
 'project-proposal': 'Proje prototipi',
 ablation: 'Ablation varyantı',
} as const

function AlgorithmDetail({ scheduler }: { scheduler: string }) {
 const descriptor = getSchedulerDescriptor(scheduler)
 return <article className='m3-method-card m3-algorithm-detail m3-algorithm-detail--scientific'>
   <header className='m3-method-card__header'>
     <div>
       <span className='m3-method-card__eyebrow'>SCHEDULER TEKNİK KARTI</span>
       <h2>{descriptor.displayName}</h2>
       <p>Uygulanan karar metriği, literatür dayanağı ve bu simülatördeki model sınırları ayrı gösterilir.</p>
     </div>
     <span className={`m3-role-badge m3-role-badge--${descriptor.role}`}>{ROLE_LABELS[descriptor.role]}</span>
   </header>

   <div className='m3-method-card__body'>
     <section className='m3-formula-block'>
       <div className='m3-formula-block__title'>
         <span>Uygulanan karar metriği</span>
         <small>Kaynak kodla aynı ifade</small>
       </div>
       <LatexFormula
         latex={descriptor.implementedFormulaLatex}
         ariaLabel={`${descriptor.displayName} uygulanan karar metriği`}
       />
       <details className='m3-latex-source'>
         <summary>LaTeX kaynak kodunu göster</summary>
         <code>{descriptor.implementedFormulaLatex}</code>
       </details>
       {descriptor.formulaSymbols.length > 0 && <div className='m3-symbol-legend'>
         {descriptor.formulaSymbols.map((item) => <span key={item.symbol}>
           <b>{item.symbol}</b>{item.meaning}
         </span>)}
       </div>}
       {descriptor.originalFormulaLatex && <details className='m3-original-formula'>
         <summary>Literatürdeki temel formül</summary>
         <LatexFormula
           latex={descriptor.originalFormulaLatex}
           ariaLabel={`${descriptor.displayName} literatürdeki temel formül`}
         />
         <code>{descriptor.originalFormulaLatex}</code>
       </details>}
     </section>

     <div className='m3-method-grid'>
       <article><span>Metric hesaplama</span><strong>{descriptor.metricRecomputationPolicy === 'slot_start' ? 'Her slotun başında' : 'Her RB kararında'}</strong></article>
       <article><span>State güncelleme</span><strong>{descriptor.stateUpdatePolicy}</strong></article>
     </div>

     {descriptor.parameters.length > 0 && <section className='m3-parameter-grid' aria-label='Scheduler parametreleri'>
       {descriptor.parameters.map((parameter) => <article key={parameter.id}>
         <span>{parameter.label}</span>
         <strong>{parameter.value}{parameter.unit ? ` ${parameter.unit}` : ''}</strong>
         <small>{parameter.description}</small>
       </article>)}
     </section>}

     <div className='m3-evidence-grid'>
       <section>
         <h3>Model uyarlamaları</h3>
         {descriptor.adaptations.length > 0
           ? <ul>{descriptor.adaptations.map((item) => <li key={item}>{item}</li>)}</ul>
           : <p>Ek uyarlama yok.</p>}
       </section>
       <section>
         <h3>Geçerlilik sınırları</h3>
         <ul>{descriptor.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
       </section>
     </div>

     {descriptor.source && <footer className='m3-source-note'>
       <span>Bilimsel dayanak</span>
       <strong>{descriptor.source.citation}</strong>
       <small>{descriptor.source.title}</small>
     </footer>}
   </div>
 </article>
}
export function M3ScientificPanel({
 baseScenario,
 config,
 initialSeedCount,
}: {
 baseScenario: ScenarioConfig
 config: M2Config
 initialSeedCount: number
}) {
 const worker = useM3ExperimentWorker()
 const [seedRole, setSeedRole] = useState<ExperimentSeedRole>('development')
 const [seedCount, setSeedCount] = useState(Math.min(initialSeedCount, seedsForRole('development').length))
 const [experimentUeCount, setExperimentUeCount] = useState(Math.min(100, Math.max(1, baseScenario.ueCount)))
 useEffect(() => setExperimentUeCount(Math.min(100, Math.max(1, baseScenario.ueCount))), [baseScenario.ueCount])
 const [scenario, setScenario] = useState('sc2-mixed-qos')
 const [loadProfile, setLoadProfile] = useState('capacity-80')
 const [cellId, setCellId] = useState(CELL_CONFIGS[CELL_CONFIGS.length - 1]?.id ?? '')
 const [baseline, setBaseline] = useState('m-lwdf')
 const [candidate, setCandidate] = useState('qdf-pf')
 const [metric, setMetric] = useState<ScientificMetricName>('cellThroughputMbps')
 const result = worker.data?.result
 const pairwiseOptions = useMemo(() => result
   ? [...new Set(result.pairwiseRows
     .filter((row) => row.baselineScheduler === baseline)
     .map((row) => row.comparatorScheduler))]
   : ['qdf-pf'], [result, baseline])
 const activeCandidate = pairwiseOptions.includes(candidate) ? candidate : pairwiseOptions[0] ?? candidate
 const conditionRows = result?.summaryRows.filter((row) =>
   row.scenarioKind === scenario
   && row.loadProfileId === loadProfile
   && row.cell.id === cellId) ?? []
 const loadRows = result?.summaryRows.filter((row) =>
   row.scenarioKind === scenario && row.cell.id === cellId) ?? []
 const forestRows = result?.pairwiseRows.filter((row) =>
   row.scenarioKind === scenario
   && row.baselineScheduler === baseline
   && row.comparatorScheduler === activeCandidate) ?? []
 const selectedPairwise = result?.pairwiseRows.find((row) =>
   row.scenarioKind === scenario
   && row.loadProfileId === loadProfile
   && row.cell.id === cellId
   && row.baselineScheduler === baseline
   && row.comparatorScheduler === activeCandidate)
 const baselineCondition = conditionRows.find((row) => row.scheduler === baseline)
 const candidateCondition = conditionRows.find((row) => row.scheduler === activeCandidate)
 const baselineMeans = new Map((result?.summaryRows ?? [])
   .filter((row) => row.scenarioKind === scenario
     && row.scheduler === baseline)
   .map((row) => [`${row.loadProfileId}|${row.cell.id}`, row.metrics[metric].mean]))
 const rawQos = result?.rawRuns
   .filter((run) => run.scenarioKind === scenario
     && run.loadProfileId === loadProfile
     && run.cell.id === cellId
     && [activeCandidate, baseline].includes(run.scheduler))
   .flatMap((run) => run.qosMetrics.map((metrics) => ({
     scheduler: run.scheduler,
     schedulerLabel: run.schedulerLabel,
     metrics,
   }))) ?? []
 const run = () => worker.run({
   baseScenario: { ...baseScenario, ueCount: experimentUeCount },
   m2Config: config,
   seedCount,
   seedRole,
 })
 const updateSeedRole = (role: ExperimentSeedRole) => {
   setSeedRole(role)
   setSeedCount((current) => Math.min(current, seedsForRole(role).length))
 }
 return <section className='m3-scientific-shell'>
   <header className='m3-science-header'>
     <div>
       <span>M3 · BİLİMSEL KARŞILAŞTIRMA</span>
       <h2>Aday scheduler karşılaştırması</h2>
       <p>Önceden tanımlı seed listeleri, ortak trafik/SINR realizasyonu, eşleştirilmiş farklar ve Student-t %95 güven aralığı.</p>
     </div>
     <div className='m3-run-controls'>
       <label>Seed rolü
         <select value={seedRole} onChange={(event) => updateSeedRole(event.target.value as ExperimentSeedRole)}>
           <option value='development'>Development</option>
           <option value='evaluation'>Evaluation</option>
         </select>
       </label>
       <label>Seed sayısı
         <input type='number' min='2' max={seedsForRole(seedRole).length} value={seedCount}
           onChange={(event) => setSeedCount(Math.max(2, Math.min(seedsForRole(seedRole).length, Number(event.target.value))))} />
       </label>
       <label title='10 yalnız başlangıç değeridir; bilimsel deney 1–100 UE kabul eder.'>UE sayısı
         <input type='number' min='1' max='100' value={experimentUeCount}
           onChange={(event) => setExperimentUeCount(Math.max(1, Math.min(100, Math.round(Number(event.target.value) || 1))))} />
       </label>
       <button type='button' disabled={worker.status === 'running'} onClick={run}>
         {worker.status === 'running' ? 'Deney çalışıyor…' : 'Bilimsel deneyi çalıştır'}
       </button>
     </div>
   </header>
   {worker.status === 'idle' && <p className='model-note'>Sonuç üretmek için deneyi çalıştırın. Development seedleri yöntem geliştirme; evaluation seedleri kilitli son değerlendirme içindir.</p>}
   {worker.status === 'error' && <p className='integrity-fail'>{worker.error}</p>}
   {result && <div className={`integrity-banner ${result.allIntegrityChecksPassed ? 'passed' : 'failed'}`}>
     <strong>{result.allIntegrityChecksPassed ? 'Bütünlük kontrolleri geçti' : 'Bütünlük kontrolü başarısız — sonuçyorumu durduruldu'}</strong>
     <span>{result.seedRole} · {result.request.baseScenario.ueCount} UE · {result.seeds.length} seed · {result.seedListFingerprint}</span>
     <div>{result.integrityChecks.map((check) => <span key={check.id} title={check.detail}>{check.passed ? '✓' : '✕'} {check.label}</span>)}</div>
   </div>}
   {result && result.allIntegrityChecksPassed && <>
     <div className='m3-filter-grid'>
       <label>Senaryo<select value={scenario} onChange={(event) => setScenario(event.target.value)}>
         {result.scenarioDefinitions.map((item) => <option key={item.kind} value={item.kind}>{item.label}</option>)}
       </select></label>
       <label>Normalize yük<select value={loadProfile} onChange={(event) => setLoadProfile(event.target.value)}>
         {[...new Map(result.summaryRows.map((row) => [row.loadProfileId, row.loadProfileLabel])).entries()]
           .map(([id, label]) => <option key={id} value={id}>{label}</option>)}
       </select></label>
       <label>Hücre<select value={cellId} onChange={(event) => setCellId(event.target.value)}>
         {[...new Map(result.summaryRows.map((row) => [row.cell.id, row.cell.id + ' · ' + row.cell.bandwidthMHz + 'MHz'])).entries()]
           .map(([id, label]) => <option key={id} value={id}>{label}</option>)}
       </select></label>
       <label>Baseline<select value={baseline} onChange={(event) => setBaseline(event.target.value)}>
         {[...new Map(result.pairwiseRows.map((row) => [row.baselineScheduler, row.baselineSchedulerLabel])).entries()]
           .map(([id, label]) => <option key={id} value={id}>{label}</option>)}
       </select></label>
       <label>Aday<select value={activeCandidate} onChange={(event) => setCandidate(event.target.value)}>
         {pairwiseOptions.map((id) => <option key={id} value={id}>{result.summaryRows.find((row) => row.scheduler === id)?.schedulerLabel ?? id}</option>)}
       </select></label>
       <label>KPI<select value={metric} onChange={(event) => setMetric(event.target.value as ScientificMetricName)}>
         {(Object.keys(SCIENTIFIC_KPIS) as ScientificMetricName[]).map((id) => <option key={id} value={id}> {SCIENTIFIC_KPIS[id].label}</option>)}
       </select></label>
     </div>
     <section className='panel m3-condition-summary'>
       <header><div><h2>Koşula bağlı sonuç</h2><p>Fark yönü daima aday − baseline; “daha iyi” yönü KPI metadata’sından alınır.</p></div></header>
       <strong>{classifyDifference(selectedPairwise, metric, baselineCondition?.metrics[metric].mean ?? null)}</strong>
       <div className='m3-summary-cards'>
         <article><span>Aday</span><b>{candidateCondition?.schedulerLabel ?? activeCandidate}</b><small>{ candidateCondition ? ciText(candidateCondition.metrics[metric], SCIENTIFIC_KPIS[metric]) : 'N/A'}</small></article>
         <article><span>Baseline</span><b>{baselineCondition?.schedulerLabel ?? baseline}</b><small>{
baselineCondition ? ciText(baselineCondition.metrics[metric], SCIENTIFIC_KPIS[metric]) : 'N/A'}</small></article>
         <article><span>Eşleştirilmiş fark</span><b>{selectedPairwise ? ciText(selectedPairwise.metrics[metric], SCIENTIFIC_KPIS[metric]) : 'N/A'}</b><small>Geçici pratik eşik: {formatMetricValue(SCIENTIFIC_KPIS[metric], practicalThreshold(metric, baselineCondition?.metrics[metric].mean ?? null))}</small></article>
       </div>
     </section>
     <div className='panel-grid m3-science-grid'>
       <section className='panel'><header><div><h2>Throughput–adalet düzlemi</h2><p>Her iki eksende seedler arası %95 güven aralığı.</p></div></header><ThroughputFairnessFigure rows={conditionRows} /></section>
       <section className='panel'><header><div><h2>QoS karşılaştırma ısı haritası</h2><p>Birimler ortak ölçeğe zorlanmaz; her hücre kendi KPI değeri ve farkını gösterir.</p></div></header>
         <div className='m3-heatmap'>
           {(Object.keys(SCIENTIFIC_KPIS) as ScientificMetricName[]).map((id) => {
             const candidateValue = candidateCondition?.metrics[id].mean ?? null
             const baselineValue = baselineCondition?.metrics[id].mean ?? null
             const difference = heatmapDifference(selectedPairwise, id)
             const favorable = difference === null ? false : SCIENTIFIC_KPIS[id].betterDirection === 'lower' ? difference < 0 : difference > 0
             return <div key={id} className={difference === null ? 'na' : favorable ? 'favorable' : difference === 0 ? 'neutral' : 'unfavorable'}>
               <b>{SCIENTIFIC_KPIS[id].shortLabel}</b>
               <span>A: {formatMetricValue(SCIENTIFIC_KPIS[id], candidateValue)}</span>
               <span>B: {formatMetricValue(SCIENTIFIC_KPIS[id], baselineValue)}</span>
               <small>Δ {formatMetricValue(SCIENTIFIC_KPIS[id], difference)}</small>
             </div>
           })}
         </div>
       </section>
     </div>
     <div className='panel-grid m3-science-grid'>
       <section className='panel'><header><div><h2>Eşleştirilmiş fark forest grafiği</h2><p>Her satır bir hücre × yük koşuludur. Gri çizgi pratik önem aralığını, yatay hata çubuğu %95 güven aralığını, dikey kesik çizgi sıfırı gösterir.</p></div></header><ForestFigure rows={forestRows} metric={metric} baselineMeans={baselineMeans} selectedConditionKey={`${loadProfile}|${cellId}`} /></section>
       <section className='panel'><header><div><h2>Yük cevabı</h2><p>0,5 / 0,8 / 1,1 normalize yük; eksik değerler arasında çizgi kurulmaz.</p></div></header><LoadResponseFigure rows={loadRows} metric={metric} candidate={activeCandidate} baseline={baseline} /></section>
     </div>
     <section className='panel'><header><div><h2>5QI P99 gecikme ve PDB</h2><p>Barlar seedler arası ham koşu P99 ortalaması; kırmızı kesik çizgi 5QI PDB sınırı.</p></div></header><QosLatencyFigure qos={rawQos} candidate={activeCandidate} baseline={baseline} /></section>
     <section className='panel'><header><div><h2>Algoritma teknik kartları</h2><p>Literatür algoritması ile proje prototipi aynı kategori gibi sunulmaz.</p></div></header>
       <div className='m3-algorithm-grid'><AlgorithmDetail scheduler={activeCandidate} /><AlgorithmDetail scheduler={baseline} /></div>
     </section>
     <details className='data-panel'>
       <summary><span>Filtrelenmiş bilimsel özet</span><small>Ortalama, %95 GA ve örnek sayısı.</small> </summary>
       <div className='table-scroll'><table><thead><tr><th>Scheduler</th><th>KPI</th><th>Durum</th> <th>Ortalama ve %95 GA</th></tr></thead>
         <tbody>{conditionRows.flatMap((row) => (Object.keys(SCIENTIFIC_KPIS) as ScientificMetricName[]).map((id) =>
           <tr key={`${row.scheduler}-${id}`}><td>{row.schedulerLabel}</td><td>{SCIENTIFIC_KPIS[id].label}</td><td> {row.metrics[id].status}</td><td>{ciText(row.metrics[id], SCIENTIFIC_KPIS[id])}</td></tr>))}</tbody>
       </table></div>
     </details>
     <div className='export-row'>
       <button type='button' onClick={() => downloadText(createM3ScientificSummaryCsv(result), 'm3-scheduler-summary.csv', 'text/csv;charset=utf-8')}>Özet CSV</button>
       <button type='button' onClick={() => downloadText(createM3ScientificPairwiseCsv(result), 'm3-scheduler-paired-differences.csv', 'text/csv;charset=utf-8')}>Eşleştirilmiş fark CSV</button>
       <button type='button' onClick={() => downloadText(createM3ScientificRawCsv(result), 'm3-scheduler-raw-runs.csv', 'text/csv;charset=utf-8')}>Ham koşular CSV</button>
       <button type='button' onClick={() => downloadText(serializeM3ExperimentCanonical(result), 'm3-scheduler-experiment.json', 'application/json;charset=utf-8')}>Tam JSON</button>
     </div>
   </>}
 </section>
}
