import { useMemo, useState, type FormEvent } from 'react'
import { downloadText } from '../../exports/download'
import { serializeM4Result } from '../../exports/m4Serialize'
import { useM4SimulationWorker } from '../../hooks/useM4SimulationWorker'
import { M4CellSummary } from './components/M4CellSummary'
import { M4ConfigurationPanel } from './components/M4ConfigurationPanel'
import { M4LatencyChart } from './components/M4LatencyChart'
import { M4ResourceChart } from './components/M4ResourceChart'
import { M4ResourceCompositionChart } from './components/M4ResourceCompositionChart'
import { M4ResourceTrace } from './components/M4ResourceTrace'
import { M4ResourceTrendChart } from './components/M4ResourceTrendChart'
import { M4SliceCards } from './components/M4SliceCards'
import { M4SliceComparisonTable } from './components/M4SliceComparisonTable'
import { M4ThroughputChart } from './components/M4ThroughputChart'
import { M4ServiceQualityChart } from './components/M4ServiceQualityChart'
import { createDefaultM4FormState, validateM4FormState } from './m4FormState'
import { createM4ViewModel } from './m4ViewModel'
import { submitM4Form } from './m4Submit'
import './M4Page.css'
export function M4StatusRegion(props: {
 status: 'idle' | 'running' | 'success' | 'error' | 'cancelled'
 error: string | null
}) {
 if (props.status === 'error') {
   return <section className="m4-state error" role="alert"><strong>Simülasyon çalıştırılamadı.</strong><p>{
props.error}</p></section>
 }
 const content = {
   idle: ['Hazır', 'Bir M4 senaryosu yapılandırın ve simülasyonu çalıştırın.'],
   running: ['Simülasyon çalışıyor…', 'Worker üzerinde simülasyon çalışıyor; deney güvenle iptal edilebilir.'],
   success: ['Simülasyon tamamlandı', 'Bilimsel sonuçlar ve slice kartları aşağıda gösteriliyor.'],
   cancelled: ['Simülasyon iptal edildi', 'Parametreleri değiştirip yeniden çalıştırabilirsiniz.'],
 }[props.status]
 return <section className={`m4-state ${props.status}`} role="status" aria-live="polite">
   {props.status === 'running' && <i />}
   <strong>{content[0]}</strong><p>{content[1]}</p>
 </section>
}
export function M4Results({ view }: { view: ReturnType<typeof createM4ViewModel> }) {
 return <div className="m4-results">
   <div className="m4-result-heading"><div><span>TEKRAR ÜRETİLEBİLİR SONUÇ</span><h2>Hücre ve slice sonuçları</h2><code>{view.fingerprint}</code></div></div>
   <M4CellSummary view={view} /><M4SliceCards view={view} /><M4SliceComparisonTable view={view} />
   <div className="m4-chart-grid"><M4ThroughputChart view={view} /><M4ServiceQualityChart view={view} /></div>
   <div className="m4-chart-grid"><M4ResourceChart view={view} /><M4ResourceCompositionChart view={view} /></div>
   <div className="m4-chart-grid"><M4LatencyChart view={view} /><M4ResourceTrendChart view={view} /></div>
   <M4ResourceTrace view={view} />
 </div>
}
export function M4Page() {
 const [form, setForm] = useState(createDefaultM4FormState)
 const [exportError, setExportError] = useState<string | null>(null)
 const [submitError, setSubmitError] = useState<string | null>(null)
 const worker = useM4SimulationWorker()
 const validation = useMemo(() => validateM4FormState(form), [form])
 const view = useMemo(() => worker.result ? createM4ViewModel(worker.result) : null, [worker.result])
 const reset = () => {
   worker.reset()
   setExportError(null)
   setSubmitError(null)
   setForm(createDefaultM4FormState())
 }
 const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
   setSubmitError(null)
   setSubmitError(submitM4Form({ event, state: form, running: worker.isRunning, run: worker.run }))
 }
 const exportResult = () => {
   if (!worker.result || !view) return
   try {
     downloadText(serializeM4Result(worker.result), view.exportFilename, 'application/json;charset=utf-8')
     setExportError(null)
   } catch {
     setExportError('JSON sonucu indirilemedi. Tarayıcı indirme izinlerini kontrol edin.')
   }
 }
 return <div className="m4-page">
   <header className="m4-hero"><div><span>NETWORK SLICING</span><h1>M4 Network Slicing</h1> <p>eMBB, URLLC ve mMTC dilimlerinin bağımsız zamanlayıcılarla ortak hücre kaynaklarını paylaşmasını
karşılaştırın.</p></div><aside><strong>Bilimsel kapsam</strong><p>mMTC, bu baseline’da 5QI 9 tabanlı Non-GBR proxy olarak modellenir. Packet-weighted gecikme metrikleri üretilen paketlerden hesaplanır; RB korunumu her slotta denetlenir.</p></aside></header>
   <M4ConfigurationPanel state={form} validation={validation} running={worker.isRunning} onChange={setForm} onSubmit={handleSubmit} onCancel={worker.cancel} onReset={reset} />
   {submitError && <div className="m4-form-errors" role="alert">{submitError}</div>}
   <div className="m4-export-bar"><span>Deterministik M4 sonuç paketi</span><button disabled={!worker.result} onClick={exportResult}>JSON Sonucunu İndir</button></div>
   {exportError && <div className="m4-form-errors" role="alert">{exportError}</div>}
   <M4StatusRegion status={worker.status} error={worker.error} />
   {worker.status === 'success' && view && <M4Results view={view} />}
 </div>
}
