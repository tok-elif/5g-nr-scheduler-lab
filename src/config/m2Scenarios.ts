import rawConfig from './m2-scenarios.json'
import { DEFAULT_M2_CONFIG } from '../simulation/m2'
import type { M2Config } from '../simulation/m2Types'
import type { CellConfig } from '../simulation/types'
type TrafficClassConfig = M2Config['trafficClasses'][number]
export type M2LoadProfileMode = 'fixed-multiplier' | 'capacity-fraction'
export interface M2ExperimentScenario {
 id: string
 shortLabel: string
 label: string
 description: string
 trafficClasses: TrafficClassConfig[]
}
export interface M2LoadProfile {
 id: string
 shortLabel: string
 label: string
 description: string
 mode: M2LoadProfileMode
 arrivalRateMultiplier?: number
 targetLoadFraction?: number
}
export interface M2ResolvedLoadProfile {
 profile: M2LoadProfile
 arrivalRateMultiplier: number
 baselineOfferedLoadMbps: number
 offeredLoadMbps: number
 capacityReferenceMbps: number
 normalizedOfferedLoad: number
 targetLoadFraction: number | null
}
export interface M2MatrixDefaults {
 durationMs: number
 ueCount: number
 baseSeed: number
 traceSlotLimit: number
 seedCount: number
 seedStep: number
}
export interface M2FinalExperimentRunDefinition {
 id: string
 label: string
 scenarioId: string
 loadProfileId: string
}
export interface M2FinalExperimentPreset {
 id: string
 label: string
 description: string
 durationMs: number
 ueCount: number
 baseSeed: number
 seedCount: number
 seedStep: number
 runs: M2FinalExperimentRunDefinition[]
}
interface RawM2ScenarioConfig {
 defaultScenarioId: string
 defaultLoadProfileId: string
 matrixDefaults: M2MatrixDefaults
 loadProfiles: M2LoadProfile[]
 scenarios: M2ExperimentScenario[]
 finalExperiment: M2FinalExperimentPreset
}
const config = rawConfig as RawM2ScenarioConfig
function assertPositiveFinite(value: number, label: string): void {
 if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} pozitif ve sonlu olmalıdır.`)
}
function assertUniqueNonEmptyIds(
 items: Array<{ id: string; label: string }>,
 label: string,
): Set<string> {
 const ids = new Set<string>()
 for (const item of items) {
   if (!item.id.trim() || !item.label.trim()) throw new Error(`${label} kimlik ve etiketi boş olamaz.`)
   if (ids.has(item.id)) throw new Error(`Tekrarlanan ${label.toLowerCase()} kimliği: ${item.id}`)
   ids.add(item.id)
 }
 return ids
}
function validateScenarioConfig(): void {
 if (!Array.isArray(config.scenarios) || config.scenarios.length !== 2) {
   throw new Error('M2 deney konfigürasyonu tam olarak SC-1 ve SC-2 senaryolarını içermelidir.')
 }
 if (!Array.isArray(config.loadProfiles) || config.loadProfiles.length < 6) {
   throw new Error('M2 deney konfigürasyonu sabit ve kapasite-normalize yük profillerini içermelidir.')
 }
 const scenarioIds = assertUniqueNonEmptyIds(config.scenarios, 'M2 senaryosu')
 const loadIds = assertUniqueNonEmptyIds(config.loadProfiles, 'M2 yük profili')
 for (const scenario of config.scenarios) {
   if (!scenario.shortLabel.trim()) throw new Error('M2 senaryo kısa etiketi boş olamaz.')
   if (!Array.isArray(scenario.trafficClasses) || scenario.trafficClasses.length === 0) {
     throw new Error(`${scenario.id} en az bir trafik sınıfı içermelidir.`)
   }
   for (const trafficClass of scenario.trafficClasses) {
     assertPositiveFinite(trafficClass.arrivalRatePacketsPerSecond, 'Paket geliş hızı')
     assertPositiveFinite(trafficClass.packetSizeBytes, 'Paket boyutu')
     if (!Number.isFinite(trafficClass.gbrMbps) || trafficClass.gbrMbps < 0) {
       throw new Error('GBR değeri sıfır veya pozitif ve sonlu olmalıdır.')
     }
   }
 }
 for (const loadProfile of config.loadProfiles) {
   if (!loadProfile.shortLabel.trim()) throw new Error('M2 yük profili kısa etiketi boş olamaz.')
   if (loadProfile.mode === 'fixed-multiplier') {
     assertPositiveFinite(loadProfile.arrivalRateMultiplier ?? Number.NaN, 'Yük çarpanı')
     if (loadProfile.targetLoadFraction !== undefined) {
       throw new Error(`${loadProfile.id} sabit yük profilinde hedef kapasite oranı bulunamaz.`)
     }
   } else if (loadProfile.mode === 'capacity-fraction') {
     assertPositiveFinite(loadProfile.targetLoadFraction ?? Number.NaN, 'Hedef kapasite oranı')
     if (loadProfile.arrivalRateMultiplier !== undefined) {
       throw new Error(`${loadProfile.id} kapasite-normalize profilde sabit yük çarpanı bulunamaz.`)
     }
   } else {
     throw new Error(`Bilinmeyen M2 yük profili modu: ${String(loadProfile.mode)}`)
   }
 }
 for (const requiredId of ['light', 'medium', 'heavy', 'capacity-50', 'capacity-80', 'capacity-110']) {
   if (!loadIds.has(requiredId)) throw new Error(`Zorunlu M2 yük profili eksik: ${requiredId}`)
 }
 if (!scenarioIds.has(config.defaultScenarioId)) throw new Error('Varsayılan M2 deney senaryosu kayıtlı değildir.')
 if (!loadIds.has(config.defaultLoadProfileId)) throw new Error('Varsayılan M2 yük profili kayıtlı değildir.')
 if (getM2ExperimentScenario('sc1-same-qos').trafficClasses.length !== 1) {
   throw new Error('SC-1 yalnız bir ortak QoS trafik sınıfı içermelidir.')
 }
 if (getM2ExperimentScenario('sc2-mixed-qos').trafficClasses.length < 2) {
   throw new Error('SC-2 birden fazla QoS trafik sınıfı içermelidir.')
 }
 assertPositiveFinite(config.matrixDefaults.durationMs, 'Matris süresi')
 for (const [value, label, minimum] of [
   [config.matrixDefaults.ueCount, 'Varsayılan UE sayısı', 1],
   [config.matrixDefaults.seedCount, 'Varsayılan seed sayısı', 2],
   [config.matrixDefaults.seedStep, 'Varsayılan seed adımı', 1],
 ] as const) {
   if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`${label} geçersizdir.`)
 }
 if (!Number.isSafeInteger(config.matrixDefaults.baseSeed) || config.matrixDefaults.baseSeed < 0) {
   throw new Error('Varsayılan temel seed sıfır veya pozitif güvenli bir tam sayı olmalıdır.')
 }
 if (!Number.isSafeInteger(config.matrixDefaults.traceSlotLimit) || config.matrixDefaults.traceSlotLimit < 0) {
   throw new Error('Trace slot sınırı sıfır veya pozitif güvenli bir tam sayı olmalıdır.')
 }
 const finalExperiment = config.finalExperiment
 if (!finalExperiment.id.trim() || !finalExperiment.label.trim() || !finalExperiment.description.trim()) {
   throw new Error('Final M2 deney preset kimliği, etiketi ve açıklaması boş olamaz.')
 }
 assertPositiveFinite(finalExperiment.durationMs, 'Final M2 deney süresi')
 for (const [value, label, minimum, maximum] of [
   [finalExperiment.ueCount, 'Final M2 UE sayısı', 1, 500],
   [finalExperiment.seedCount, 'Final M2 seed sayısı', 2, 50],
   [finalExperiment.seedStep, 'Final M2 seed adımı', 1, 1_000_000],
 ] as const) {
   if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
     throw new Error(`${label} ${minimum} ile ${maximum} arasında güvenli bir tam sayı olmalıdır.`)
   }
 }
 if (!Number.isSafeInteger(finalExperiment.baseSeed) || finalExperiment.baseSeed < 0) {
   throw new Error('Final M2 temel seed sıfır veya pozitif güvenli bir tam sayı olmalıdır.')
 }
 const finalSeed = finalExperiment.baseSeed + (finalExperiment.seedCount - 1) * finalExperiment.seedStep
 if (!Number.isSafeInteger(finalSeed) || finalSeed > 2_147_483_647) {
   throw new Error('Final M2 seed listesi 2147483647 sınırını aşmamalıdır.')
 }
 if (!Array.isArray(finalExperiment.runs) || finalExperiment.runs.length !== 2) {
   throw new Error('Final M2 deney preseti ana dokümandaki iki baseline senaryoyu içermelidir.')
 }
 assertUniqueNonEmptyIds(finalExperiment.runs, 'Final M2 koşusu')
 for (const run of finalExperiment.runs) {
   if (!scenarioIds.has(run.scenarioId)) throw new Error(`Final M2 koşusunda bilinmeyen senaryo: ${run.scenarioId}`)
   if (!loadIds.has(run.loadProfileId)) throw new Error(`Final M2 koşusunda bilinmeyen yük profili: ${run.loadProfileId}`)
 }
 const finalScenarioIds = new Set(finalExperiment.runs.map((run) => run.scenarioId))
 if (!finalScenarioIds.has('sc1-same-qos') || !finalScenarioIds.has('sc2-mixed-qos')) {
   throw new Error('Final M2 deney preseti SC-1 ve SC-2 senaryolarını birlikte içermelidir.')
 }
}
export const M2_EXPERIMENT_SCENARIOS = config.scenarios.map((scenario) => ({
 ...scenario,
 trafficClasses: scenario.trafficClasses.map((trafficClass) => ({ ...trafficClass })),
}))
export const M2_LOAD_PROFILES = config.loadProfiles.map((profile) => ({ ...profile }))
export const DEFAULT_M2_EXPERIMENT_SCENARIO_ID = config.defaultScenarioId
export const DEFAULT_M2_LOAD_PROFILE_ID = config.defaultLoadProfileId
export const DEFAULT_M2_MATRIX_SETTINGS = { ...config.matrixDefaults }
export const FINAL_M2_EXPERIMENT_PRESET: M2FinalExperimentPreset = {
 ...config.finalExperiment,
 runs: config.finalExperiment.runs.map((run) => ({ ...run })),
}
export function getM2ExperimentScenario(id: string): M2ExperimentScenario {
 const scenario = M2_EXPERIMENT_SCENARIOS.find((candidate) => candidate.id === id)
 if (!scenario) throw new Error(`Bilinmeyen M2 deney senaryosu: ${id}`)
 return scenario
}
export function getM2LoadProfile(id: string): M2LoadProfile {
 const profile = M2_LOAD_PROFILES.find((candidate) => candidate.id === id)
 if (!profile) throw new Error(`Bilinmeyen M2 yük profili: ${id}`)
 return profile
}
function baselineOfferedLoadMbps(scenario: M2ExperimentScenario, ueCount: number): number {
 if (!Number.isSafeInteger(ueCount) || ueCount < 1 || ueCount > 500) {
   throw new Error('Kapasite-normalize yük için UE sayısı 1 ile 500 arasında olmalıdır.')
 }
 let total = 0
 for (let index = 0; index < ueCount; index += 1) {
   const traffic = scenario.trafficClasses[index % scenario.trafficClasses.length]
   total += traffic.arrivalRatePacketsPerSecond * traffic.packetSizeBytes * 8 / 1_000_000
 }
 assertPositiveFinite(total, 'Temel sunulan trafik')
 return total
}
export function resolveM2LoadProfile(
 loadProfileId: string,
 scenarioId: string,
 ueCount: number,
 capacityReferenceMbps: number,
): M2ResolvedLoadProfile {
 const profile = getM2LoadProfile(loadProfileId)
 const scenario = getM2ExperimentScenario(scenarioId)
 const baseline = baselineOfferedLoadMbps(scenario, ueCount)
 let multiplier: number
 let targetLoadFraction: number | null = null
 if (profile.mode === 'fixed-multiplier') {
   multiplier = profile.arrivalRateMultiplier ?? Number.NaN
 } else {
   assertPositiveFinite(capacityReferenceMbps, 'Kapasite referansı')
   targetLoadFraction = profile.targetLoadFraction ?? Number.NaN
   assertPositiveFinite(targetLoadFraction, 'Hedef kapasite oranı')
   multiplier = targetLoadFraction * capacityReferenceMbps / baseline
 }
 assertPositiveFinite(multiplier, 'Çözülmüş trafik çarpanı')
 const offeredLoadMbps = baseline * multiplier
 return {
   profile,
   arrivalRateMultiplier: multiplier,
   baselineOfferedLoadMbps: baseline,
   offeredLoadMbps,
   capacityReferenceMbps,
   normalizedOfferedLoad: capacityReferenceMbps > 0 ? offeredLoadMbps / capacityReferenceMbps : 0,
   targetLoadFraction,
 }
}
export function createM2ScenarioConfig(
 scenarioId: string,
 cell: CellConfig,
 durationMs: number,
 loadProfileId: string = DEFAULT_M2_LOAD_PROFILE_ID,
 context?: { ueCount: number; capacityReferenceMbps: number },
): M2Config {
 assertPositiveFinite(durationMs, 'Simülasyon süresi')
 assertPositiveFinite(cell.slotDurationMs, 'Hücre slot süresi')
 const scenario = getM2ExperimentScenario(scenarioId)
 const profile = getM2LoadProfile(loadProfileId)
 const multiplier = profile.mode === 'fixed-multiplier'
   ? profile.arrivalRateMultiplier ?? Number.NaN
   : context
     ? resolveM2LoadProfile(loadProfileId, scenarioId, context.ueCount, context.capacityReferenceMbps) .arrivalRateMultiplier
     : Number.NaN
 if (!Number.isFinite(multiplier) || multiplier <= 0) {
   throw new Error('Kapasite-normalize yük profili için UE sayısı ve kapasite referansı gereklidir.')
 }
 const slotCount = Math.max(1, Math.round(durationMs / cell.slotDurationMs))
 return {
   ...DEFAULT_M2_CONFIG,
   slotCount,
   traceSlotLimit: DEFAULT_M2_MATRIX_SETTINGS.traceSlotLimit,
   trafficClasses: scenario.trafficClasses.map((trafficClass) => ({
     ...trafficClass,
     arrivalRatePacketsPerSecond: trafficClass.arrivalRatePacketsPerSecond * multiplier,
   })),
 }
}
validateScenarioConfig()
