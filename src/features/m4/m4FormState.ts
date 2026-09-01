import { CELL_CONFIGS } from '../../config/cells'
import { M4_CONFIG, validateM4RuntimeConfig } from '../../config/m4Config'
import simulationConfig from '../../config/simulation.json'
import { DEFAULT_SCENARIO, runM0 } from '../../simulation/m0'
import { DEFAULT_M2_CONFIG } from '../../simulation/m2'
import { calculateM4WorkUnits } from '../../simulation/m4WorkloadGuard'
import {
 M4_SCHEDULER_KINDS,
 type M4RunInput,
 type M4SchedulerKind,
 type SliceId,
} from '../../simulation/m4Types'
export const M4_MAX_TOTAL_UE = 100
export interface M4SliceFormState {
 readonly id: SliceId
 readonly enabled: boolean
 readonly ueCount: number
 readonly weight: number
 readonly minimumShare: number
 readonly scheduler: M4SchedulerKind
}
export interface M4FormState {
 readonly cellId: string
 readonly baseSeed: number
 readonly slotCount: number
 readonly resourceTraceSlotLimit: number
 readonly redistributionEnabled: boolean
 readonly slices: readonly M4SliceFormState[]
}
export interface M4FormValidation {
 readonly valid: boolean
 readonly errors: readonly string[]
 readonly workUnits: number | null
 readonly workloadExceeded: boolean
}
export const createDefaultM4FormState = (): M4FormState => {
 const total = DEFAULT_SCENARIO.ueCount
 const weightTotal = M4_CONFIG.slices.reduce((sum, slice) => sum + slice.defaultWeight, 0)
 const counts = M4_CONFIG.slices.map((slice, index) => index === M4_CONFIG.slices.length - 1
   ? 0
   : Math.floor(total * slice.defaultWeight / weightTotal))
 counts[counts.length - 1] = total - counts.slice(0, -1).reduce((sum, count) => sum + count, 0)
 return {
   cellId: CELL_CONFIGS[2].id,
   baseSeed: DEFAULT_SCENARIO.seed,
   slotCount: DEFAULT_M2_CONFIG.slotCount,
   resourceTraceSlotLimit: DEFAULT_M2_CONFIG.traceSlotLimit ?? 30,
   redistributionEnabled: M4_CONFIG.redistributionEnabled,
   slices: M4_CONFIG.slices.map((slice, index) => ({
     id: slice.id,
     enabled: counts[index] > 0,
     ueCount: counts[index],
     weight: slice.defaultWeight,
     minimumShare: slice.defaultMinimumShare,
     scheduler: slice.defaultScheduler,
   })),
 }
}
export function validateM4FormState(state: M4FormState): M4FormValidation {
 const errors: string[] = []
 const cell = CELL_CONFIGS.find((item) => item.id === state.cellId)
 if (!cell) errors.push('Geçerli bir hücre konfigürasyonu seçin.')
 if (!Number.isSafeInteger(state.baseSeed)) errors.push('Base seed güvenli tam sayı olmalıdır.')
 if (!Number.isSafeInteger(state.slotCount) || state.slotCount <= 0) errors.push('Slot sayısı pozitif güvenli tam sayıolmalıdır.')
 if (!Number.isSafeInteger(state.resourceTraceSlotLimit) || state.resourceTraceSlotLimit < 0) {
   errors.push('Trace limiti negatif olmayan güvenli tam sayı olmalıdır.')
 }
 if (state.slices.length !== M4_CONFIG.slices.length
   || state.slices.some((slice, index) => slice.id !== M4_CONFIG.slices[index].id)) {
   errors.push('Slice sırası eMBB, URLLC, mMTC olmalıdır.')
 }
 state.slices.forEach((slice) => {
   if (!Number.isSafeInteger(slice.ueCount) || slice.ueCount < 0 || slice.ueCount > M4_MAX_TOTAL_UE) errors.push(`${slice.id} UE sayısı 0–${M4_MAX_TOTAL_UE} arasında olmalıdır.`)
   if (!Number.isFinite(slice.weight) || slice.weight < 0) errors.push(`${slice.id} ağırlığı geçersiz.`)
   if (!Number.isFinite(slice.minimumShare) || slice.minimumShare < 0 || slice.minimumShare > 1) {
     errors.push(`${slice.id} minimum payı 0–1 arasında olmalıdır.`)
   }
   if (!M4_SCHEDULER_KINDS.includes(slice.scheduler)) errors.push(`${slice.id} scheduler desteklenmiyor.`)
 })
 const enabled = state.slices.filter((slice) => slice.enabled)
 const totalUe = enabled.reduce((sum, slice) => sum + slice.ueCount, 0)
 if (totalUe <= 0) errors.push('Toplam etkin UE sayısı pozitif olmalıdır.')
 if (totalUe > M4_MAX_TOTAL_UE) errors.push(`Toplam etkin UE sayısı ${M4_MAX_TOTAL_UE} değerini aşamaz.`)
 if (enabled.reduce((sum, slice) => sum + slice.weight, 0) <= 0) errors.push('Etkin slice ağırlık toplamı pozitifolmalıdır.')
 if (enabled.reduce((sum, slice) => sum + slice.minimumShare, 0) > 1 + Number.EPSILON) {
   errors.push('Etkin slice minimum pay toplamı 1’i aşamaz.')
 }
 let workUnits: number | null = null
 if (cell && totalUe > 0 && Number.isSafeInteger(state.slotCount) && state.slotCount > 0) {
   try {
     workUnits = calculateM4WorkUnits({
       ueCount: totalUe,
       resourceBlockCount: cell.resourceBlocks,
       slotCount: state.slotCount,
     })
   } catch (error) {
     errors.push(error instanceof Error ? error.message : 'Workload hesaplanamadı.')
   }
 }
 const workloadExceeded = workUnits !== null && workUnits > simulationConfig.experiments.maxWorkUnits
 if (workloadExceeded) errors.push('Tahmini M4 deney yükü güvenli sınırı aşıyor.')
 return Object.freeze({
   valid: errors.length === 0,
   errors: Object.freeze(errors),
   workUnits,
   workloadExceeded,
 })
}
export function createM4RunInputFromForm(state: M4FormState): M4RunInput {
 const validation = validateM4FormState(state)
 if (!validation.valid) throw new Error(validation.errors.join(' '))
 const cell = CELL_CONFIGS.find((item) => item.id === state.cellId)!
 const counts = Object.fromEntries(
   state.slices.map((slice) => [slice.id, slice.enabled ? slice.ueCount : 0]),
 ) as Record<SliceId, number>
 const totalUeCount = Object.values(counts).reduce((sum, value) => sum + value, 0)
 const metadata = new Map(M4_CONFIG.slices.map((slice) => [slice.id, slice]))
 const m4Config = validateM4RuntimeConfig({
   schemaVersion: 1,
   totalUeCount,
   interSlicePolicy: 'static-weighted',
   redistributionEnabled: state.redistributionEnabled,
   slices: state.slices.map((slice) => ({
     ...metadata.get(slice.id)!,
     enabled: counts[slice.id] > 0,
     ueCount: counts[slice.id],
     weight: slice.weight,
     minimumShare: slice.minimumShare,
     scheduler: slice.scheduler,
   })),
 })
 const scenario = { ...DEFAULT_SCENARIO, ueCount: totalUeCount, seed: state.baseSeed }
 return {
   cell: structuredClone(cell),
   ues: runM0(cell, scenario).ues,
   m2Config: {
     ...structuredClone(DEFAULT_M2_CONFIG),
     slotCount: state.slotCount,
   },
   m4Config,
   baseSeed: state.baseSeed,
   resourceTraceSlotLimit: state.resourceTraceSlotLimit,
 }
}
export const M4_WORKLOAD_LIMIT = simulationConfig.experiments.maxWorkUnits
