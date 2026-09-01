import { M3_SCHEDULERS } from '../m3Schedulers'
import { LatexFormula } from './LatexFormula'
import { QosPerformancePanel } from './QosPerformancePanel'
import { M3VerticalQosLatencyChart } from './M3VerticalQosLatencyChart'
import { KPI_DESCRIPTORS, formatMetricValue } from '../metrics/kpiDescriptors'
import { getSchedulerDescriptor } from '../schedulers/metadata'
import type { M2Result } from '../simulation/m2Types'
import type { CellConfig } from '../simulation/types'
import { deliveryRatio, p99Status, worstP99 } from './m3DashboardHelpers'
const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 })
function schedulerColor(kind: string): string {
 return M3_SCHEDULERS.find((scheduler) => scheduler.kind === kind)?.color ?? '#475569'
}
export function M3Dashboard({
 cell,
 results,
 active,
 selected,
 onSelect,
 elapsedMilliseconds,
}: {
 cell: CellConfig
 results: M2Result[]
 active: M2Result
 selected: string
 onSelect: (kind: string) => void
 elapsedMilliseconds: number
}) {
 const descriptor = getSchedulerDescriptor(active.scheduler)
 return <>
   <div className='page-title'>
     <div>
       <span>M3 · HIZLI İNCELEME · TEK SEED</span>
       <h1>Scheduler sonuçlarını koşul bazında incele</h1>
       <p>Bu görünüm keşif içindir; bilimsel üstünlük veya evrensel kazanan iddiası üretmez. Aynı trafik ve SINR realizasyonu · worker {number.format(elapsedMilliseconds)} ms</p>
     </div>
     <code>TRAFİK SEED #{active.effectiveTrafficSeed}</code>
   </div>
   <div className='algorithm-row m2-algorithm-row'>
     {results.map((item) => <button
       type='button'
       key={item.scheduler}
       className={`algorithm-card ${selected === item.scheduler ? 'active' : ''}`}
       onClick={() => onSelect(item.scheduler)}
     >
       <div><i style={{ background: schedulerColor(item.scheduler) }} /><span>{item.schedulerLabel}</span></div>
       <strong>{number.format(item.cellThroughputMbps)} <small>Mbps</small></strong>
       <footer>
         <span>PDB uyumu</span>
         <b>{formatMetricValue(KPI_DESCRIPTORS.deliveryRatio, 1 - item.pdbViolationRatio)}</b>
         <div className='fairness-meter'><i style={{ width: `${Math.max(0, Math.min(100, (1 - item.pdbViolationRatio) *100))}%` }} /></div>
       </footer>
     </button>)}
   </div>
   <div className='kpi-row'>
     <article className='kpi accent'><span>Hücre throughput</span><strong>{formatMetricValue(KPI_DESCRIPTORS.cellThroughputMbps, active.cellThroughputMbps)}</strong><small>{active.schedulerLabel}</small> </article>
     <article className='kpi'><span>Paket teslim oranı</span><strong>{formatMetricValue(KPI_DESCRIPTORS.deliveryRatio, deliveryRatio(active))}</strong><small>{active.deliveredPackets} /{active.generatedPackets} paket</small></article>
     <article className='kpi'><span>GBR hedefini karşılayan UE</span><strong>{formatMetricValue(KPI_DESCRIPTORS.gbrUeMeetingRatio, active.gbrUeMeetingRatio)}</strong><small>GBR trafik yoksa N/A</small> </article>
     <article className='kpi'><span>En kötü 5QI P99</span><strong>{formatMetricValue(KPI_DESCRIPTORS.worstQosP99Ms, worstP99(active))}</strong><small>{p99Status(active)}</small></article>
   </div>
   <div className='panel-grid m2-grid'>
     <section className='panel m3-method-card'>
       <header className='m3-method-card__header'>
         <div><span className='m3-method-card__eyebrow'>SEÇİLİ SCHEDULER</span><h2>{descriptor.displayName}</h2><p>Karar metriği, kaynak dayanağı ve bu simülatördeki uygulama sınırları.</p></div>
         <span className={`m3-role-badge m3-role-badge--${descriptor.role}`}>{{
           baseline: 'Karşılaştırma tabanı',
           literature: 'Literatür algoritması',
           'literature-adaptation': 'Literatür uyarlaması',
           'project-proposal': 'Proje prototipi',
           ablation: 'Ablation varyantı',
         }[descriptor.role]}</span>
       </header>
       <div className='m3-method-card__body'>
         <section className='m3-formula-block'>
           <div className='m3-formula-block__title'><span>Uygulanan karar metriği</span><small>Kaynak koddaki ifade</small></div>
           <LatexFormula latex={descriptor.implementedFormulaLatex} ariaLabel={`${descriptor.displayName} uygulanan karar metriği`} />
           {descriptor.formulaSymbols.length > 0 && <div className='m3-symbol-legend'>{descriptor.formulaSymbols.map((item) => <span key={item.symbol}><b>{item.symbol}</b>{item.meaning}</span>)}</div>}
           {descriptor.originalFormulaLatex && <details><summary>Literatürdeki temel formülü göster</summary><LatexFormula latex={descriptor.originalFormulaLatex} ariaLabel={`${descriptor.displayName} literatür formülü`} /></details>}
         </section>
         <div className='m3-method-grid'>
           <article><span>Metric hesaplama</span><strong>{descriptor.metricRecomputationPolicy === 'slot_start' ? 'Her slotun başında' : 'Her RB kararında'}</strong></article>
           <article><span>State güncelleme</span><strong>{descriptor.stateUpdatePolicy}</strong></article>
         </div>
         {descriptor.parameters.length > 0 && <section className='m3-parameter-grid' aria-label='Scheduler parametreleri'>{descriptor.parameters.map((parameter) => <article key={parameter.id}><span>{parameter.label}</span><strong>{parameter.value}{parameter.unit ? ` ${parameter.unit}` : ''}</strong><small>{parameter.description}</small></article>)}</section>}
         <div className='m3-evidence-grid'>
           <section><h3>Model uyarlamaları</h3>{descriptor.adaptations.length > 0 ? <ul>{descriptor.adaptations.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Ek uyarlama yok.</p>}</section>
           <section><h3>Geçerlilik sınırları</h3><ul>{descriptor.limitations.map((item) => <li key={item}>{item}</li>)}</ul></section>
         </div>
         {descriptor.source && <footer className='m3-source-note'><span>Bilimsel dayanak</span><strong>{descriptor.source.citation}</strong><small>{descriptor.source.title}</small></footer>}
       </div>
     </section>
     <section className='panel m3-qos-performance-panel'>
       <header><div><h2>5QI gecikme ve GBR özeti</h2><p>{cell.resourceBlocks} RB · {cell.slotDurationMs} ms slot · yüzdelikler teslim edilen paketlerden; Non-GBR alanları N/A korunur.</p></div></header>
       <M3VerticalQosLatencyChart rows={active.qosResults} />
       <QosPerformancePanel result={active} chartIdPrefix='m3-qos' showLatencyChart={false} />
     </section>
   </div>
   <details className='data-panel'>
     <summary><span>Hızlı koşu karşılaştırma tablosu</span><small>Tek seed; bilimsel sonuç değildir.</small> </summary>
     <div className='table-scroll'><table>
       <thead><tr>
         <th>Scheduler</th><th>Throughput</th><th>Jain</th><th>Teslim</th>
         <th>GBR UE</th><th>GBR ort.</th><th>GBR toplam</th><th>P99</th>
         <th>PDB ihlali</th><th>Kuyruk</th>
       </tr></thead>
       <tbody>{results.map((item) => <tr key={item.scheduler}>
         <td><b>{item.schedulerLabel}</b></td>
         <td>{formatMetricValue(KPI_DESCRIPTORS.cellThroughputMbps, item.cellThroughputMbps)}</td>
         <td>{formatMetricValue(KPI_DESCRIPTORS.jainFairness, item.jainFairness)}</td>
         <td>{formatMetricValue(KPI_DESCRIPTORS.deliveryRatio, deliveryRatio(item))}</td>
         <td>{formatMetricValue(KPI_DESCRIPTORS.gbrUeMeetingRatio, item.gbrUeMeetingRatio)}</td>
         <td>{formatMetricValue(KPI_DESCRIPTORS.gbrMeanFulfillmentRatio, item.gbrMeanFulfillmentRatio)}</td>
         <td>{formatMetricValue(KPI_DESCRIPTORS.aggregateGbrServiceRatio, item.aggregateGbrServiceRatio)} </td>
         <td>{formatMetricValue(KPI_DESCRIPTORS.worstQosP99Ms, worstP99(item))}</td>
         <td>{formatMetricValue(KPI_DESCRIPTORS.pdbViolationRatio, item.pdbViolationRatio)}</td>
         <td>{item.queuedPackets.toLocaleString('tr-TR')}</td>
       </tr>)}</tbody>
     </table></div>
   </details>
 </>
}
