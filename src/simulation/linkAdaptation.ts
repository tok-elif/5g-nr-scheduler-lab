import config from '../config/link-adaptation.json'
import type { CellConfig, LinkAdaptationResult } from './types'
import { validateCellConfig } from './validation'
interface CqiConfigEntry {
 cqi: number
 minSinrDb: number
 modulation: string
 codeRateX1024: number
 spectralEfficiency: number
}
interface McsConfigEntry {
 index: number
 modulation: string
 modulationOrder: number
 targetCodeRateX1024: number
 spectralEfficiency: number
}
export const CQI_TABLE: readonly CqiConfigEntry[] = config.cqiTable
export const MCS_TABLE: readonly McsConfigEntry[] = config.mcsTable
export const CQI_1_MCS_FALLBACK: Readonly<McsConfigEntry> = config.cqi1McsFallback
export const LINK_ADAPTATION_METADATA = config.standard
export const LINK_MODEL = config.model
function validateLinkTables(): void {
 if (CQI_TABLE.length !== 15 || CQI_TABLE.some((entry, index) => entry.cqi !== index + 1)) {
   throw new Error('CQI tablosu 1–15 arasında sıralı 15 giriş içermelidir.')
 }
 if (CQI_TABLE.some((entry, index) => index > 0 && entry.minSinrDb <= CQI_TABLE[index - 1].minSinrDb)) {
   throw new Error('CQI SINR eşikleri kesin artan sırada olmalıdır.')
 }
 if (MCS_TABLE.length !== 29 || MCS_TABLE.some((entry, index) => entry.index !== index)) {
   throw new Error('MCS tablosu 0–28 arasında sıralı 29 giriş içermelidir.')
 }
 if (CQI_1_MCS_FALLBACK.spectralEfficiency !== CQI_TABLE[0].spectralEfficiency
   || CQI_1_MCS_FALLBACK.targetCodeRateX1024 !== CQI_TABLE[0].codeRateX1024) {
   throw new Error('CQI 1 düşük-SE MCS eşlemesi CQI verim ve kod oranıyla aynı olmalıdır.')
 }
}
validateLinkTables()
function selectMcs(cqiSpectralEfficiency: number): { entry: McsConfigEntry; table: 'PDSCH Table 1' | 'PDSCH Table 3' } {
 const compatible = MCS_TABLE.filter(
   (entry) => entry.spectralEfficiency <= cqiSpectralEfficiency + Number.EPSILON,
 )
 if (compatible.length === 0) return { entry: CQI_1_MCS_FALLBACK, table: 'PDSCH Table 3' }
 return { entry: compatible.reduce((best, entry) =>
   entry.spectralEfficiency > best.spectralEfficiency ||
   (entry.spectralEfficiency === best.spectralEfficiency && entry.index > best.index)
     ? entry
     : best,
 ), table: 'PDSCH Table 1' }
}
function outageResult(): LinkAdaptationResult {
 return {
   cqi: 0,
   cqiSpectralEfficiency: 0,
   mcsIndex: -1,
   mcs: 'Outage',
   mcsTable: '—',
   modulation: '—',
   targetCodeRateX1024: 0,
   mcsSpectralEfficiency: 0,
   spectralEfficiency: 0,
 }
}
export function adaptLink(sinrDb: number): LinkAdaptationResult {
 if (!Number.isFinite(sinrDb)) throw new Error('SINR sonlu bir sayı olmalıdır.')
 let selectedCqi: CqiConfigEntry | undefined
 for (let index = CQI_TABLE.length - 1; index >= 0; index -= 1) {
   if (sinrDb >= CQI_TABLE[index].minSinrDb) {
     selectedCqi = CQI_TABLE[index]
     break
   }
 }
 if (!selectedCqi) return outageResult()
 const selectedMcs = selectMcs(selectedCqi.spectralEfficiency)
 return {
   cqi: selectedCqi.cqi,
   cqiSpectralEfficiency: selectedCqi.spectralEfficiency,
   mcsIndex: selectedMcs.entry.index,
   mcs: `MCS ${selectedMcs.entry.index}`,
   mcsTable: selectedMcs.table,
   modulation: selectedMcs.entry.modulation,
   targetCodeRateX1024: selectedMcs.entry.targetCodeRateX1024,
   mcsSpectralEfficiency: selectedMcs.entry.spectralEfficiency,
   spectralEfficiency: selectedMcs.entry.spectralEfficiency,
 }
}
export function calculateFullBandRateMbps(
 cell: CellConfig,
 spectralEfficiency: number,
 layers: number,
 overheadFraction: number,
): number {
 validateCellConfig(cell)
 if (!Number.isFinite(spectralEfficiency) || spectralEfficiency < 0) throw new Error('Spektral verimlilik sonlu ve negatifolmayan bir sayı olmalıdır.')
 if (!Number.isInteger(layers) || layers < 1 || layers > 8) throw new Error('Katman sayısı 1–8 arasında bir tam sayıolmalıdır.')
 if (!Number.isFinite(overheadFraction) || overheadFraction < 0 || overheadFraction >= 1) {
   throw new Error('Overhead oranı 0 dahil, 1 hariç aralığında olmalıdır.')
 }
 const usableResourceElements =
   cell.resourceBlocks *
   LINK_MODEL.subcarriersPerRb *
   LINK_MODEL.ofdmSymbolsPerSlot *
   (1 - overheadFraction)
 const bitsPerSlot = usableResourceElements * spectralEfficiency * layers
 return bitsPerSlot / (cell.slotDurationMs / 1000) / 1_000_000
}
