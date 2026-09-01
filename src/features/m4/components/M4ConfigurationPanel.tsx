import { CELL_CONFIGS } from '../../../config/cells'
import { M4_CONFIG } from '../../../config/m4Config'
import { resolveM4Scheduler } from '../../../simulation/m4SchedulerResolver'
import { M4_SCHEDULER_KINDS } from '../../../simulation/m4Types'
import type { M4FormState, M4FormValidation } from '../m4FormState'
import { M4_MAX_TOTAL_UE, M4_WORKLOAD_LIMIT } from '../m4FormState'
import type { FormEventHandler } from 'react'
export function M4ConfigurationPanel(props: {
 state: M4FormState
 validation: M4FormValidation
 running: boolean
 onChange: (state: M4FormState) => void
 onSubmit: FormEventHandler<HTMLFormElement>
 onCancel: () => void
 onReset: () => void
}) {
 const update = (changes: Partial<M4FormState>) => props.onChange({ ...props.state, ...changes })
 const updateSlice = (index: number, changes: Partial<M4FormState['slices'][number]>) =>
   update({ slices: props.state.slices.map((slice, current) => current === index ? { ...slice, ...changes } : slice) })
 const enabledTotalUe = props.state.slices.reduce((sum, slice) => sum + (slice.enabled ? slice.ueCount : 0), 0)
 const maximumForSlice = (index: number) => Math.max(0, M4_MAX_TOTAL_UE - props.state.slices.reduce(
   (sum, slice, current) => sum + (current !== index && slice.enabled ? slice.ueCount : 0),
   0,
 ))
 const updateUeCount = (index: number, raw: string) => {
   const value = Number(raw)
   if (!Number.isFinite(value)) return
   updateSlice(index, { ueCount: Math.min(maximumForSlice(index), Math.max(0, Math.round(value))) })
 }
 const updateEnabled = (index: number, enabled: boolean) => {
   const slice = props.state.slices[index]
   updateSlice(index, {
     enabled,
     ueCount: enabled ? Math.min(slice.ueCount, maximumForSlice(index)) : slice.ueCount,
   })
 }
 return <form id="m4-simulation-form" className="m4-config panel" aria-labelledby="m4-config-title" onSubmit= {props.onSubmit} noValidate>
   <h2 id="m4-config-title">Deney konfigürasyonu</h2>
   <div className="m4-general-fields">
     <label>Hücre<select value={props.state.cellId} onChange={(event) => update({ cellId: event.target.value })}> {CELL_CONFIGS.map((cell) => <option key={cell.id} value={cell.id}>{cell.bandMHz} MHz · {cell.bandwidthMHz} MHz · {cell.resourceBlocks} RB</option>)}</select></label>
     <label>Base seed<input type="number" value={props.state.baseSeed} onChange={(event) => update({
baseSeed: Number(event.target.value) })} /></label>
     <label>Slot sayısı<input type="number" min="1" value={props.state.slotCount} onChange={(event) => update({ slotCount: Number(event.target.value) })} /></label>
     <label>Resource trace limiti<input type="number" min="0" value={props.state.resourceTraceSlotLimit} onChange= {(event) => update({ resourceTraceSlotLimit: Number(event.target.value) })} /></label>
     <div className="m4-readonly-field"><span>Inter-slice policy</span><strong>Static weighted</strong><small> Kaynaklar slice ağırlıkları ve minimum paylara göre statik olarak bölüştürülür.</small></div>
     <label className="m4-check"><input type="checkbox" checked={props.state.redistributionEnabled} onChange= {(event) => update({ redistributionEnabled: event.target.checked })} /> Kullanılmayan garantiyi yeniden dağıt</label>
   </div>
   <div className="m4-slice-configs">{props.state.slices.map((slice, index) => {
     const metadata = M4_CONFIG.slices[index]
     return <fieldset key={slice.id} style={{ borderTopColor: metadata.color }}>
       <legend>{metadata.label}</legend>
       <label className="m4-check"><input type="checkbox" checked={slice.enabled} onChange={(event) => updateEnabled(index, event.target.checked)} /> Etkin</label>
       <label>UE sayısı<input type="number" min="0" max={maximumForSlice(index)} value={slice.ueCount} disabled={!slice.enabled} onChange={(event) => updateUeCount(index, event.target.value)} /><small>Bu dilim için en fazla {maximumForSlice(index)} · toplam sınır {M4_MAX_TOTAL_UE}</small></label>
       <label>Ağırlık<input type="number" min="0" step="0.1" value={slice.weight} onChange={(event) => updateSlice(index, { weight: Number(event.target.value) })} /></label>
       <label>Minimum pay<input type="number" min="0" max="1" step="0.05" value={slice.minimumShare}
onChange={(event) => updateSlice(index, { minimumShare: Number(event.target.value) })} /></label>
       <label>Slice scheduler<select value={slice.scheduler} onChange={(event) => updateSlice(index, { scheduler: event.target.value as typeof slice.scheduler })}>{M4_SCHEDULER_KINDS.map((kind) => <option key={kind} value= {kind}>{resolveM4Scheduler(kind).label}</option>)}</select></label>
       <p>Allowed 5QI: <strong>{metadata.allowedFiveQis.join(', ')}</strong></p>
     </fieldset>
   })}</div>
   <div className={`m4-ue-total ${enabledTotalUe === M4_MAX_TOTAL_UE ? 'at-limit' : ''}`}><span>Toplam etkin UE</span><strong>{enabledTotalUe} / {M4_MAX_TOTAL_UE}</strong><small>Üç slice birlikte en fazla 100 UE kabul eder; 100 geçerli bir değerdir.</small></div>
   <div className={`m4-workload ${props.validation.workloadExceeded ? 'danger' : ''}`}>
     <span>Tahmini deney yükü · UE × RB × slot</span>
     <strong>{props.validation.workUnits?.toLocaleString('tr-TR') ?? '—'} / {M4_WORKLOAD_LIMIT.toLocaleString('tr-TR')} UE-RB-slot</strong>
   </div>
   {!props.validation.valid && <div className="m4-form-errors" role="alert"><strong>Konfigürasyonu düzeltin: </strong><ul>{props.validation.errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
   <div className="m4-actions">
     <button type="submit" className="m4-primary" disabled={!props.validation.valid || props.running}>{props.running ? 'Simülasyon çalışıyor…' : 'M4 Simülasyonunu Çalıştır'}</button>
     <button type="button" disabled={!props.running} onClick={props.onCancel}>İptal Et</button>
     <button type="button" onClick={props.onReset}>Varsayılanlara Dön</button>
   </div>
 </form>
}
