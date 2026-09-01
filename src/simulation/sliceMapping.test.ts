import { describe, expect, it } from 'vitest'
import { createUeSliceMapping } from './sliceMapping'
describe('deterministic UE-slice mapping', () => {
 it('maps three slices in canonical contiguous order', () => {
   const result = createUeSliceMapping(6, { embb: 2, urllc: 3, mmtc: 1 })
   expect(result.sliceByUeIndex).toEqual(['embb', 'embb', 'urllc', 'urllc', 'urllc', 'mmtc'])
   expect(result.entries).toEqual(result.sliceByUeIndex.map((sliceId, ueIndex) => ({ ueIndex, sliceId })))
   expect(result.ueIndicesBySlice).toEqual({ embb: [0, 1], urllc: [2, 3, 4], mmtc: [5] })
 })
 it('represents zero-UE slices with empty lists', () => {
   const result = createUeSliceMapping(3, { embb: 2, urllc: 0, mmtc: 1 })
   expect(result.ueIndicesBySlice.urllc).toEqual([])
   expect(result.sliceByUeIndex).toEqual(['embb', 'embb', 'mmtc'])
 })
 it('supports a single active slice', () => {
   const result = createUeSliceMapping(3, { embb: 0, urllc: 3, mmtc: 0 })
   expect(result.sliceByUeIndex).toEqual(['urllc', 'urllc', 'urllc'])
 })
 it('assigns every UE exactly once with consistent views', () => {
   const result = createUeSliceMapping(9, { embb: 4, urllc: 2, mmtc: 3 })
   expect(result.entries.map((entry) => entry.ueIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
   expect(new Set(result.entries.map((entry) => entry.ueIndex)).size).toBe(9)
   for (const entry of result.entries) {
     expect(result.sliceByUeIndex[entry.ueIndex]).toBe(entry.sliceId)
     expect(result.ueIndicesBySlice[entry.sliceId]).toContain(entry.ueIndex)
   }
 })
 it('rejects count mismatches', () => {
   expect(() => createUeSliceMapping(5, { embb: 2, urllc: 1, mmtc: 1 })).toThrow(/eşleşmelidir/)
 })
 it('rejects non-positive total and negative or fractional counts', () => {
   expect(() => createUeSliceMapping(0, { embb: 0, urllc: 0, mmtc: 0 })).toThrow(/pozitif/)
   expect(() => createUeSliceMapping(1, { embb: -1, urllc: 1, mmtc: 1 })).toThrow(/negatif olmayan/)
   expect(() => createUeSliceMapping(1, { embb: 0.5, urllc: 0.5, mmtc: 0 })).toThrow(/tam sayı/)
 })
 it('is deterministic and does not mutate input', () => {
   const counts = { embb: 2, urllc: 2, mmtc: 1 } as const
   const snapshot = structuredClone(counts)
   expect(createUeSliceMapping(5, counts)).toEqual(createUeSliceMapping(5, counts))
   expect(counts).toEqual(snapshot)
 })
 it('returns an immutable deep result', () => {
   const result = createUeSliceMapping(3, { embb: 1, urllc: 1, mmtc: 1 })
   expect(Object.isFrozen(result)).toBe(true)
   expect(Object.isFrozen(result.entries)).toBe(true)
   expect(result.entries.every(Object.isFrozen)).toBe(true)
   expect(Object.isFrozen(result.sliceByUeIndex)).toBe(true)
   expect(Object.isFrozen(result.ueIndicesBySlice)).toBe(true)
   expect(Object.values(result.ueIndicesBySlice).every(Object.isFrozen)).toBe(true)
 })
})
