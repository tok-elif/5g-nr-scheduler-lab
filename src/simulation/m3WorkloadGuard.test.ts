import { describe, expect, it } from 'vitest'
import simulationConfig from '../config/simulation.json'
import { M3_SCHEDULERS } from '../m3Schedulers'
import {
 assertM3ScientificWorkUnitsAllowed,
 assertM3WorkloadAllowed,
 assertM3WorkUnitsAllowed,
 calculateM3WorkUnits,
} from './m3WorkloadGuard'
describe('M3 workload guard', () => {
 it('preserves scheduler × UE × RB × slot cost model', () => {
   expect(calculateM3WorkUnits({
     ueCount: 10,
     resourceBlockCount: 273,
     slotCount: 20_000,
     schedulerCount: M3_SCHEDULERS.length,
   })).toBe(163_800_000)
 })
 it('includes seed count when supplied and remains deterministic', () => {
   const input = {
     ueCount: 10,
     resourceBlockCount: 5,
     slotCount: 100,
     schedulerCount: 6,
     seedCount: 2,
   }
   expect(calculateM3WorkUnits(input)).toBe(60_000)
   expect(calculateM3WorkUnits(input)).toBe(calculateM3WorkUnits(input))
 })
 it.each([
   [{ ueCount: -1, resourceBlockCount: 1, slotCount: 1, schedulerCount: 1 }, 'negatif'],
   [{ ueCount: 1, resourceBlockCount: 0, slotCount: 1, schedulerCount: 1 }, 'sıfır'],
   [{ ueCount: 1, resourceBlockCount: 1, slotCount: 1.5, schedulerCount: 1 }, 'kesirli'],
   [{ ueCount: 1, resourceBlockCount: 1, slotCount: 1, schedulerCount: Number.NaN }, 'NaN'],
   [{ ueCount: 1, resourceBlockCount: 1, slotCount: 1, schedulerCount: Number.POSITIVE_INFINITY }, 'Infinity'],
 ])('rejects invalid input (%s, %s)', (input) => {
   expect(() => calculateM3WorkUnits(input)).toThrow()
 })
 it('rejects safe-integer overflow explicitly', () => {
   expect(() => calculateM3WorkUnits({
     ueCount: Number.MAX_SAFE_INTEGER,
     resourceBlockCount: 2,
     slotCount: 1,
     schedulerCount: 1,
   })).toThrow('güvenli tam sayı sınırını')
 })
 it('does not mutate or freeze caller input', () => {
   const input = { ueCount: 2, resourceBlockCount: 15, slotCount: 10, schedulerCount: 3 }
   const before = structuredClone(input)
   calculateM3WorkUnits(input)
   expect(input).toEqual(before)
   expect(Object.isFrozen(input)).toBe(false)
 })
 it.each([100_000_000, 163_800_000, 199_999_999, 200_000_000])(
   '%i work units are accepted',
   (workUnits) => {
     expect(() => assertM3WorkUnitsAllowed(workUnits)).not.toThrow()
   },
 )
 it('accepts the real 163.8M experiment through the calculated-input guard', () => {
   expect(() => assertM3WorkloadAllowed({
     ueCount: 10,
     resourceBlockCount: 273,
     slotCount: 20_000,
     schedulerCount: 3,
   })).not.toThrow()
 })
 it('rejects 200,000,001 with the actual workload and limit', () => {
   expect(() => assertM3WorkUnitsAllowed(200_000_001))
     .toThrow('200.000.001 UE-RB-slot birimi; güvenli sınır 200.000.000')
 })
 it('uses the same M3-specific limit for scientific experiment work', () => {
   expect(() => assertM3ScientificWorkUnitsAllowed(200_000_000)).not.toThrow()
   expect(() => assertM3ScientificWorkUnitsAllowed(200_000_001))
     .toThrow('güvenli sınır 200.000.000')
 })
 it('keeps M2 and common M4/other limits unchanged', () => {
   expect(simulationConfig.experiments.m3MaxWorkUnits).toBe(200_000_000)
   expect(simulationConfig.experiments.m2MaxWorkUnits).toBe(300_000_000)
   expect(simulationConfig.experiments.maxWorkUnits).toBe(100_000_000)
 })
 it('continues accepting small M3 experiments', () => {
   expect(() => assertM3WorkloadAllowed({
     ueCount: 2,
     resourceBlockCount: 15,
     slotCount: 100,
     schedulerCount: 3,
   })).not.toThrow()
 })
})
