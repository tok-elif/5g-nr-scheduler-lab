import { describe, expect, it } from 'vitest'
import simulationConfig from '../config/simulation.json'
import { M2_SCHEDULERS } from '../m2Schedulers'
import {
 calculateM2WorkUnits,
 assertM2WorkloadAllowed,
 assertM2WorkUnitsAllowed,
} from './m2WorkloadGuard'
const schedulerCount = M2_SCHEDULERS.length
describe('M2 workload guard', () => {
 it('uses the existing scheduler × UE × RB × slot cost model deterministically', () => {
   const input = { ueCount: 10, resourceBlockCount: 106, slotCount: 2 }
   expect(calculateM2WorkUnits(input)).toBe(schedulerCount * 10 * 106 * 2)
   expect(calculateM2WorkUnits(input)).toBe(calculateM2WorkUnits(input))
 })
 it('is independent from trace and UI/request metadata', () => {
   const scientificInput = { ueCount: 2, resourceBlockCount: 10, slotCount: 20 }
   expect(calculateM2WorkUnits(scientificInput)).toBe(schedulerCount * 400)
 })
 it.each([
   [{ ueCount: -1, resourceBlockCount: 1, slotCount: 1 }, 'negatif UE'],
   [{ ueCount: 1, resourceBlockCount: 0, slotCount: 1 }, 'sıfır RB'],
   [{ ueCount: 1, resourceBlockCount: 1, slotCount: 1.5 }, 'kesirli slot'],
   [{ ueCount: Number.POSITIVE_INFINITY, resourceBlockCount: 1, slotCount: 1 }, 'non-finite değer'],
 ])('%s girdisini reddeder (%s)', (input) => {
   expect(() => calculateM2WorkUnits(input)).toThrow()
 })
 it('safe-integer overflowunu açıkça reddeder', () => {
   expect(() => calculateM2WorkUnits({
     ueCount: Number.MAX_SAFE_INTEGER,
     resourceBlockCount: 2,
     slotCount: 1,
   })).toThrow('güvenli tam sayı sınırını')
 })
 it.each([
   100_000_000,
   150_000_000,
   273_000_000,
   299_999_999,
   300_000_000,
 ])(
   '%i birimlik yükü kabul eder',
   (workUnits) => {
     expect(() => assertM2WorkUnitsAllowed(workUnits)).not.toThrow()
   },
 )
 it('300.000.001 birimi gerçek yük ve sınırla reddeder', () => {
   expect(() => assertM2WorkUnitsAllowed(300_000_001))
     .toThrow('300.000.001 UE-RB-slot birimi; güvenli sınır 300.000.000')
 })
 it('küçük deneyleri kabul eder ve caller girdisini değiştirmez', () => {
   const input = Object.freeze({ ueCount: 2, resourceBlockCount: 10, slotCount: 20 })
   expect(() => assertM2WorkloadAllowed(input)).not.toThrow()
   expect(input).toEqual({ ueCount: 2, resourceBlockCount: 10, slotCount: 20 })
 })
 it('M2 limitini ayırırken paylaşılan M3/M4 limitini değiştirmez', () => {
   expect(simulationConfig.experiments.m2MaxWorkUnits).toBe(300_000_000)
   expect(simulationConfig.experiments.maxWorkUnits).toBe(100_000_000)
 })
})
