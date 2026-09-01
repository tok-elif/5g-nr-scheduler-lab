import { CELL_CONFIGS } from './cells'
import { APPLICATION_METADATA } from './application'
import { createExperimentFingerprint } from './reproducibility'
import type { M1Config, ScenarioConfig, SchedulerKind } from '../simulation/types'
export interface ExperimentPreset {
 schemaVersion: 1
 createdAt: string
 cellId: string
 scenario: ScenarioConfig
 m1Config: M1Config
 seedCount: number
 selectedScheduler: SchedulerKind
 applicationVersion: string
 experimentId: string
}
export type ExperimentPresetInput = Omit<ExperimentPreset, 'schemaVersion' | 'createdAt' | 'applicationVersion' | 'experimentId'>
const isRecord = (value: unknown): value is Record<string, unknown> =>
 typeof value === 'object' && value !== null && !Array.isArray(value)
const numberField = (object: Record<string, unknown>, key: string): number => {
 const value = object[key]
 if (typeof value !== 'number' || !Number.isFinite(value)) {
   throw new Error(`Deney profilinde '${key}' geçerli bir sayı olmalıdır.`)
 }
 return value
}
const integerInRange = (value: number, name: string, minimum: number, maximum: number): number => {
 if (!Number.isInteger(value) || value < minimum || value > maximum) {
   throw new Error(`Deney profilinde '${name}' ${minimum}–${maximum} arasında bir tam sayı olmalıdır.`)
 }
 return value
}
function parseScenario(value: unknown): ScenarioConfig {
 if (!isRecord(value)) throw new Error("Deney profilinde 'scenario' nesnesi bulunamadı.")
 const minSinrDb = numberField(value, 'minSinrDb')
 const maxSinrDb = numberField(value, 'maxSinrDb')
 if (minSinrDb > maxSinrDb) throw new Error('Minimum SINR, maksimum SINR değerini aşamaz.')
 const overheadFraction = numberField(value, 'overheadFraction')
 if (overheadFraction < 0 || overheadFraction >= 1) {
   throw new Error('Overhead oranı 0 (dahil) ile 1 (hariç) arasında olmalıdır.')
 }
 const stdDevSinrDb = numberField(value, 'stdDevSinrDb')
 if (stdDevSinrDb < 0) throw new Error('SINR standart sapması negatif olamaz.')
 return {
   ueCount: integerInRange(numberField(value, 'ueCount'), 'ueCount', 1, 100),
   seed: integerInRange(numberField(value, 'seed'), 'seed', -2_147_483_648, 2_147_483_647),
   meanSinrDb: numberField(value, 'meanSinrDb'),
   stdDevSinrDb,
   minSinrDb,
   maxSinrDb,
   layers: integerInRange(numberField(value, 'layers'), 'layers', 1, 8),
   overheadFraction,
 }
}
function parseM1Config(value: unknown): M1Config {
 if (!isRecord(value)) throw new Error("Deney profilinde 'm1Config' nesnesi bulunamadı.")
 const traceSlotLimitValue = value.traceSlotLimit
 return {
   slotCount: integerInRange(numberField(value, 'slotCount'), 'slotCount', 1, 100_000),
   pfWindowSlots: integerInRange(numberField(value, 'pfWindowSlots'), 'pfWindowSlots', 1, 10_000),
   ...(traceSlotLimitValue === undefined ? {} : {
     traceSlotLimit: integerInRange(numberField(value, 'traceSlotLimit'), 'traceSlotLimit', 1, 1_000),
   }),
 }
}
export function parseExperimentPreset(json: string): ExperimentPreset {
 let raw: unknown
 try {
   raw = JSON.parse(json)
 } catch {
   throw new Error('Deney profili geçerli bir JSON dosyası değil.')
 }
 if (!isRecord(raw)) throw new Error('Deney profilinin kök değeri bir nesne olmalıdır.')
 if (raw.schemaVersion !== 1) throw new Error(`Desteklenmeyen deney profili sürümü:${String(raw.schemaVersion)}`)
 if (typeof raw.cellId !== 'string' || !CELL_CONFIGS.some((cell) => cell.id === raw.cellId)) {
   throw new Error(`Bilinmeyen hücre profili: ${String(raw.cellId)}`)
 }
 if (typeof raw.selectedScheduler !== 'string' || raw.selectedScheduler.trim() === '') {
   throw new Error('Deney profilinde geçerli bir scheduler kimliği bulunmalıdır.')
 }
 if (typeof raw.createdAt !== 'string' || Number.isNaN(Date.parse(raw.createdAt))) {
   throw new Error('Deney profilinde geçerli bir oluşturulma tarihi bulunmalıdır.')
 }
 const scenario = parseScenario(raw.scenario)
 const m1Config = parseM1Config(raw.m1Config)
 const seedCount = integerInRange(numberField(raw, 'seedCount'), 'seedCount', 2, 100)
 const applicationVersion = typeof raw.applicationVersion === 'string'
   ? raw.applicationVersion
   : APPLICATION_METADATA.version
 const experimentId = createExperimentFingerprint({ cellId: raw.cellId, scenario, m1Config, seedCount }, applicationVersion)
 return {
   schemaVersion: 1,
   createdAt: raw.createdAt,
   cellId: raw.cellId,
   scenario,
   m1Config,
   seedCount,
   selectedScheduler: raw.selectedScheduler,
   applicationVersion,
   experimentId,
 }
}
export function serializeExperimentPreset(input: ExperimentPresetInput): string {
 const experimentId = createExperimentFingerprint(input)
 const preset: ExperimentPreset = {
   schemaVersion: 1,
   createdAt: new Date().toISOString(),
   applicationVersion: APPLICATION_METADATA.version,
   experimentId,
   ...input,
 }
 parseExperimentPreset(JSON.stringify(preset))
 return JSON.stringify(preset, null, 2)
}
