import { describe, expect, it } from 'vitest'
import simulationConfig from '../config/simulation.json'
import {
 assertM4WorkloadAllowed,
 assertM4WorkUnitsAllowed,
 calculateM4WorkUnits,
} from './m4WorkloadGuard'
describe('M4 workload guard', () => {
 it('uses UE × RB × slot deterministically', () => {
   const input = { ueCount: 10, resourceBlockCount: 100, slotCount: 1000 }
   expect(calculateM4WorkUnits(input)).toBe(1_000_000)
   expect(calculateM4WorkUnits(input)).toBe(calculateM4WorkUnits(input))
 })
 it.each([99_999_999, 100_000_000])('accepts %i', (value) => {
   expect(() => assertM4WorkUnitsAllowed(value)).not.toThrow()
 })
 it('rejects 100,000,001 with the actual limit', () => {
   expect(() => assertM4WorkUnitsAllowed(100_000_001))
     .toThrow('100.000.001 UE-RB-slot birimi; güvenli sınır 100.000.000')
 })
 it.each([-1, 0, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid %s', (value) => {
   expect(() => calculateM4WorkUnits({ ueCount: value, resourceBlockCount: 1, slotCount: 1 })).toThrow()
 })
 it('rejects overflow without mutating caller input', () => {
   const input = { ueCount: Number.MAX_SAFE_INTEGER, resourceBlockCount: 2, slotCount: 1 }
   expect(() => calculateM4WorkUnits(input)).toThrow('güvenli tam sayı sınırını')
   expect(Object.isFrozen(input)).toBe(false)
 })
 it('accepts calculated workloads and preserves existing limits', () => {
   expect(() => assertM4WorkloadAllowed({ ueCount: 10, resourceBlockCount: 100, slotCount: 100 })).not.toThrow()
   expect(simulationConfig.experiments.maxWorkUnits).toBe(100_000_000)
   expect(simulationConfig.experiments.m2MaxWorkUnits).toBe(300_000_000)
   expect(simulationConfig.experiments.m3MaxWorkUnits).toBe(200_000_000)
 })
})
