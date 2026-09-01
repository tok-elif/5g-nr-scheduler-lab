import { M2ExperimentMatrixPanel } from './components/M2ExperimentMatrixPanel'
import { M3Dashboard } from './components/M3Dashboard'
import { M3ScientificPanel } from './components/M3ScientificPanel'
import { QosPerformancePanel } from './components/QosPerformancePanel'
import { M4Page } from './features/m4/M4Page'
import { useMemo, useState } from 'react'
import './App.css'
import { NrTimeOverview } from './components/time/NrTimeOverview'
import { SlotDetailPanel } from './components/time/SlotDetailPanel'
import { M2AllocationGrid } from './components/time/M2AllocationGrid'
import { M1ResourceGrid } from './components/time/M1ResourceGrid'
import { PlotlyChart } from './components/PlotlyChart'
import { downloadPlotlyChartAsPng } from './components/plotlyDownload'
import { INITIAL_TIME_SELECTION, closeTimeDetail, selectResourceBlock, selectTimeSlot } from './components/time/timeSelectionModel'
import { buildM1TimeAllocationView, buildM2TimeAllocationView } from './viewModels/timeAllocationViewModel'
import { CELL_CONFIGS } from './config/cells'
import { DEFAULT_SCENARIO, runM0 } from './simulation/m0'
import { DEFAULT_M1_CONFIG } from './simulation/m1'
import { DEFAULT_M2_CONFIG } from './simulation/m2'
import { LINK_ADAPTATION_METADATA, LINK_MODEL } from './simulation/linkAdaptation'
import simulationConfig from './config/simulation.json'
import { parseExperimentPreset, serializeExperimentPreset } from './config/experimentPreset'
import { APPLICATION_METADATA } from './config/application'
import { createExperimentFingerprint } from './config/reproducibility'
import { createBatchCsv, createCellMatrixCsv, createCellMatrixPairwiseCsv, createExperimentJson, createM0CellMatrixCsv, createM0Csv, createM1Csv, createM2Csv, createPairwiseCsv } from './exports/serialize'
import { createM3ComparisonJson, createM3ResultCsv } from './exports/m3Serialize'
import { downloadText } from './exports/download'
import { useSimulationWorker } from './hooks/useSimulationWorker'
import { useM2SimulationWorker } from './hooks/useM2SimulationWorker'
import { useM3SimulationWorker } from './hooks/useM3SimulationWorker'
import { summarizeM1CellTradeoffs } from './metrics/tradeoff'
import { SCHEDULERS } from './schedulers'
import { M2_SCHEDULERS } from './m2Schedulers'
import type { CellConfig, M0Result, M1BatchResult, M1CellMatrixResult, M1Config, M1Result, ScenarioConfig, SchedulerKind, UeResult } from './simulation/types'
import type { M2Config, M2Result } from './simulation/m2Types'
import { QOS_SOURCE } from './config/qos'
import { MODULE_NAVIGATION, type ModuleView } from './navigation'
import { schedulerChartStyle } from './components/schedulerChartStyle'
const numberFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })
const number = {
 format: (value: number | bigint | null) => value === null ? 'N/A' : numberFormatter.format(value), }
const EMPTY_M1_RESULTS: M1Result[] = []
const UE_PALETTE = ['#2563eb', '#0f766e', '#c2410c', '#7c3aed', '#be123c', '#0369a1', '#4d7c0f', '#b45309', '#4338ca', '#0e7490', '#a21caf', '#475569']
const ueColor = (ueId: number) => UE_PALETTE[(ueId - 1) % UE_PALETTE.length]
const schedulerColor = (kind: SchedulerKind): string =>
 SCHEDULERS.find((scheduler) => scheduler.kind === kind)?.color ?? '#475569'
const schedulerShortLabel = (kind: SchedulerKind, label: string): string =>
 SCHEDULERS.find((scheduler) => scheduler.kind === kind)?.shortLabel ?? label
const m2SchedulerColor = (kind: string): string =>
 M2_SCHEDULERS.find((scheduler) => scheduler.kind === kind)?.color ?? '#475569'
function App() {
 const [moduleView, setModuleView] = useState<ModuleView>('m1')
 const [cellId, setCellId] = useState(CELL_CONFIGS[2].id)
 const [scenario, setScenario] = useState<ScenarioConfig>(DEFAULT_SCENARIO)
 const [m1Config, setM1Config] = useState<M1Config>(DEFAULT_M1_CONFIG)
 const [m2Config, setM2Config] = useState<M2Config>(DEFAULT_M2_CONFIG)
 const [seedCount, setSeedCount] = useState(simulationConfig.experiments.seedCount)
 const [selectedScheduler, setSelectedScheduler] = useState<SchedulerKind>('proportional-fair')
 const [selectedM2Scheduler, setSelectedM2Scheduler] = useState('m-lwdf')
 const [selectedM3Scheduler, setSelectedM3Scheduler] = useState('m-lwdf')
 const cell = CELL_CONFIGS.find((item) => item.id === cellId) ?? CELL_CONFIGS[2]
 const m0CellMatrix = useMemo(() => CELL_CONFIGS.map((item) => runM0(item, scenario)), [scenario])
 const m0 = m0CellMatrix.find((result) => result.cell.id === cell.id) ?? m0CellMatrix[0]
 const ueWidebandSinr = useMemo(() => new Map(m0.ues.map((ue) => [ue.id, ue.sinrDb])), [m0.ues])
 const workerState = useSimulationWorker({ cell, scenario, m1Config, seedCount }, moduleView === 'm1')
 const m2WorkerState = useM2SimulationWorker({
   cell,
   ues: m0.ues,
   config: m2Config,
   baseSeed: scenario.seed,
 }, moduleView === 'm2')
 const m3WorkerState = useM3SimulationWorker({
   cell,
   ues: m0.ues,
   config: m2Config,
   baseSeed: scenario.seed,
 }, moduleView === 'm3')
 const m1 = workerState.data?.singleSeedResults ?? EMPTY_M1_RESULTS
 const batch = workerState.data?.multiSeedResult
 const cellMatrix = workerState.data?.cellMatrixResult
 const activeM1 = m1.find((item) => item.scheduler === selectedScheduler) ?? m1[0]
 const m2Results = m2WorkerState.data?.results ?? []
 const activeM2 = m2Results.find((item) => item.scheduler === selectedM2Scheduler) ?? m2Results[0]
 const m3Results = m3WorkerState.data?.results ?? []
 const activeM3 = m3Results.find((item) => item.scheduler === selectedM3Scheduler) ?? m3Results[0]
 const experimentId = useMemo(() => createExperimentFingerprint({
   cellId,
   scenario,
   m1Config,
   m2Config,
   seedCount,
 }), [cellId, scenario, m1Config, m2Config, seedCount])
 const exportChartPng = () => {
   const id = moduleView === 'm0' ? 'm0-sinr-rate-chart' : 'm1-fairness-chart'
   const filename = moduleView === 'm0' ? 'm0-sinr-rate.png' : 'm1-throughput-fairness.png'
   const exportPromise = downloadPlotlyChartAsPng(id, filename)
   void exportPromise.catch((error: unknown) => {
     window.alert(error instanceof Error ? error.message : 'PNG dışa aktarılamadı.')
   })
 }
 const exportMatrixChartPng = () => {
   void downloadPlotlyChartAsPng('m1-cell-matrix-chart', 'm1-all-cells-throughput-fairness.png').catch((error: unknown) => {
     window.alert(error instanceof Error ? error.message : 'Matris figürü PNG olarak dışa aktarılamadı.')
   })
 }
 const exportPreset = () => downloadText(serializeExperimentPreset({
   cellId,
   scenario,
   m1Config,
   seedCount,
   selectedScheduler,
 }), 'nr-scheduler-experiment-preset.json', 'application/json')
 const importPreset = (file: File) => {
   void file.text().then((content) => {
     const preset = parseExperimentPreset(content)
     setCellId(preset.cellId)
     setScenario(preset.scenario)
     setM1Config(preset.m1Config)
     setSeedCount(preset.seedCount)
     setSelectedScheduler(SCHEDULERS.some((scheduler) => scheduler.kind === preset.selectedScheduler)
       ? preset.selectedScheduler
       : SCHEDULERS[0].kind)
     window.alert(`Deney profili yüklendi: ${file.name}`)
   }).catch((error: unknown) => {
     window.alert(error instanceof Error ? error.message : 'Deney profili yüklenemedi.')
   })
 }
 const updateScenario = (key: keyof ScenarioConfig, raw: string) => {
   const value = Number(raw)
   if (!Number.isFinite(value)) return
   setScenario((current) => {
     if (key === 'ueCount') return { ...current, ueCount: Math.min(100, Math.max(1, Math.round(value))) }
     if (key === 'stdDevSinrDb') return { ...current, stdDevSinrDb: Math.max(0, value) }
     if (key === 'minSinrDb' && value > current.maxSinrDb) return current
     if (key === 'maxSinrDb' && value < current.minSinrDb) return current
     return { ...current, [key]: value }
   })
 }
 const updateM1 = (key: keyof M1Config, raw: string) => {
   const value = Number(raw)
   if (!Number.isFinite(value)) return
   setM1Config((current) => ({
     ...current,
     [key]: key === 'slotCount'
       ? Math.min(100_000, Math.max(1, Math.round(value)))
       : Math.min(10_000, Math.max(1, Math.round(value))),
   }))
 }
 const updateM2 = (key: 'slotCount' | 'pfWindowSlots', raw: string) => {
   const value = Number(raw)
   if (!Number.isFinite(value)) return
   setM2Config((current) => ({
     ...current,
     [key]: key === 'slotCount'
       ? Math.min(100_000, Math.max(1, Math.round(value)))
       : Math.min(10_000, Math.max(1, Math.round(value))),
   }))
 }
 const engineState = moduleView === 'm1'
   ? workerState
   : moduleView === 'm2'
     ? m2WorkerState
     : moduleView === 'm3'
       ? m3WorkerState
       : { status: 'ready' as const }
 return <div className="app">
   <header className="app-header">
     <div className="product"><span className="product-mark">5G</span><div><strong>NR Scheduler Laboratory</strong><small>Downlink system-level analysis</small></div></div>
     <nav className="module-nav" aria-label="Simülasyon modülleri">
       {MODULE_NAVIGATION.map((item) => <button key={item.view} aria-current={moduleView === item.view ? 'page' : undefined} className={moduleView === item.view ? 'active' : ''} onClick={() => setModuleView(item.view)}>< span>{item.index}</span>{item.label}</button>)}
     </nav>
     <div className={`engine-status ${engineState.status}`}><span><i />{engineState.status === 'running' ? 'Hesaplanıyor…' : engineState.status === 'error' ? 'Hesaplama hatası' : 'Simülasyon hazır'}</span><code>v{
APPLICATION_METADATA.version} · {experimentId}</code></div>
   </header>
   {moduleView === 'm4' ? <main className="m4-shell"><M4Page /></main> : <div className="dashboard">
     <ControlPanel
       moduleView={moduleView} cell={cell} cellId={cellId} scenario={scenario} m1Config={m1Config} m2Config= {m2Config} seedCount={seedCount}
       onCellChange={setCellId} onScenarioChange={updateScenario} onM1Change={updateM1} onM2Change= {updateM2}
       onSeedCountChange={(value) => setSeedCount(Math.min(100, Math.max(2, Math.round(Number(value) || 2))))}
       onExportM0={() => downloadText(createM0Csv(m0), 'm0-ue-results.csv', 'text/csv')}
       onExportM0Matrix={() => downloadText(createM0CellMatrixCsv(m0CellMatrix), 'm0-all-cells-ue-rates.csv', 'text/csv')}
       onExportM1={() => activeM1 ? downloadText(createM1Csv(activeM1), `m1-${activeM1.scheduler}.csv`, 'text/csv') : window.alert('M1 hesabının tamamlanmasını bekleyin.')}
       onExportM2={() => activeM2 ? downloadText(createM2Csv(activeM2), `m2-${activeM2.scheduler}.csv`, 'text/csv') : window.alert('M2 hesabının tamamlanmasını bekleyin.')}
       onExportM2Json={() => activeM2 ? downloadText(JSON.stringify({ application: APPLICATION_METADATA, results: m2Results }, null, 2), 'm2-qos-experiment.json', 'application/json') : window.alert('M2 hesabınıntamamlanmasını bekleyin.')}
       onExportM3={() => activeM3 ? downloadText(createM3ResultCsv(activeM3), `m3-${activeM3.scheduler}.csv`, 'text/csv;charset=utf-8') : window.alert('M3 hesabının tamamlanmasını bekleyin.')}
       onExportM3Json={() => activeM3 ? downloadText(createM3ComparisonJson({ cell, config: m2Config, baseSeed: scenario.seed, results: m3Results }), 'm3-scheduler-quick-comparison.json', 'application/json;charset=utf-8') : window.alert('M3 hesabının tamamlanmasını bekleyin.')}
       onExportBatch={() => batch ? downloadText(createBatchCsv(batch), 'm1-multi-seed-summary.csv', 'text/csv') : window.alert('Çoklu-seed hesabının tamamlanmasını bekleyin.')}
       onExportPairwise={() => batch ? downloadText(createPairwiseCsv(batch), 'm1-paired-differences.csv', 'text/csv') : window.alert('Eşleştirilmiş fark hesabının tamamlanmasını bekleyin.')}
       onExportMatrix={() => cellMatrix ? downloadText(createCellMatrixCsv(cellMatrix), 'm1-all-cells-matrix.csv', 'text/csv') : window.alert('Hücre matrisinin tamamlanmasını bekleyin.')}
       onExportMatrixPairwise={() => cellMatrix ? downloadText(createCellMatrixPairwiseCsv(cellMatrix), 'm1-all-cells-paired-differences.csv', 'text/csv') : window.alert('Hücre matrisi fark hesabının tamamlanmasını bekleyin.')}
       onExportJson={() => batch && cellMatrix ? downloadText(createExperimentJson({ cell, scenario, m1Config, m0, m0CellMatrix, m1, multiSeed: batch, cellMatrix }), 'nr-scheduler-experiment.json', 'application/json') : window.alert('Deney hesabının tamamlanmasını bekleyin.')}
       onExportPng={exportChartPng}
       onExportMatrixPng={exportMatrixChartPng}
       onExportPreset={exportPreset}
       onImportPreset={importPreset}
       onReset={() => { setScenario(DEFAULT_SCENARIO); setM1Config(DEFAULT_M1_CONFIG);
setM2Config(DEFAULT_M2_CONFIG); setSeedCount(simulationConfig.experiments.seedCount) }}
       onRandomize={() => setScenario((current) => ({ ...current, seed: Math.floor(Math.random() * 1_000_000) }))}
     />
     <main className="content">
       {moduleView === 'm0'
         ? <M0Dashboard result={m0} cellMatrix={m0CellMatrix} />
         : moduleView === 'm1'
           ? workerState.status === 'ready' && activeM1 && batch && cellMatrix
             ? <M1Dashboard cell={cell} results={m1} active={activeM1} batch={batch} cellMatrix={cellMatrix}
selected={selectedScheduler} onSelect={setSelectedScheduler}
elapsedMilliseconds={workerState.data.elapsedMilliseconds} />
             : <WorkerStatus status={workerState.status} error={workerState.error} />
           : moduleView === 'm2'
             ? m2WorkerState.status === 'ready' && activeM2
               ? <>
<M2Dashboard cell={cell} results={m2Results} active={activeM2} selected={activeM2.scheduler} onSelect={
setSelectedM2Scheduler} elapsedMilliseconds={m2WorkerState.data.elapsedMilliseconds} ueWidebandSinr={
ueWidebandSinr} />
<M2ExperimentMatrixPanel />
</>
               : <WorkerStatus status={m2WorkerState.status} error={m2WorkerState.error} />
             : m3WorkerState.status === 'ready' && activeM3
               ? <>
                 <M3Dashboard cell={cell} results={m3Results} active={activeM3} selected={activeM3.scheduler}
onSelect={setSelectedM3Scheduler} elapsedMilliseconds={m3WorkerState.data.elapsedMilliseconds} />
                 <M3ScientificPanel baseScenario={scenario} config={m2Config} initialSeedCount={Math.min(seedCount, 20)} />
               </>
               : <WorkerStatus status={m3WorkerState.status} error={m3WorkerState.error} />}
     </main>
   </div>}
 </div>
}
interface ControlProps {
 moduleView: ModuleView; cell: CellConfig; cellId: string; scenario: ScenarioConfig; m1Config: M1Config; m2Config: M2Config; seedCount: number
 onCellChange: (value: string) => void; onScenarioChange: (key: keyof ScenarioConfig, value: string) => void
 onM1Change: (key: keyof M1Config, value: string) => void; onM2Change: (key: 'slotCount' | 'pfWindowSlots', value: string) => void; onSeedCountChange: (value: string) => void; onReset: () => void; onRandomize: () => void
 onExportM0: () => void; onExportM0Matrix: () => void; onExportM1: () => void; onExportM2: () => void;
onExportM2Json: () => void; onExportM3: () => void; onExportM3Json: () => void; onExportBatch: () => void;
onExportPairwise: () => void; onExportMatrix: () => void; onExportMatrixPairwise: () => void; onExportJson: () => void; onExportPng: () => void; onExportMatrixPng: () => void
 onExportPreset: () => void; onImportPreset: (file: File) => void
}
function ControlPanel(props: ControlProps) {
 const workUnits = CELL_CONFIGS.length * props.seedCount * props.m1Config.slotCount * props.scenario.ueCount
 const workloadExceeded = workUnits > simulationConfig.experiments.maxWorkUnits
 return <aside className='sidebar'>
   <div className="sidebar-title"><div><span>Senaryo kontrolü</span><small>Ortak deney parametreleri</small> </div><button onClick={props.onReset}>Sıfırla</button></div>
   <ControlSection title="Hücre">
     <Field label="Konfigürasyon"><select value={props.cellId} onChange={(e) => props.onCellChange(e.target.value)}>{CELL_CONFIGS.map((item) => <option value={item.id} key={item.id}>{item.bandMHz} MHz /{item.bandwidthMHz} MHz</option>)}</select></Field>
     <div className="cell-summary"><span><b>{props.cell.resourceBlocks}</b> RB</span><span><b>{props.cell.scsKHz}</b> kHz SCS</span><span><b>{props.cell.slotDurationMs}</b> ms slot</span></div>
   </ControlSection>
   <ControlSection title="UE popülasyonu">
     <div className="field-grid"><Field label="UE sayısı"><input type="number" min="1" max="100" value= {props.scenario.ueCount} onChange={(e) => props.onScenarioChange('ueCount', e.target.value)} /></Field><Field label="Ortalama SINR (dB)"><input type="number" step="0.5" value={props.scenario.meanSinrDb} onChange={(e) => props.onScenarioChange('meanSinrDb', e.target.value)} /></Field></div>
     <details className="advanced-settings"><summary>Gelişmiş kanal ayarları</summary><div className="field-grid"><Field label="Seed"><input type="number" value={props.scenario.seed} onChange={(e) => props.onScenarioChange('seed', e.target.value)} /></Field><Field label="Standart sapma"><input type="number" min="0" step="0.5" value={props.scenario.stdDevSinrDb} onChange={(e) => props.onScenarioChange('stdDevSinrDb', e.target.value)} /></Field></div><div className="field-grid"><Field label="Minimum SINR"><input type="number" value={props.scenario.minSinrDb} onChange={(e) => props.onScenarioChange('minSinrDb', e.target.value)} /></Field><Field label="Maksimum SINR"><input type="number" value={props.scenario.maxSinrDb} onChange={(e) => props.onScenarioChange('maxSinrDb', e.target.value)} /></Field></div></details>
   </ControlSection>
   {props.moduleView === 'm1' && <ControlSection title="Simülasyon"><Field label="Toplam slot sayısı"><input type="number" min="1" max="100000" value={props.m1Config.slotCount} onChange={(e) => props.onM1Change('slotCount', e.target.value)} /></Field><details className="advanced-settings"><summary>İleri deney ayarları</summary><Field label="PF ortalama penceresi"><input type="number" min="1" max="10000" value= {props.m1Config.pfWindowSlots} onChange={(e) => props.onM1Change('pfWindowSlots', e.target.value)} /></Field> <Field label="Çoklu deney seed sayısı"><input type="number" min="2" max="100" value={props.seedCount}
onChange={(e) => props.onSeedCountChange(e.target.value)} /></Field></details><p className={`workload-note${workloadExceeded ? 'exceeded' : ''}`}>Deney yükü: {workUnits.toLocaleString('tr-TR')} UE-slot
birimi{workloadExceeded ? ' · güvenli sınırı aşıyor' : ''}</p><p className="assumption">M1’de her slotta bütün RB’ler yalnızca bir UE’ye verilir.</p></ControlSection>}
   {(props.moduleView === 'm2' || props.moduleView === 'm3') && <ControlSection title={props.moduleView === 'm3' ? 'M3 QoS karşılaştırma' : 'QoS + trafik'}><Field label='Toplam slot sayısı'><input type='number' min='1' max='100000' value={props.m2Config.slotCount} onChange={(e) => props.onM2Change('slotCount', e.target.value)} /></Field> <details className='advanced-settings'><summary>{props.moduleView === 'm3' ? 'İleri M3 hızlı-koşu ayarları' : 'İleriM2 ayarları'}</summary><Field label='PF ortalama penceresi'><input type='number' min='1' max='10000' value= {props.m2Config.pfWindowSlots} onChange={(e) => props.onM2Change('pfWindowSlots', e.target.value)} /></Field> <p>5QI ve trafik ayarları config dosyalarından; deney seedleri ve normalize yükler
<code>configs/M3_EXPERIMENT_PROTOCOL.json</code> dosyasından okunur.</p></details><p
className='assumption'>Poisson paket gelişleri · FIFO kuyruklar · greedy RB dolumu · aynı trafik seed’i.</p> </ControlSection>}
   <button className="run-button" onClick={props.onRandomize}><span>Yeni popülasyon üret</span><b>↻</b> </button>
   {props.moduleView !== 'm3' && <details className="export-panel"><summary>Sonuçları dışa aktar</summary> <div>{props.moduleView !== 'm2' && <button onClick={props.onExportM0}>Seçili M0 sonucu · CSV</button>}
{props.moduleView === 'm0' && <button onClick={props.onExportM0Matrix}>Tüm hücreler M0 matrisi ·
CSV</button>}{props.moduleView === 'm1' && <><button onClick={props.onExportM1}>Seçili M1 sonucu ·
CSV</button><button onClick={props.onExportBatch}>Çoklu seed özeti · CSV</button><button onClick={props.onExportPairwise}>Eşleştirilmiş scheduler farkları · CSV</button><button onClick={props.onExportMatrix}>Tüm hücre matrisi · CSV</button><button onClick={props.onExportMatrixPairwise}>Tüm hücreler eşleştirilmiş farklar ·
CSV</button><button onClick={props.onExportJson}>Tüm M0/M1 deneyi · JSON</button><button onClick= {props.onExportPng}>Seçili hücre throughput–fairness · PNG</button><button onClick={props.onExportMatrixPng}>Tüm hücreler throughput–fairness · PNG</button></>}{props.moduleView === 'm0' && <> <button onClick={props.onExportJson}>Tüm M0/M1 deneyi · JSON</button><button onClick={props.onExportPng}> SINR–hız grafiği · PNG</button></>}{props.moduleView === 'm2' && <><button onClick={props.onExportM2}>Seçili M2 scheduler · CSV</button><button onClick={props.onExportM2Json}>Tüm M2 karşılaştırması · JSON</button></>} </div></details>}
   {props.moduleView === 'm3' && <details className="export-panel" open><summary>M3 sonuçlarını dışa aktar</summary><div><button onClick={props.onExportM3}>Seçili M3 scheduler · CSV</button><button onClick= {props.onExportM3Json}>M3 karşılaştırması · JSON</button></div></details>}
   <details className="export-panel preset-panel"><summary>Deney profilini kaydet / yükle</summary><div> <button onClick={props.onExportPreset}>Mevcut ayarları kaydet · JSON</button><label className="import-file">Deney profilini yükle · JSON<input type="file" accept=".json,application/json" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) props.onImportPreset(file); event.currentTarget.value = '' }} /></label><p>Hücre, seed, UE/SINR, slot, PF ve çoklu-seed ayarlarını birlikte taşır.</p></div></details>
   <div className="reproducibility"><i /> Aynı seed, bütün algoritmalarda aynı UE/SINR popülasyonunu üretir.</div>
 </aside>
}
function ControlSection({ title, children }: { title: string; children: React.ReactNode }) { return <section
className="control-section"><h3>{title}</h3>{children}</section> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span> {label}</span>{children}</label> }
function M0Dashboard({ result, cellMatrix }: { result: M0Result; cellMatrix: readonly M0Result[] }) {
 const representative = [...result.ues].sort((a, b) => a.sinrDb - b.sinrDb)[Math.floor(result.ues.length / 2)]
 return <>
   <PageTitle eyebrow="M0 · SİMÜLASYON ÇATISI" title="Link adaptation görünümü" description="UE başına statikwideband SINR, CQI/MCS seçimi ve tam-bant ulaşılabilir hız." seed={result.scenario.seed} />
   <div className="kpi-row">
     <Kpi label="Hücre profili" value={`${result.cell.bandwidthMHz} MHz`} note={`${result.cell.resourceBlocks} RB ·${result.cell.scsKHz} kHz`} />
     <Kpi label="Ortalama SINR" value={`${number.format(result.averageSinrDb)} dB`} note={`${result.ues.length} UEpopülasyonu`} />
     <Kpi label="Ort. ulaşılabilir hız" value={`${number.format(result.averageUeRateMbps)} Mbps`} note="UE başına,tam bant" />
     <Kpi label="Örneklenmiş tam-bant üst sınırı" value={`${number.format(result.sampledFullBandUpperBoundMbps)}Mbps`} note="Popülasyondaki en iyi UE" accent />
   </div>
   <div className="panel-grid m0-grid">
     <Panel title="SINR → ulaşılabilir hız" subtitle="Her nokta bir UE’yi temsil eder" className="wide-panel">< SinrRateChart ues={result.ues} /></Panel>
     <Panel title="Link adaptation zinciri" subtitle={`Temsilî UE ${representative.id}`}><LinkPipeline ue={representative} /></Panel>
     <Panel title="Popülasyon özeti" subtitle="CQI dağılımı"><CqiDistribution ues={result.ues} /></Panel>
     <Panel title="Fiziksel kaynak görünümü" subtitle={`${result.cell.resourceBlocks} RB · ${result.cell.bandwidthMHz}MHz kanal`} className="wide-panel"><ResourceGrid count={result.cell.resourceBlocks} /><div
className="resource-caption"><span>RB 1</span><span>Scheduler yok: kaynak bütünüyle erişilebilir</span> <span>RB {result.cell.resourceBlocks}</span></div></Panel>
   </div>
   <div className="model-note"><strong>Model kaynağı:</strong> {LINK_ADAPTATION_METADATA.specification}, {LINK_ADAPTATION_METADATA.cqiTable} ve {LINK_ADAPTATION_METADATA.mcsTable}; CQI 1 için
{LINK_ADAPTATION_METADATA.lowSpectralEfficiencyMcsTable}. <strong>SINR eşikleri:</strong> {LINK_MODEL.sinrThresholdNotice}</div>
   <M0CellMatrixAnalysis results={cellMatrix} />
   <DataTable><thead><tr><th>UE</th><th>SINR</th><th>CQI</th><th>MCS</th><th>MCS tablosu</th> <th>Modülasyon</th><th>Kod oranı ×1024</th><th>Spektral verim</th><th>Ulaşılabilir hız</th></tr></thead><tbody> {result.ues.map((ue) => <tr key={ue.id}><td><b>UE {String(ue.id).padStart(2, '0')}</b></td><td>{number.format(ue.sinrDb)} dB</td><td><Badge>{ue.cqi}</Badge></td><td>{ue.mcs}</td><td>{ue.mcsTable}</td><td>{ue.modulation}</td><td>{ue.targetCodeRateX1024 || '—'}</td><td>{number.format(ue.spectralEfficiency)} bit/s/Hz</td> <td><b>{number.format(ue.achievableRateMbps)} Mbps</b></td></tr>)}</tbody></DataTable>
 </>
}
function M0CellMatrixAnalysis({ results }: { results: readonly M0Result[] }) {
 const referenceUes = results[0]?.ues ?? []
 return <details className="matrix-panel m0-matrix-panel"><summary><div><span>Tüm hücreler M0 sonuç matrisi</span><small>{results.length} hücre · {referenceUes.length} ortak UE/SINR popülasyonu · seed #
{results[0]?.scenario.seed}</small></div><b>Karşılaştırmayı aç</b></summary>
   <div className="m0-cell-cards">{results.map((item) => <article key={item.cell.id}><header><strong> {item.cell.bandMHz} / {item.cell.bandwidthMHz} MHz</strong><span>{item.cell.resourceBlocks} RB ·
{item.cell.scsKHz} kHz</span></header><div><span>Ort. UE hızı</span><b>{number.format( item.averageUeRateMbps)} Mbps</b></div><div><span>Örneklenmiş tam-bant üst sınırı</span><b>{number.format(item.sampledFullBandUpperBoundMbps)} Mbps</b></div></article>)}</div>
   <div className="m0-matrix-heading"><h3>UE başına ulaşılabilir hız</h3><p>Aynı satırdaki UE, bütün hücrelerde aynı SINR ve CQI değerine sahiptir.</p></div>
   <div className="table-scroll"><table><thead><tr><th>UE</th><th>SINR</th><th>CQI</th>{results.map((item) => <th key={item.cell.id}>{item.cell.bandMHz}/{item.cell.bandwidthMHz} MHz<br />{item.cell.resourceBlocks} RB</th>)} </tr></thead><tbody>{referenceUes.map((ue) => <tr key={ue.id}><td><b>UE {String(ue.id).padStart(2, '0')}</b></td> <td>{number.format(ue.sinrDb)} dB</td><td><Badge>{ue.cqi}</Badge></td>{results.map((item) => <td key= {item.cell.id}><b>{number.format(item.ues.find((candidate) => candidate.id === ue.id)?.achievableRateMbps ?? 0)} Mbps</b></td>)}</tr>)}</tbody></table></div>
 </details>
}
interface M1Props { cell: CellConfig; results: M1Result[]; active: M1Result; batch: M1BatchResult; cellMatrix: M1CellMatrixResult; selected: SchedulerKind; onSelect: (kind: SchedulerKind) => void; elapsedMilliseconds: number }
function M1Dashboard({ cell, results, active, batch, cellMatrix, selected, onSelect, elapsedMilliseconds }: M1Props) {
 const [selection, setSelection] = useState(INITIAL_TIME_SELECTION)
 const safeSlot = Math.min(selection.slotIndex, active.slotTrace.length - 1)
 const selectedUe = active.slotTrace[safeSlot]
 const timeView = useMemo(() => buildM1TimeAllocationView({
   schedulerLabel: active.schedulerLabel,
   slotTrace: active.slotTrace,
   cell,
   ueRates: new Map(active.ueResults.map((ue) => [ue.ueId, { sinrDb: ue.sinrDb, achievableRateMbps: ue.achievableRateMbps }])),
   ueColors: new Map(active.ueResults.map((ue) => [ue.ueId, ueColor(ue.ueId)])),
 }), [active, cell])
 return <>
   <PageTitle eyebrow="M1 · FULL-BUFFER" title="Scheduler karşılaştırması" description={`Aynı kanalpopülasyonunda throughput, adalet ve kaynak tahsisi · worker ${number.format(elapsedMilliseconds)} ms`} seed= {undefined} />
   <div className="algorithm-row">{results.map((item) => <button key={item.scheduler} className={`algorithm-card${selected === item.scheduler ? 'active' : ''}`} onClick={() => onSelect(item.scheduler)}><div><i style={{ background: schedulerColor(item.scheduler) }} /><span>{item.schedulerLabel}</span></div><strong>{number.format(item.cellThroughputMbps)} <small>Mbps</small></strong><footer><span>Jain</span><b>{item.jainFairness === null ? 'N/A' : number.format(item.jainFairness)}</b><div className="fairness-meter"><i style={{ width: `${(item.jainFairness?? 0) * 100}%` }} /></div></footer></button>)}</div>
   <div className="panel-grid m1-grid">
     <Panel title="Frame · Subframe · Slot genel görünümü" subtitle={`${active.schedulerLabel} ·${active.slotTrace.length} slot · yatay kaydırma yok`} className="allocation-panel">
       <div className={`time-detail-layout${selection.detailOpen ? '' : ' detail-closed'}`}><div className="time-overview-column"><NrTimeOverview view={timeView} selectedSlot={safeSlot} onSelect={(index) => setSelection((current) => selectTimeSlot(current, index))} />
       <div className="slot-selector"><label>İncelenen slot <b>{safeSlot + 1}</b></label><input type="range" min="0" max={active.slotTrace.length - 1} value={safeSlot} onChange={(e) => setSelection((current) => selectTimeSlot(current, Number(e.target.value)))} /></div></div>
       {selection.detailOpen && <SlotDetailPanel cell={timeView.cells[safeSlot] ?? null} onClose={() => setSelection(closeTimeDetail)} />}</div>
       <section className="slot-rb-analysis"><M1ResourceGrid cell={timeView.cells[safeSlot] ?? null} color={ueColor(selectedUe)} /><div className="resource-caption"><span>RB 1</span><span style={{ color: ueColor(selectedUe) }}>Tüm bant → UE {selectedUe}</span><span>RB {cell.resourceBlocks}</span></div></section>
     </Panel>
     <Panel title="Throughput–fairness" subtitle="Sağ üst köşe tercih edilir"><FairnessChart results={results} selected= {selected} /></Panel>
     <Panel title={`${active.schedulerLabel} · UE sonuçları`} subtitle="Gerçekleşen throughput ve airtime"> <ThroughputBars result={active} /></Panel>
   </div>
   <BatchAnalysis result={batch} />
   <CellMatrixAnalysis result={cellMatrix} />
   <DataTable><thead><tr><th>UE</th><th>SINR</th><th>Ulaşılabilir hız</th><th>Gerçekleşen throughput</th> <th>Seçilen slot</th><th>Airtime</th></tr></thead><tbody>{active.ueResults.map((ue) => <tr key={ue.ueId}><td> <span className="ue-dot" style={{ background: ueColor(ue.ueId) }} /><b>UE {String(ue.ueId).padStart(2, '0')}</b> </td><td>{number.format(ue.sinrDb)} dB</td><td>{number.format(ue.achievableRateMbps)} Mbps</td><td><b> {number.format(ue.throughputMbps)} Mbps</b></td><td>{ue.selectedSlots.toLocaleString('tr-TR')}</td><td>%
{number.format(ue.airtimePercent)}</td></tr>)}</tbody></DataTable>
 </>
}
interface M2Props {
 cell: CellConfig
 results: M2Result[]
 active: M2Result
 selected: string
 onSelect: (kind: string) => void
 elapsedMilliseconds: number
 ueWidebandSinr: ReadonlyMap<number, number>
}
function M2Dashboard({ cell, results, active, selected, onSelect, elapsedMilliseconds, ueWidebandSinr }: M2Props) {
 const [selection, setSelection] = useState(INITIAL_TIME_SELECTION)
 const safeSlot = Math.min(selection.slotIndex, Math.max(0, active.slotTrace.length - 1))
 const slot = active.slotTrace[safeSlot]
 const deliveryRatio = active.generatedPackets > 0 ? active.deliveredPackets / active.generatedPackets : 1
 const m2TimeView = useMemo(() => buildM2TimeAllocationView({
   schedulerLabel: active.schedulerLabel,
   slotTrace: active.slotTrace,
   cell,
   ueResults: active.ueResults.map((ue) => ({ ...ue, sinrDb: ueWidebandSinr.get(ue.ueId) ?? null })),
   ueColors: new Map(active.ueResults.map((ue) => [ue.ueId, ueColor(ue.ueId)])),
 }), [active, cell, ueWidebandSinr])
 return <>
   <PageTitle eyebrow="M2 · QoS + TRAFİK" title="Paket ve gecikme farkındalıklı scheduling" description={`Poissontrafik, FIFO kuyruklar, 5QI/GBR ve greedy RB paylaşımı · teslim edilen paketlerde gelişten hizmet tamamlanmasınagecikme · worker ${number.format(elapsedMilliseconds)} ms`} seed={active.effectiveTrafficSeed} />
   <div className="algorithm-row m2-algorithm-row">{results.map((item) => <button key={item.scheduler}
className={`algorithm-card ${selected === item.scheduler ? 'active' : ''}`} onClick={() => onSelect(item.scheduler)}>< div><i style={{ background: m2SchedulerColor(item.scheduler) }} /><span>{item.schedulerLabel}</span></div> <strong>{number.format(item.cellThroughputMbps)} <small>Mbps</small></strong><footer><span>Teslim</span> <b>%{number.format(item.generatedPackets > 0 ? item.deliveredPackets / item.generatedPackets * 100 : 100)}</b> <div className="fairness-meter"><i style={{ width: `${(item.generatedPackets > 0 ? item.deliveredPackets /item.generatedPackets : 1) * 100}%` }} /></div></footer></button>)}</div>
   <div className="kpi-row">
     <Kpi label="Hücre throughput" value={`${number.format(active.cellThroughputMbps)} Mbps`} note= {active.schedulerLabel} accent />
     <Kpi label="Paket teslim oranı" value={`%${number.format(deliveryRatio * 100)}`} note={`${active.deliveredPackets.toLocaleString('tr-TR')} / ${active.generatedPackets.toLocaleString('tr-TR')} paket`} />
     <Kpi label="Kuyrukta kalan" value={active.queuedPackets.toLocaleString('tr-TR')} note="Simülasyon sonundakipaket" />
     <Kpi label="Jain adaleti" value={active.jainFairness === null ? 'N/A' : number.format(active.jainFairness)} note= {`${active.ueResults.length} UE`} />
   </div>
   <div className="panel-grid m2-grid">
     <Panel title="Frame · Subframe · Slot · RB paylaşımı" subtitle={`${active.schedulerLabel} · incelenebilir ilk${active.slotTrace.length} slot · yatay kaydırma yok`} className="allocation-panel">
       <div className={`time-detail-layout${selection.detailOpen ? '' : ' detail-closed'}`}><div className="time-overview-column"><NrTimeOverview view={m2TimeView} selectedSlot={m2TimeView.cells[safeSlot]?.globalSlotIndex ?? null} onSelect={(globalSlotIndex) => { const index = m2TimeView.cells.findIndex((candidate) => candidate.globalSlotIndex === globalSlotIndex); if (index >= 0) setSelection((current) => selectTimeSlot(current, index)) }} />
       <div className="slot-selector"><label>İncelenen slot <b>{safeSlot + 1}</b></label><input type="range" min="0" max={Math.max(0, active.slotTrace.length - 1)} value={safeSlot} onChange={(event) => setSelection((current) => selectTimeSlot(current, Number(event.target.value)))} /></div></div>
       {selection.detailOpen && <SlotDetailPanel cell={m2TimeView.cells[safeSlot] ?? null} onClose={() => setSelection(closeTimeDetail)} />}</div>
       <div className="allocation-header"><div><span>Slot {safeSlot + 1}</span><strong>{slot?.allocations.length ?? 0} UE’ye tahsis</strong></div><div><span>Kullanılan kaynak</span><strong>{slot?.allocations.reduce((sum, allocation) => sum + allocation.resourceBlocks, 0) ?? 0}/{cell.resourceBlocks} RB</strong></div></div>
       {m2TimeView.cells[safeSlot] && <M2AllocationGrid cell={m2TimeView.cells[safeSlot]} selectedRbIndex= {selection.selectedRbIndex} onSelectRb={(rbIndex) => setSelection((current) => selectResourceBlock(current, rbIndex))} colorForUe={ueColor} />}
     </Panel>
     <Panel title="5QI sınıf sonuçları" subtitle="Gecikme, paket teslimi ve GBR servisinin birlikte incelenmesi" className="m2-qos-performance-panel"><QosPerformancePanel result={active} chartIdPrefix="m2-qos" /></Panel>
   </div>
   <div className="model-note"><strong>QoS kaynağı:</strong> {QOS_SOURCE.specification}, {QOS_SOURCE.table}. <strong>Model:</strong> {QOS_SOURCE.notice}</div>
   <DataTable><thead><tr><th>UE</th><th>5QI</th><th>Kaynak tipi</th><th>Sunulan yük</th><th>GBR</th><th> Throughput</th><th>GBR sonucu</th><th>Teslim P50</th><th>Teslim P95</th><th>Teslim P99</th><th>Gecikme örneği</th><th>Kuyruk</th></tr></thead><tbody>{active.ueResults.map((ue) => <tr key={ue.ueId}><td><span
className="ue-dot" style={{ background: ueColor(ue.ueId) }} /><b>UE {String(ue.ueId).padStart(2, '0')}</b></td><td> <Badge>{ue.fiveQi}</Badge></td><td>{ue.resourceType}</td><td>{number.format(ue.offeredLoadMbps)} Mbps</td> <td>{ue.gbrMbps > 0 ? `${number.format(ue.gbrMbps)} Mbps` : '—'}</td><td><b>{number.format(ue.throughputMbps)} Mbps</b></td><td>{ue.gbrSatisfied === null ? '—' : ue.gbrSatisfied ? 'Karşılandı' : 'Karşılanmadı'}</td><td>{number.format(ue.delayP50Ms)} ms</td><td>{number.format(ue.delayP95Ms)} ms</td><td> {number.format(ue.delayP99Ms)} ms</td><td>{ue.latencySamplePackets}</td><td>{ue.queuedPackets}</td></tr>)} </tbody></DataTable>
 </>
}
function WorkerStatus({ status, error }: { status: 'running' | 'ready' | 'error'; error?: string }) { const failed = status === 'error'; return <section className={`worker-status ${failed ? 'error' : 'running'}`}><div className="worker-spinner" /> <h1>{failed ? 'Simülasyon çalıştırılamadı' : 'Simülasyon hesaplanıyor'}</h1><p>{failed ? error : 'Tek-seed ve çoklu-seed sonuçları arka planda hazırlanıyor. Arayüzü kullanmaya devam edebilirsin.'}</p></section> }
function PageTitle({ eyebrow, title, description, seed }: { eyebrow: string; title: string; description: string; seed?: number }) { return <div className="page-title"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div> {seed !== undefined && <code>SEED #{seed}</code>}</div> }
function Kpi({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) { return <article className={`kpi ${accent ? 'accent' : ''}`}><span>{label}</span><strong>{value}</strong><small>{note} </small></article> }
function Panel({ title, subtitle, className = '', children }: { title: string; subtitle: string; className?: string; children: React.ReactNode }) { return <section className={`panel ${className}`}><header><div><h2>{title}</h2><p> {subtitle}</p></div></header>{children}</section> }
function Badge({ children }: { children: React.ReactNode }) { return <span className="badge">{children}</span> } function DataTable({ children }: { children: React.ReactNode }) { return <details className="data-panel"><summary> <span>UE ayrıntı tablosu</span><small>Görüntülemek için aç</small></summary><div className="table-scroll">< table>{children}</table></div></details> }
function BatchAnalysis({ result }: { result: M1BatchResult }) {
 return <details className="batch-panel"><summary><div><span>Çoklu seed güvenilirlik analizi</span><small> {result.seeds.length} ortak seed · Student-t %95 güven aralığı · eşleştirilmiş farklar</small></div><b>Sonuçları aç</b> </summary>
   <div className="batch-grid">{result.schedulerResults.map((item) => <article key={item.scheduler}><h3>{
item.schedulerLabel}</h3><div><span>Ortalama throughput</span><strong>{number.format(item.throughputMbps.mean)} ± {number.format(item.throughputMbps.confidence95HalfWidth)} Mbps</strong><small>σ = {number.format(item.throughputMbps.standardDeviation)}</small></div><div><span>Ortalama Jain</span><strong> {number.format(item.jainFairness.mean)} ± {number.format(item.jainFairness.confidence95HalfWidth)}</strong> <small>σ = {number.format(item.jainFairness.standardDeviation)}</small></div></article>)}</div>
   <PairwiseComparisonTable comparisons={result.pairwiseComparisons} />
 </details>
}
function PairwiseComparisonTable({ comparisons }: { comparisons: M1BatchResult['pairwiseComparisons'] }) {
 return <section className="paired-analysis"><header><h3>Seed başına eşleştirilmiş algoritma farkları</h3> <p>Fark = karşılaştırılan algoritma − referans algoritma. Güven aralığı sıfırı içermiyorsa fark aynı seed’ler altında daha güçlü kanıt taşır.</p></header><div className="table-scroll"><table><thead><tr><th>Referans</th> <th>Karşılaştırılan</th><th>Δ throughput</th><th>Δ Jain</th><th>Seed</th></tr></thead><tbody>{comparisons.map( (item) => <tr key={`${item.baselineScheduler}-${item.comparatorScheduler}`}><td>{item.baselineSchedulerLabel}</td><td><b>{item.comparatorSchedulerLabel}</b></td><td><b>{number.format(item.throughputDifferenceMbps.mean)} ± {number.format(item.throughputDifferenceMbps.confidence95HalfWidth)} Mbps</b></td><td><b>{number.format(item.jainFairnessDifference.mean)} ± {number.format(item.jainFairnessDifference.confidence95HalfWidth)} </b></td><td>{item.runCount}</td></tr>)}</tbody></table></div></section>
}
function CellMatrixAnalysis({ result }: { result: M1CellMatrixResult }) {
 const cellCount = new Set(result.rows.map((item) => item.cell.id)).size
 const schedulerCount = new Set(result.rows.map((item) => item.scheduler)).size
 const conditionCount = cellCount * schedulerCount
 const decisions = summarizeM1CellTradeoffs(result)
 return <details className="matrix-panel"><summary><div><span>Tüm hücreler M1 deney matrisi</span><small>{ cellCount} hücre × {schedulerCount} scheduler · {result.seeds.length} ortak seed · %95 güven aralığı</small></div> <b>{conditionCount} koşulu aç</b></summary><div className="decision-section"><header><h3>Hücre bazlı karar özeti</h3><p>Liderler ve Pareto kümesi ortalama throughput ile ortalama Jain değerlerinden hesaplanır.</p> </header><div className="decision-grid">{decisions.map((decision) => <article key={decision.cell.id}><div
className="decision-cell"><strong>{decision.cell.bandMHz} / {decision.cell.bandwidthMHz} MHz</strong><span> {decision.cell.resourceBlocks} RB · {decision.cell.scsKHz} kHz</span></div><div className="decision-metric">< span>En yüksek ort. throughput</span><b>{decision.throughputLeaders.map((row) => row.schedulerLabel).join(' / ')} </b><small>{number.format(decision.throughputLeaders[0].throughputMbps.mean)} Mbps</small></div><div
className="decision-metric"><span>En yüksek ort. fairness</span><b>{decision.fairnessLeaders.map((row) => row.schedulerLabel).join(' / ')}</b><small>Jain {number.format(decision.fairnessLeaders[0].jainFairness.mean)}
</small></div><div className="pareto-list"><span>Pareto-optimal</span><div>{decision.paretoRows.map((row) => <i key={row.scheduler} style={{ borderColor: schedulerColor(row.scheduler), color: schedulerColor(row.scheduler) }}> {row.schedulerLabel}</i>)}</div></div></article>)}</div></div><div className="matrix-figure"><div><h3>Throughput– fairness karşılaştırması</h3><p>Her panel bağımsız throughput ölçeği kullanır; hata çubukları %95 güven aralığıdır.</p></div><CellMatrixChart result={result} /></div><div className="table-scroll"><table><thead><tr><th>Hücre</th> <th>Kaynak</th><th>Scheduler</th><th>Ort. throughput</th><th>Throughput σ</th><th>Ort. Jain</th><th>Jain σ</th></tr></thead><tbody>{result.rows.map((item) => <tr key={`${item.cell.id}-${item.scheduler}`}><td><b>{item.cell.bandMHz} / {item.cell.bandwidthMHz} MHz</b></td><td>{item.cell.resourceBlocks} RB · {item.cell.scsKHz}
kHz</td><td><Badge>{item.schedulerLabel}</Badge></td><td><b>{number.format(item.throughputMbps.mean)} ± {number.format(item.throughputMbps.confidence95HalfWidth)} Mbps</b></td><td>{number.format(item.throughputMbps.standardDeviation)}</td><td><b>{number.format(item.jainFairness.mean)} ±
{number.format(item.jainFairness.confidence95HalfWidth)}</b></td><td>{number.format(item.jainFairness.standardDeviation)}</td></tr>)}</tbody></table></div><CellMatrixPairwiseTable rows={result.pairwiseRows} /> </details>
}
function CellMatrixPairwiseTable({ rows }: { rows: M1CellMatrixResult['pairwiseRows'] }) {
 return <section className="paired-analysis matrix-paired-analysis"><header><h3>Tüm hücrelerde eşleştirilmiş farklar</h3><p>Aynı hücre ve seed için karşılaştırılan algoritma − referans algoritma.</p></header><div
className="table-scroll"><table><thead><tr><th>Hücre</th><th>Referans</th><th>Karşılaştırılan</th><th>Δ
throughput</th><th>Δ Jain</th></tr></thead><tbody>{rows.map((item) => <tr key={`${item.cell.id}-${item.baselineScheduler}-${item.comparatorScheduler}`}><td><b>{item.cell.bandMHz}/{item.cell.bandwidthMHz} MHz</b> </td><td>{item.baselineSchedulerLabel}</td><td>{item.comparatorSchedulerLabel}</td><td><b>{number.format(item.throughputDifferenceMbps.mean)} ± {number.format(item.throughputDifferenceMbps.confidence95HalfWidth)}
Mbps</b></td><td><b>{number.format(item.jainFairnessDifference.mean)} ± {number.format(item.jainFairnessDifference.confidence95HalfWidth)}</b></td></tr>)}</tbody></table></div></section> }
function CellMatrixChart({ result }: { result: M1CellMatrixResult }) {
 const schedulerEntries = [...new Map(result.rows.map((item) => [item.scheduler, item.schedulerLabel])).entries()]
 const data = schedulerEntries.map(([kind, label]) => {
   const rows = result.rows.filter((item) => item.scheduler === kind)
   const style = schedulerChartStyle(kind, schedulerColor(kind))
   return {
     type: 'scatter',
     mode: 'markers',
     name: label,
     x: rows.map((item) => item.throughputMbps.mean),
     y: rows.map((item) => item.jainFairness.mean),
     marker: {
       size: style.size,
       color: style.color,
       symbol: style.symbol,
       line: { color: style.color, width: style.symbol.includes('open') ? 3 : 1.5 },
       opacity: 0.96,
     },
     error_x: {
       type: 'data',
       array: rows.map((item) => item.throughputMbps.confidence95HalfWidth),
       visible: true,
       color: style.color,
       thickness: 1.8,
       width: 5,
     },
     error_y: {
       type: 'data',
       array: rows.map((item) => item.jainFairness.confidence95HalfWidth),
       visible: true,
       color: style.color,
       thickness: 1.8,
       width: 5,
     },
     customdata: rows.map((item) => [
       `${item.cell.bandMHz}/${item.cell.bandwidthMHz} MHz`,
       item.cell.resourceBlocks,
       item.cell.scsKHz,
       item.throughputMbps.confidence95HalfWidth,
       item.jainFairness.confidence95HalfWidth,
     ]),
     hovertemplate: '<b>%{fullData.name}</b><br>Hücre: %{customdata[0]}<br>Throughput: %{x:.3f} ± %{customdata[3]:.3f} Mbps<br>Jain: %{y:.4f} ± %{customdata[4]:.4f}<br>Kaynak: %{customdata[1]} RB · %{customdata[2]} kHz SCS<extra></extra>',
   }
 })
 return <PlotlyChart id="m1-cell-matrix-chart" data={data} layout={{
   xaxis:{ title:'Hücre throughput (Mbps)', gridcolor:'#e5e7eb' },
   yaxis:{ title:'Jain adalet indeksi', range:[0,1.02], gridcolor:'#e5e7eb' },
   legend:{ orientation:'h', y:1.14 },
   margin:{ t:75, r:35, b:75, l:80 },
   hovermode:'closest',
 }} ariaLabel="Tüm hücreler için scheduler renkleri ve sembolleri ayrılmış throughput fairness karşılaştırması" minHeight={560} />
}
export function LegacyCellMatrixChart({ result }: { result: M1CellMatrixResult }) {
 const cells = [...new Map(result.rows.map((item) => [item.cell.id, item.cell])).values()]
 const schedulers = [...new Map(result.rows.map((item) => [item.scheduler, item.schedulerLabel])).entries()]
 const width = 960, height = 510, cardWidth = 292, cardHeight = 205, gap = 18
 const cardPositions = cells.map((_, index) => {
   const row = Math.floor(index / 3), column = index % 3
   const countInRow = Math.min(3, cells.length - row * 3)
   const rowWidth = countInRow * cardWidth + (countInRow - 1) * gap
   return { x: (width - rowWidth) / 2 + column * (cardWidth + gap), y: 18 + row * (cardHeight + gap) }
 })
 return <div className="matrix-chart-scroll"><svg id="m1-cell-matrix-chart" className="matrix-chart" viewBox={`0 0${width} ${height}`} role="img" aria-label="Beş hücre için throughput fairness karşılaştırması">
   <rect width={width} height={height} className="matrix-background" />
   {cells.map((cell, cellIndex) => {
     const rows = result.rows.filter((item) => item.cell.id === cell.id)
     const { x: cardX, y: cardY } = cardPositions[cellIndex]
     const plot = { left: cardX + 42, right: cardX + cardWidth - 15, top: cardY + 45, bottom: cardY + cardHeight - 34 }
     const plotWidth = plot.right - plot.left, plotHeight = plot.bottom - plot.top
     const maxThroughput = Math.max(...rows.map((item) => item.throughputMbps.mean + item.throughputMbps.confidence95HalfWidth), 1) * 1.08
     const x = (value: number) => plot.left + Math.max(0, Math.min(value, maxThroughput)) / maxThroughput * plotWidth
     const y = (value: number) => plot.bottom - Math.max(0, Math.min(value, 1)) * plotHeight
     return <g key={cell.id} className="matrix-card">
       <rect x={cardX} y={cardY} width={cardWidth} height={cardHeight} rx="6" />
       <text x={cardX + 14} y={cardY + 22} className="matrix-card-title">{cell.bandMHz} MHz · {cell.bandwidthMHz} MHz kanal</text>
       <text x={cardX + 14} y={cardY + 36} className="matrix-card-subtitle">{cell.resourceBlocks} RB · {cell.scsKHz} kHz SCS</text>
       {[0, .5, 1].map((tick) => <g key={tick}><line x1={plot.left} y1={y(tick)} x2={plot.right} y2={y(tick)} className="grid-line" /><text x={plot.left - 7} y={y(tick) + 3} textAnchor="end" className="matrix-tick">{number.format(tick)}</text></g>)}
       {[0, .5, 1].map((ratio) => <text key={ratio} x={plot.left + plotWidth * ratio} y={plot.bottom + 16}
textAnchor="middle" className="matrix-tick">{number.format(maxThroughput * ratio)}</text>)}
       <line x1={plot.left} y1={plot.top} x2={plot.left} y2={plot.bottom} className="axis" />
       <line x1={plot.left} y1={plot.bottom} x2={plot.right} y2={plot.bottom} className="axis" />
       {rows.map((item) => {
         const cx = x(item.throughputMbps.mean), cy = y(item.jainFairness.mean)
         const xLow = x(item.throughputMbps.mean - item.throughputMbps.confidence95HalfWidth)
         const xHigh = x(item.throughputMbps.mean + item.throughputMbps.confidence95HalfWidth)
         const yLow = y(item.jainFairness.mean - item.jainFairness.confidence95HalfWidth)
         const yHigh = y(item.jainFairness.mean + item.jainFairness.confidence95HalfWidth)
         return <g key={item.scheduler} className={`matrix-point ${item.scheduler}`} style={{ color: schedulerColor(item.scheduler) }}>
           <line x1={xLow} y1={cy} x2={xHigh} y2={cy} className="error-bar" /><line x1={xLow} y1={cy - 3} x2={xLow} y2={cy + 3} className="error-bar" /><line x1={xHigh} y1={cy - 3} x2={xHigh} y2={cy + 3} className="error-bar" />
           <line x1={cx} y1={yLow} x2={cx} y2={yHigh} className="error-bar" /><line x1={cx - 3} y1={yLow} x2={cx + 3} y2={yLow} className="error-bar" /><line x1={cx - 3} y1={yHigh} x2={cx + 3} y2={yHigh} className="error-bar" />
           <circle cx={cx} cy={cy} r="5.5"><title>{`${item.schedulerLabel}: ${number.format(item.throughputMbps.mean)}Mbps, Jain ${number.format(item.jainFairness.mean)}`}</title></circle>
         </g>
       })}
       <text x={(plot.left + plot.right) / 2} y={cardY + cardHeight - 8} textAnchor="middle" className="matrix-axis-title"> Throughput (Mbps)</text>
     </g>
   })}
   <text x="14" y={height / 2} textAnchor="middle" className="matrix-axis-title" transform={`rotate(-90 14 ${height /2})`}>Jain adalet indeksi</text>
   <g className="matrix-legend" transform={`translate(${width / 2 - schedulers.length * 65} ${height - 27})`}> {schedulers.map(([kind, label], index) => <g key={kind} transform={`translate(${index * 130} 0)`} style={{ color: schedulerColor(kind) }}><circle cx="0" cy="0" r="5" /><text x="10" y="4">{schedulerShortLabel(kind, label)}</text> </g>)}</g>
 </svg></div>
}
function ResourceGrid({ count }: { count: number }) {
 return <div className="rb-grid" style={{ gridTemplateColumns: `repeat(${Math.min(count, 26)}, 1fr)` }}>
   {Array.from({ length: count }, (_, index) => <span key={index} title={`RB ${index + 1}`}>
     {count <= 26 || (index + 1) % 10 === 0 ? index + 1 : ''}
   </span>)}
 </div>
}
function SinrRateChart({ ues }: { ues: UeResult[] }) {
 const data = [{ type:'scatter', mode:'markers', name:'UE', x:ues.map((ue) => ue.sinrDb), y:ues.map((ue) => ue.achievableRateMbps), marker:{size:11,color:ues.map((ue) => ueColor(ue.id)),line:{color:'#fff',width:2}}, customdata:ues.map((ue) => [ue.id,ue.cqi,ue.mcs]), hovertemplate:'<b>UE %{customdata[0]}</b><br>SINR: %{x:.2f}dB<br>Achievable rate: %{y:.3f} Mbps<br>CQI: %{customdata[1]}<br>MCS: %{customdata[2]}<extra></extra>' }]
 return <PlotlyChart id="m0-sinr-rate-chart" data={data} layout={{xaxis:{title:'SINR (dB)',gridcolor:'#e5e7eb'},yaxis: {title:'Achievable rate (Mbps)',rangemode:'tozero',gridcolor:'#e5e7eb'},showlegend:false,margin:{t:40,r:30,b:70,l:80}}} ariaLabel="Etkileşimli SINR ve ulaşılabilir hız saçılım grafiği" minHeight={440} />
}
export function LegacySinrRateChart({ ues }: { ues: UeResult[] }) {
 const width = 660, height = 245, pad = 38
 const minX = Math.min(...ues.map((ue) => ue.sinrDb)) - 1, maxX = Math.max(...ues.map((ue) => ue.sinrDb)) + 1
 const maxY = Math.max(...ues.map((ue) => ue.achievableRateMbps), 1) * 1.12
 const x = (value: number) => pad + (value - minX) / (maxX - minX) * (width - pad * 1.4)
 const y = (value: number) => height - pad - value / maxY * (height - pad * 1.5)
 return <svg id="m0-sinr-rate-chart" className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="SINR ve ulaşılabilir hız saçılım grafiği">
   {[0, .25, .5, .75, 1].map((ratio) => <g key={ratio}><line x1={pad} y1={y(maxY * ratio)} x2={width - 16} y2={y(maxY * ratio)} className="grid-line" /><text x={pad - 7} y={y(maxY * ratio) + 3} textAnchor="end">{number.format(maxY * ratio)}</text></g>)}
   <line x1={pad} y1={10} x2={pad} y2={height - pad} className="axis" /><line x1={pad} y1={height - pad} x2={width -16} y2={height - pad} className="axis" />
   {ues.map((ue) => <g key={ue.id}><circle cx={x(ue.sinrDb)} cy={y(ue.achievableRateMbps)} r="5" style={{ fill: ueColor(ue.id) }}><title>{`UE ${ue.id}: ${number.format(ue.sinrDb)} dB, ${number.format(ue.achievableRateMbps)}Mbps`}</title></circle></g>)}
   <text x={width / 2} y={height - 7} textAnchor="middle" className="axis-title">SINR (dB)</text><text x="12" y= {height / 2} textAnchor="middle" className="axis-title" transform={`rotate(-90 12 ${height / 2})`}>Hız (Mbps)</text>
 </svg>
}
function FairnessChart({ results, selected }: { results: M1Result[]; selected: SchedulerKind }) {
 const data = results.flatMap((item) => {
   if (item.jainFairness === null) return []
   const style = schedulerChartStyle(item.scheduler, schedulerColor(item.scheduler))
   const isSelected = item.scheduler === selected
   return [{
     type:'scatter',
     mode:'markers+text',
     name:item.schedulerLabel,
     x:[item.cellThroughputMbps],
     y:[item.jainFairness],
     text:[schedulerShortLabel(item.scheduler, item.schedulerLabel)],
     textposition:style.textPosition,
     textfont:{ color:style.color, size:12 },
     cliponaxis:false,
     marker:{
       size:style.size + (isSelected ? 3 : 0),
       color:style.color,
       symbol:style.symbol,
       line:{ color:isSelected ? '#17233c' : style.color, width:isSelected ? 3 : style.symbol.includes('open') ? 3 : 1.5 },
       opacity:1,
     },
     hovertemplate:'<b>%{fullData.name}</b><br>Hücre throughput: %{x:.3f} Mbps<br>Jain: %{y:.4f}<extra></extra>',
   }]
 })
 return <PlotlyChart id="m1-fairness-chart" data={data} layout={{
   xaxis:{ title:'Hücre throughput (Mbps)', gridcolor:'#e5e7eb', automargin:true },
   yaxis:{ title:'Jain adalet indeksi', range:[0,1.04], gridcolor:'#e5e7eb' },
   legend:{ orientation:'h', y:1.16 },
   margin:{ t:85, r:50, b:75, l:75 },
   hovermode:'closest',
 }} ariaLabel="Scheduler renk, sembol ve etiketleri ayrılmış throughput fairness karşılaştırması" minHeight={460} />
}
function LinkPipeline({ ue }: { ue: UeResult }) { const steps = [[`${number.format(ue.sinrDb)} dB`, 'SINR'], [String(ue.cqi), 'CQI'], [ue.mcs, 'MCS'], [`${number.format(ue.achievableRateMbps)} Mbps`, 'Hız']]; return <div
className="pipeline">{steps.map(([value, label], index) => <div className="pipeline-step" key={label}><span> {label}</span><strong>{value}</strong>{index < steps.length - 1 && <i>→</i>}</div>)}</div> }
function CqiDistribution({ ues }: { ues: UeResult[] }) { const counts = Array.from({ length: 16 }, (_, cqi) => ues.filter((ue) => ue.cqi === cqi).length); const max = Math.max(...counts, 1); return <div className="cqi-chart">{counts.map((count, cqi) => <div key={cqi} title={`CQI ${cqi}: ${count} UE`}><span style={{ height: `${Math.max(count ? 8 : 1,count / max * 100)}%` }} /><small>{cqi}</small></div>)}</div> }
function ThroughputBars({ result }: { result: M1Result }) { const max = Math.max(...result.ueResults.map((ue) => ue.throughputMbps), 1); return <div className="horizontal-bars">{result.ueResults.map((ue) => <div key={ue.ueId}> <label><span><i style={{ background: ueColor(ue.ueId) }} />UE {ue.ueId}</span><b>{number.format(ue.throughputMbps)} Mbps</b></label><div><span style={{ width: `${ue.throughputMbps / max * 100}%`, background: ueColor(ue.ueId) }} /></div></div>)}</div> }
export default App
