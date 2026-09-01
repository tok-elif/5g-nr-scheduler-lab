import { describe, expect, it } from 'vitest'
import { runM2Matrix } from './m2Matrix'
describe('M2 capacity-normalized load profiles', () => {
 it.each([
   ['capacity-50', 0.5],
   ['capacity-80', 0.8],
   ['capacity-110', 1.1],
 ] as const)('targets the requested offered-load ratio for %s', (loadProfileId, target) => {
   const result = runM2Matrix({
     scenarioId: 'sc2-mixed-qos',
     loadProfileId,
     durationMs: 10,
     ueCount: 4,
     baseSeed: 2026,
   })
   expect(result.loadMode).toBe('capacity-fraction')
   for (const row of result.rows) {
     expect(row.normalizedOfferedLoad).toBeCloseTo(target, 12)
     expect(row.offeredLoadMbps).toBeCloseTo(row.capacityReferenceMbps * target, 10)
   }
 })
 it('retains the fixed medium-load baseline', () => {
   const result = runM2Matrix({
     scenarioId: 'sc2-mixed-qos',
     loadProfileId: 'medium',
     durationMs: 10,
     ueCount: 4,
     baseSeed: 2026,
   })
   expect(result.loadMode).toBe('fixed-multiplier')
   expect(new Set(result.rows.map((row) => row.arrivalRateMultiplier))).toEqual(new Set([1]))
 })
})
