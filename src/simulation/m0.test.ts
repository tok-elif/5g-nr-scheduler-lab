import { describe, expect, it } from 'vitest'
import { CELL_CONFIGS } from '../config/cells'
import { adaptLink, calculateFullBandRateMbps, CQI_1_MCS_FALLBACK, CQI_TABLE,
LINK_ADAPTATION_METADATA, MCS_TABLE } from './linkAdaptation'
import { DEFAULT_SCENARIO, runM0 } from './m0'
describe('M0 link adaptation', () => {
 it('maps increasing SINR to non-decreasing CQI', () => {
   const cqis = [-10, -4, 0, 5, 10, 15, 25].map((sinr) => adaptLink(sinr).cqi)
   expect(cqis).toEqual([...cqis].sort((a, b) => a - b))
 })
 it('loads all five cell profiles from external configuration', () => {
   expect(CELL_CONFIGS).toHaveLength(5)
   expect(CELL_CONFIGS.map((cell) => cell.resourceBlocks)).toEqual([15, 52, 106, 162, 273])
 })
 it('contains the complete 3GPP CQI Table 1 values', () => {
   expect(CQI_TABLE).toHaveLength(15)
   expect(CQI_TABLE[0]).toMatchObject({ cqi: 1, codeRateX1024: 78, spectralEfficiency: 0.1523 })
   expect(CQI_TABLE[14]).toMatchObject({ cqi: 15, codeRateX1024: 948, spectralEfficiency: 5.5547 })
   expect(LINK_ADAPTATION_METADATA.targetTransportBlockErrorProbability).toBe(0.1)
 })
 it('contains the complete PDSCH MCS Table 1 range', () => {
   expect(MCS_TABLE).toHaveLength(29)
   expect(MCS_TABLE[0]).toMatchObject({ index: 0, modulation: 'QPSK', targetCodeRateX1024: 120 })
   expect(MCS_TABLE[28]).toMatchObject({ index: 28, modulation: '64QAM', targetCodeRateX1024: 948 })
 })
 it('applies configured SINR thresholds exactly at boundaries', () => {
   expect(adaptLink(-6.71).cqi).toBe(0)
   expect(adaptLink(-6.7).cqi).toBe(1)
   expect(adaptLink(22.7).cqi).toBe(15)
 })
 it('maps CQI 1 to the matching low-SE PDSCH MCS Table 3 entry', () => {
   const link = adaptLink(CQI_TABLE[0].minSinrDb)
   expect(link).toMatchObject({
     cqi: 1,
     mcsIndex: CQI_1_MCS_FALLBACK.index,
     mcsTable: 'PDSCH Table 3',
     targetCodeRateX1024: 78,
     mcsSpectralEfficiency: 0.1523,
     spectralEfficiency: 0.1523,
   })
 })
 it('selects a compatible standard MCS entry for every higher CQI', () => {
   for (const cqiEntry of CQI_TABLE) {
     const link = adaptLink(cqiEntry.minSinrDb)
     if (link.cqi > 1) {
       expect(MCS_TABLE.some((mcs) => mcs.index === link.mcsIndex)).toBe(true)
       expect(link.mcsTable).toBe('PDSCH Table 1')
       expect(link.mcsSpectralEfficiency).toBeLessThanOrEqual(link.cqiSpectralEfficiency)
     }
   }
 })
 it('produces a higher rate when RB count increases', () => {
   const low = calculateFullBandRateMbps(CELL_CONFIGS[0], 2.4063, 1, 0.14)
   const high = calculateFullBandRateMbps(CELL_CONFIGS[2], 2.4063, 1, 0.14)
   expect(high).toBeGreaterThan(low)
 })
 it('matches the explicit resource-element rate formula', () => {
   const rate = calculateFullBandRateMbps(CELL_CONFIGS[0], 1, 1, 0)
   expect(rate).toBeCloseTo(15 * 12 * 14 / 1_000, 10)
 })
 it('rejects invalid physical-layer rate parameters', () => {
   expect(() => calculateFullBandRateMbps(CELL_CONFIGS[0], -1, 1, 0.14)).toThrow()
   expect(() => calculateFullBandRateMbps(CELL_CONFIGS[0], 1, 0, 0.14)).toThrow()
   expect(() => calculateFullBandRateMbps(CELL_CONFIGS[0], 1, 1, 1)).toThrow()
 })
 it('reproduces the same UE population with the same seed', () => {
   const first = runM0(CELL_CONFIGS[2], DEFAULT_SCENARIO)
   const second = runM0(CELL_CONFIGS[2], DEFAULT_SCENARIO)
   expect(first.ues).toEqual(second.ues)
 })
 it('rejects non-finite and physically invalid scenarios in the core', () => {
   expect(() => runM0(CELL_CONFIGS[0], { ...DEFAULT_SCENARIO, meanSinrDb: Number.NaN })).toThrow()
   expect(() => runM0(CELL_CONFIGS[0], { ...DEFAULT_SCENARIO, stdDevSinrDb: -1 })).toThrow()
   expect(() => runM0(CELL_CONFIGS[0], { ...DEFAULT_SCENARIO, seed: 1.5 })).toThrow()
   expect(() => calculateFullBandRateMbps(CELL_CONFIGS[0], Number.NaN, 1, 0.14)).toThrow()
 })
 it('uses the best full-band UE rate as theoretical cell capacity', () => {
   const result = runM0(CELL_CONFIGS[2], DEFAULT_SCENARIO)
   expect(result.theoreticalCellCapacityMbps).toBe(
     Math.max(...result.ues.map((ue) => ue.achievableRateMbps)),
   )
 })
 it('keeps the same UE SINR and link adaptation across every cell profile', () => {
   const results = CELL_CONFIGS.map((cell) => runM0(cell, DEFAULT_SCENARIO))
   const reference = results[0].ues.map(({ id, sinrDb, cqi, mcsIndex }) => ({ id, sinrDb, cqi, mcsIndex }))
   for (const result of results.slice(1)) {
     expect(result.ues.map(({ id, sinrDb, cqi, mcsIndex }) => ({ id, sinrDb, cqi, mcsIndex }))).toEqual(reference)
   }
   expect(results.at(-1)?.theoreticalCellCapacityMbps).toBeGreaterThan(
     results[0].theoreticalCellCapacityMbps,
   )
 })
})
