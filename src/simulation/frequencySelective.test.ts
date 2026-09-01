import { describe, expect, it } from 'vitest'
import { CELL_CONFIGS } from '../config/cells'
import { runM2 } from './m2'
import {
  FREQUENCY_SELECTIVE_DEFAULTS,
  buildPerRbRateTable,
  perRbSinrOffsetsDb,
  validateFrequencySelectiveConfig,
  type FrequencySelectiveConfig,
} from './frequencySelective'
import type { M2Config } from './m2Types'
import type { UeResult } from './types'

const CELL = CELL_CONFIGS[2]

const makeUe = (id: number, sinrDb: number): UeResult => ({
  id,
  sinrDb,
  cqi: 10,
  cqiSpectralEfficiency: 2.7305,
  mcsIndex: 18,
  mcs: 'MCS 18',
  mcsTable: 'PDSCH Table 1',
  modulation: '64QAM',
  targetCodeRateX1024: 466,
  mcsSpectralEfficiency: 2.7305,
  spectralEfficiency: 2.7305,
  achievableRateMbps: 40 + sinrDb,
})

const UES = [makeUe(1, 6), makeUe(2, 11), makeUe(3, 17)]

const TEST_CONFIG: M2Config = {
  slotCount: 200,
  pfWindowSlots: 50,
  traceSlotLimit: 60,
  trafficSeedOffset: 100,
  trafficClasses: [{
    fiveQi: 9,
    arrivalRatePacketsPerSecond: 4_000,
    packetSizeBytes: 1_200,
    gbrMbps: 0,
  }],
}

const ENABLED: FrequencySelectiveConfig = { ...FREQUENCY_SELECTIVE_DEFAULTS, enabled: true }
const DISABLED: FrequencySelectiveConfig = { ...FREQUENCY_SELECTIVE_DEFAULTS, enabled: false }

describe('frekans seçici kanal', () => {
  it('varsayılan olarak kapalıdır ve wideband davranışı korur', () => {
    expect(FREQUENCY_SELECTIVE_DEFAULTS.enabled).toBe(false)
    const withDefaults = runM2(CELL, UES, 'proportional-fair', TEST_CONFIG, 2026)
    const explicitlyDisabled = runM2(CELL, UES, 'proportional-fair', TEST_CONFIG, 2026, {
      frequencySelective: DISABLED,
    })
    expect(withDefaults).toEqual(explicitlyDisabled)
    expect(withDefaults.slotTrace.every(
      (entry) => entry.allocations.every((allocation) => allocation.resourceBlockIndices === undefined),
    )).toBe(true)
  })

  it('aynı seed altında aynı RB sapmalarını üretir, farklı seed altında farklı', () => {
    const first = perRbSinrOffsetsDb(CELL.resourceBlocks, ENABLED, 4242)
    const second = perRbSinrOffsetsDb(CELL.resourceBlocks, ENABLED, 4242)
    const other = perRbSinrOffsetsDb(CELL.resourceBlocks, ENABLED, 4243)
    expect(first).toEqual(second)
    expect(first).not.toEqual(other)
    expect(first).toHaveLength(CELL.resourceBlocks)
    expect(first.every((value) => Number.isFinite(value))).toBe(true)
  })

  it('sapmalar frekansta korelasyonludur: komşu RB farkı uzak RB farkından küçüktür', () => {
    const offsets = perRbSinrOffsetsDb(CELL.resourceBlocks, { ...ENABLED, coherenceBandwidthRb: 8 }, 77)
    const meanAbsoluteDifference = (lag: number): number => {
      let total = 0
      for (let index = 0; index + lag < offsets.length; index += 1) {
        total += Math.abs(offsets[index + lag] - offsets[index])
      }
      return total / (offsets.length - lag)
    }
    expect(meanAbsoluteDifference(1)).toBeLessThan(meanAbsoluteDifference(20))
  })

  it('stdDevDb sıfırken sapma üretmez', () => {
    const offsets = perRbSinrOffsetsDb(CELL.resourceBlocks, { ...ENABLED, stdDevDb: 0 }, 5)
    expect(offsets.every((value) => value === 0)).toBe(true)
  })

  it('RB başına hız tablosu her UE için hücre RB sayısı kadar pozitif değer verir', () => {
    const table = buildPerRbRateTable({
      cell: CELL,
      ues: UES,
      config: ENABLED,
      baseSeed: 2026,
      layers: 1,
      overheadFraction: 0.14,
      minSinrDb: -8,
      maxSinrDb: 28,
    })
    expect(table).toHaveLength(UES.length)
    for (const row of table) {
      expect(row).toHaveLength(CELL.resourceBlocks)
      expect(row.every((value) => Number.isFinite(value) && value >= 0)).toBe(true)
    }
    // Frekans seçicilik RB'ler arasında gerçek bir hız farkı yaratmalıdır.
    expect(new Set(table[0].map((value) => value.toFixed(6))).size).toBeGreaterThan(1)
  })

  it('açıkken gerçek RB indeksleri üretir; indeksler benzersiz ve hücre içindedir', () => {
    const result = runM2(CELL, UES, 'proportional-fair', TEST_CONFIG, 2026, {
      frequencySelective: ENABLED,
    })
    expect(result.slotTrace.length).toBeGreaterThan(0)
    for (const entry of result.slotTrace) {
      const seen = new Set<number>()
      for (const allocation of entry.allocations) {
        expect(allocation.resourceBlockIndices).toBeDefined()
        expect(allocation.resourceBlockIndices).toHaveLength(allocation.resourceBlocks)
        for (const rbIndex of allocation.resourceBlockIndices ?? []) {
          expect(Number.isInteger(rbIndex)).toBe(true)
          expect(rbIndex).toBeGreaterThanOrEqual(0)
          expect(rbIndex).toBeLessThan(CELL.resourceBlocks)
          expect(seen.has(rbIndex)).toBe(false)
          seen.add(rbIndex)
        }
      }
      expect(seen.size).toBeLessThanOrEqual(CELL.resourceBlocks)
    }
  })

  it('kanal duyarlı scheduler ile tahsis serpiştirilir (bitişik blok zorunluluğu kalkar)', () => {
    const result = runM2(CELL, UES, 'proportional-fair', TEST_CONFIG, 2026, {
      frequencySelective: ENABLED,
    })
    const isContiguous = (indices: readonly number[]): boolean =>
      indices.every((value, position) => position === 0 || value === indices[position - 1] + 1)
    const interleaved = result.slotTrace.some((entry) =>
      entry.allocations.length > 1
      && entry.allocations.some((allocation) => !isContiguous(allocation.resourceBlockIndices ?? [])))
    expect(interleaved).toBe(true)
  })

  it('açıkken de tekrar üretilebilir kalır', () => {
    const first = runM2(CELL, UES, 'max-ci', TEST_CONFIG, 2026, { frequencySelective: ENABLED })
    const second = runM2(CELL, UES, 'max-ci', TEST_CONFIG, 2026, { frequencySelective: ENABLED })
    expect(first).toEqual(second)
  })

  it('paket muhasebesini bozmaz', () => {
    const result = runM2(CELL, UES, 'm-lwdf', TEST_CONFIG, 2026, { frequencySelective: ENABLED })
    expect(result.generatedPackets).toBe(result.deliveredPackets + result.queuedPackets)
    expect(result.jainFairness).toBeGreaterThan(0)
    expect(result.jainFairness).toBeLessThanOrEqual(1)
  })

  it('geçersiz yapılandırmayı reddeder', () => {
    expect(() => validateFrequencySelectiveConfig({ ...ENABLED, stdDevDb: -1 })).toThrow()
    expect(() => validateFrequencySelectiveConfig({ ...ENABLED, coherenceBandwidthRb: 0 })).toThrow()
    expect(() => perRbSinrOffsetsDb(0, ENABLED, 1)).toThrow()
  })
})
