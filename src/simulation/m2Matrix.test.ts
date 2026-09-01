import { describe, expect, it } from 'vitest'
import { CELL_CONFIGS } from '../config/cells'
import { M2_SCHEDULERS } from '../m2Schedulers'
import { runM2Matrix } from './m2Matrix'
const smallRequest = {
 scenarioId: 'sc2-mixed-qos',
 loadProfileId: 'medium',
 durationMs: 10,
 ueCount: 4,
 baseSeed: 2026,
}
describe('five-cell M2 experiment matrix', () => {
 it('runs every discovered scheduler on every configured cell', () => {
   const result = runM2Matrix(smallRequest)
   expect(result.rows).toHaveLength(CELL_CONFIGS.length * M2_SCHEDULERS.length)
   expect(new Set(result.rows.map((row) => row.cellId)).size).toBe(CELL_CONFIGS.length)
   expect(new Set(result.rows.map((row) => row.scheduler)).size).toBe(M2_SCHEDULERS.length)
 })
 it('keeps SINR population, base seed and traffic seed common across comparisons', () => {
   const result = runM2Matrix(smallRequest)
   expect(new Set(result.rows.map((row) => row.sinrPopulationFingerprint)).size).toBe(1)
   expect(new Set(result.rows.map((row) => row.baseSeed))).toEqual(new Set([2026]))
   expect(new Set(result.rows.map((row) => row.effectiveTrafficSeed)).size).toBe(1)
 })
 it('uses equal wall-clock duration despite different slot durations', () => {
   const result = runM2Matrix(smallRequest)
   for (const row of result.rows) {
     expect(row.slotCount * row.slotDurationMs).toBeCloseTo(smallRequest.durationMs, 10)
     expect(row.simulationDurationSeconds * 1000).toBeCloseTo(smallRequest.durationMs, 10)
   }
 })
 it('is deterministic for the same request', () => {
   expect(runM2Matrix(smallRequest)).toEqual(runM2Matrix(smallRequest))
 })
 it('uses the selected seed instead of a fixed matrix seed', () => {
   const first = runM2Matrix({ ...smallRequest, baseSeed: 101 })
   const second = runM2Matrix({ ...smallRequest, baseSeed: 202 })
   expect(new Set(first.rows.map((row) => row.baseSeed))).toEqual(new Set([101]))
   expect(new Set(second.rows.map((row) => row.baseSeed))).toEqual(new Set([202]))
   expect(first.rows[0]?.effectiveTrafficSeed).not.toBe(second.rows[0]?.effectiveTrafficSeed)
   expect(first.rows[0]?.sinrPopulationFingerprint).not.toBe(second.rows[0]?.sinrPopulationFingerprint)
 })
 it('applies the selected load profile to every row', () => {
   const result = runM2Matrix({ ...smallRequest, loadProfileId: 'heavy' })
   expect(new Set(result.rows.map((row) => row.loadProfileId))).toEqual(new Set(['heavy']))
   expect(new Set(result.rows.map((row) => row.arrivalRateMultiplier))).toEqual(new Set([2]))
 })
})
