import simulationConfig from '../config/simulation.json'
import { adaptLink, calculateFullBandRateMbps } from './linkAdaptation'
import { clamp, createSeededRandom, sampleNormal } from './random'
import type { CellConfig, UeResult } from './types'
import { validateCellConfig } from './validation'

/**
 * Frekans seçici kanal modeli.
 *
 * M0 çekirdeği kanalı UE başına tek bir wideband SINR ile temsil eder. Bu
 * varsayım altında bütün RB'ler birbirinin aynısıdır, dolayısıyla bir slotta
 * en iyi metriğe sahip UE bütün RB'lerde en iyidir ve tahsis kaçınılmaz olarak
 * bitişik bloklar hâlinde çıkar.
 *
 * Gerçek bir hücrede RB'ler arasında SINR farklılaşır (frekans seçici
 * sönümleme): bir UE bandın bir bölgesinde, başka bir UE başka bir bölgesinde
 * daha iyidir. Bu modül wideband SINR'ın etrafına ortalaması sıfır olan,
 * frekansta korelasyonlu bir sapma ekleyerek bu davranışı üretir. Böylece
 * RB başına scheduling kararı anlamlı hâle gelir ve serpiştirilmiş tahsis
 * uydurma bir görselleştirme değil, modelin gerçek çıktısı olur.
 *
 * Model kapalıyken (`enabled: false`) hiçbir kod yolu değişmez; wideband
 * sonuçlar bit düzeyinde korunur.
 */
export interface FrequencySelectiveConfig {
  /** Model kapalıyken tüm koşu wideband davranışını aynen korur. */
  readonly enabled: boolean
  /** RB başına SINR sapmasının standart sapması (dB). */
  readonly stdDevDb: number
  /** Koherans bant genişliği: sapmanın düzgün değiştiği RB sayısı. */
  readonly coherenceBandwidthRb: number
  /** UE başına RB sapması üretilirken taban seed'e eklenen ofset. */
  readonly seedOffset: number
}

export const FREQUENCY_SELECTIVE_DEFAULTS: FrequencySelectiveConfig =
  simulationConfig.frequencySelective as FrequencySelectiveConfig

export function validateFrequencySelectiveConfig(config: FrequencySelectiveConfig): void {
  if (typeof config.enabled !== 'boolean') {
    throw new Error('Frekans seçici model `enabled` alanı boolean olmalıdır.')
  }
  if (!Number.isFinite(config.stdDevDb) || config.stdDevDb < 0) {
    throw new Error('Frekans seçici SINR standart sapması sonlu ve negatif olmayan bir sayı olmalıdır.')
  }
  if (!Number.isSafeInteger(config.coherenceBandwidthRb) || config.coherenceBandwidthRb < 1) {
    throw new Error('Koherans bant genişliği en az 1 RB olan bir tam sayı olmalıdır.')
  }
  if (!Number.isSafeInteger(config.seedOffset)) {
    throw new Error('Frekans seçici seed ofseti güvenli bir tam sayı olmalıdır.')
  }
}

/**
 * Bir UE için RB başına, ortalaması sıfır olan korelasyonlu SINR sapmalarını üretir.
 *
 * Bağımsız normal örnekler `coherenceBandwidthRb` genişliğinde dairesel bir
 * hareketli ortalamadan geçirilir; bu, komşu RB'leri ilişkilendirir. Hareketli
 * ortalama varyansı `1/width` oranında düşürdüğü için sonuç `sqrt(width)` ile
 * yeniden ölçeklenir, böylece elde edilen sapmanın standart sapması yaklaşık
 * olarak `stdDevDb` olur.
 */
export function perRbSinrOffsetsDb(
  resourceBlocks: number,
  config: FrequencySelectiveConfig,
  seed: number,
): number[] {
  if (!Number.isSafeInteger(resourceBlocks) || resourceBlocks <= 0) {
    throw new Error('RB sayısı pozitif güvenli tam sayı olmalıdır.')
  }
  validateFrequencySelectiveConfig(config)
  if (!Number.isSafeInteger(seed)) {
    throw new Error('Frekans seçici seed değeri güvenli bir tam sayı olmalıdır.')
  }
  if (config.stdDevDb === 0) return Array<number>(resourceBlocks).fill(0)
  const random = createSeededRandom(seed)
  const raw = Array.from({ length: resourceBlocks }, () => sampleNormal(random, 0, 1))
  const width = Math.min(config.coherenceBandwidthRb, resourceBlocks)
  const gain = Math.sqrt(width)
  return raw.map((_, index) => {
    let sum = 0
    for (let offset = 0; offset < width; offset += 1) {
      sum += raw[(index + offset) % resourceBlocks]
    }
    return (sum / width) * gain * config.stdDevDb
  })
}

/**
 * Tek bir RB'nin taşıyabileceği hızı (Mbps) verir. Tam-bant hız RB sayısıyla
 * doğrusal olduğundan, bütün RB'ler aynı SINR'daysa bu değerlerin toplamı
 * UE'nin wideband `achievableRateMbps` değerine eşittir.
 */
function rateForRbMbps(
  cell: CellConfig,
  sinrDb: number,
  layers: number,
  overheadFraction: number,
): number {
  const link = adaptLink(sinrDb)
  return calculateFullBandRateMbps(cell, link.spectralEfficiency, layers, overheadFraction)
    / cell.resourceBlocks
}

/**
 * Koşu boyunca sabit kalan `[ueIndex][rbIndex] -> Mbps` hız tablosunu kurar.
 * Kanal statiktir: sapmalar frekansta değişir, zamanda değişmez. Bu, M0'ın
 * "statik SINR" varsayımını korur; yalnızca tek bir wideband değer yerine
 * frekans boyunca bir profil kullanılır.
 */
export function buildPerRbRateTable(input: {
  readonly cell: CellConfig
  readonly ues: readonly UeResult[]
  readonly config: FrequencySelectiveConfig
  readonly baseSeed: number
  readonly layers: number
  readonly overheadFraction: number
  readonly minSinrDb: number
  readonly maxSinrDb: number
}): number[][] {
  validateCellConfig(input.cell)
  validateFrequencySelectiveConfig(input.config)
  if (!(input.minSinrDb < input.maxSinrDb)) {
    throw new Error('SINR alt sınırı üst sınırdan küçük olmalıdır.')
  }
  return input.ues.map((ue) => {
    const offsets = perRbSinrOffsetsDb(
      input.cell.resourceBlocks,
      input.config,
      input.baseSeed + input.config.seedOffset + ue.id * 7919,
    )
    return offsets.map((offset) => rateForRbMbps(
      input.cell,
      clamp(ue.sinrDb + offset, input.minSinrDb, input.maxSinrDb),
      input.layers,
      input.overheadFraction,
    ))
  })
}
