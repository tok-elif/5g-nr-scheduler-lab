import type { CellConfig, M1Config, ScenarioConfig, UeResult } from './types'
const assertFinite = (value: number, label: string): void => {
 if (!Number.isFinite(value)) throw new Error(`${label} sonlu bir sayı olmalıdır.`)
}
const assertIntegerInRange = (value: number, minimum: number, maximum: number, label: string): void => {
 if (!Number.isInteger(value) || value < minimum || value > maximum) {
   throw new Error(`${label} ${minimum}–${maximum} arasında bir tam sayı olmalıdır.`)
 }
}
export function validateCellConfig(cell: CellConfig): void {
 if (typeof cell.id !== 'string' || cell.id.trim() === '') throw new Error('Hücre kimliği boş olamaz.')
 assertFinite(cell.bandMHz, 'Bant frekansı')
 assertFinite(cell.bandwidthMHz, 'Bant genişliği')
 assertFinite(cell.scsKHz, 'Alt taşıyıcı aralığı')
 assertFinite(cell.slotDurationMs, 'Slot süresi')
 if (cell.bandMHz <= 0 || cell.bandwidthMHz <= 0 || cell.scsKHz <= 0 || cell.slotDurationMs <= 0) {
   throw new Error('Hücre frekans, bant genişliği, SCS ve slot süresi pozitif olmalıdır.')
 }
 assertIntegerInRange(cell.resourceBlocks, 1, 10_000, 'RB sayısı')
}
export function validateScenarioConfig(scenario: ScenarioConfig): void {
 assertIntegerInRange(scenario.ueCount, 1, 100, 'UE sayısı')
 assertIntegerInRange(scenario.seed, -2_147_483_648, 2_147_483_647, 'Seed')
 assertFinite(scenario.meanSinrDb, 'Ortalama SINR')
 assertFinite(scenario.stdDevSinrDb, 'SINR standart sapması')
 assertFinite(scenario.minSinrDb, 'Minimum SINR')
 assertFinite(scenario.maxSinrDb, 'Maksimum SINR')
 if (scenario.stdDevSinrDb < 0) throw new Error('SINR standart sapması negatif olamaz.')
 if (scenario.minSinrDb > scenario.maxSinrDb) throw new Error('Minimum SINR, maksimum SINR değerinden büyükolamaz.')
 assertIntegerInRange(scenario.layers, 1, 8, 'Katman sayısı')
 assertFinite(scenario.overheadFraction, 'Overhead oranı')
 if (scenario.overheadFraction < 0 || scenario.overheadFraction >= 1) {
   throw new Error('Overhead oranı 0 dahil, 1 hariç aralığında olmalıdır.')
 }
}
export function validateM1Config(config: M1Config): void {
 assertIntegerInRange(config.slotCount, 1, 100_000, 'Slot sayısı')
 assertIntegerInRange(config.pfWindowSlots, 1, 10_000, 'PF pencere uzunluğu')
 if (config.traceSlotLimit !== undefined) {
   assertIntegerInRange(config.traceSlotLimit, 0, 1_000, 'Slot trace sınırı')
 }
}
export function validateUes(ues: readonly UeResult[]): void {
 if (ues.length === 0) throw new Error('M1 için en az bir UE gereklidir.')
 if (ues.length > 100) throw new Error('M1 en fazla 100 UE kabul eder.')
 const ids = new Set<number>()
 for (const ue of ues) {
   if (!Number.isInteger(ue.id) || ue.id < 1 || ids.has(ue.id)) throw new Error('UE kimlikleri pozitif, benzersiz tam sayılarolmalıdır.')
   assertFinite(ue.sinrDb, `UE ${ue.id} SINR`)
   assertFinite(ue.achievableRateMbps, `UE ${ue.id} ulaşılabilir hızı`)
   if (ue.achievableRateMbps < 0) throw new Error(`UE ${ue.id} ulaşılabilir hızı negatif olamaz.`)
   ids.add(ue.id)
 }
}
