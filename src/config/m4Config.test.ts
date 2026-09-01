import { describe, expect, it } from 'vitest'
import rawConfig from './m4.json'
import {
 M4_CONFIG,
 createM4RuntimeConfig,
 validateM4Config,
 validateM4RuntimeConfig,
} from './m4Config'
function mutableRuntime() {
 const valid = createM4RuntimeConfig(6, { embb: 2, urllc: 2, mmtc: 2 })
 return {
   ...valid,
   slices: valid.slices.map((slice) => ({
     ...slice,
     allowedFiveQis: [...slice.allowedFiveQis],
   })),
 }
}
describe('M4 config and runtime validation', () => {
 it('loads schema version 1 from JSON', () => {
   expect(validateM4Config(rawConfig)).toEqual(M4_CONFIG)
   expect(M4_CONFIG.schemaVersion).toBe(1)
 })
 it('keeps the three canonical slices and stable metadata', () => {
   expect(M4_CONFIG.slices.map((slice) => slice.id)).toEqual(['embb', 'urllc', 'mmtc'])
   expect(M4_CONFIG.slices.map((slice) => slice.color)).toEqual(['#2563eb', '#c59a4a', '#0f766e'])
   expect(M4_CONFIG.slices.map((slice) => [
     slice.defaultWeight,
     slice.defaultMinimumShare,
     slice.defaultScheduler,
   ])).toEqual([
     [0.5, 0.3, 'proportional-fair'],
     [0.3, 0.3, 'm-lwdf'],
     [0.2, 0.1, 'proportional-fair'],
   ])
   expect(M4_CONFIG.slices.map((slice) => slice.allowedFiveQis)).toEqual([[6, 9], [1, 2], [9]])
 })
 it('creates canonical runtime totals and derives enabled flags', () => {
   const runtime = createM4RuntimeConfig(5, { embb: 3, urllc: 0, mmtc: 2 })
   expect(runtime.totalUeCount).toBe(5)
   expect(runtime.slices.map((slice) => [slice.id, slice.ueCount, slice.enabled])).toEqual([
     ['embb', 3, true],
     ['urllc', 0, false],
     ['mmtc', 2, true],
   ])
 })
 it('rejects factory count mismatch and invalid counts', () => {
   expect(() => createM4RuntimeConfig(5, { embb: 2, urllc: 1, mmtc: 1 })).toThrow(/eşleşmelidir/)
   expect(() => createM4RuntimeConfig(1, { embb: -1, urllc: 1, mmtc: 1 })).toThrow(/negatif olmayan/)
   expect(() => createM4RuntimeConfig(1, { embb: 0.5, urllc: 0, mmtc: 0.5 })).toThrow(/tam sayı/)
   expect(() => createM4RuntimeConfig(0, { embb: 0, urllc: 0, mmtc: 0 })).toThrow(/pozitif/)
 })
 it('rejects enabled/count inconsistencies', () => {
   const positiveDisabled = mutableRuntime()
   positiveDisabled.slices[0].enabled = false
   expect(() => validateM4RuntimeConfig(positiveDisabled)).toThrow(/UE sayısından türetilmelidir/)
   const zeroEnabled = mutableRuntime()
   zeroEnabled.slices[0].ueCount = 0
   expect(() => validateM4RuntimeConfig(zeroEnabled)).toThrow(/UE sayısından türetilmelidir/)
 })
 it('rejects total UE mismatch', () => {
   const runtime = mutableRuntime()
   runtime.totalUeCount = 7
   expect(() => validateM4RuntimeConfig(runtime)).toThrow(/totalUeCount/)
 })
 it('rejects duplicate, missing, unknown and noncanonical slices', () => {
   const duplicate = mutableRuntime()
   duplicate.slices[1] = { ...duplicate.slices[0] }
   expect(() => validateM4RuntimeConfig(duplicate)).toThrow(/canonical|duplicate/)
   const missing = mutableRuntime()
   missing.slices.pop()
   expect(() => validateM4RuntimeConfig(missing)).toThrow(/tam olarak üç/)
   const unknown = mutableRuntime()
   Reflect.set(unknown.slices[0], 'id', 'other')
   expect(() => validateM4RuntimeConfig(unknown)).toThrow(/Bilinmeyen/)
   const reordered = mutableRuntime()
   ;[reordered.slices[0], reordered.slices[1]] = [reordered.slices[1], reordered.slices[0]]
   expect(() => validateM4RuntimeConfig(reordered)).toThrow(/canonical/)
 })
 it('rejects zero enabled weights and excessive minimum shares', () => {
   const zeroWeights = mutableRuntime()
   zeroWeights.slices.forEach((slice) => { slice.weight = 0 })
   expect(() => validateM4RuntimeConfig(zeroWeights)).toThrow(/ağırlıkları/)
   const shares = mutableRuntime()
   shares.slices.forEach((slice) => { slice.minimumShare = 0.4 })
   expect(() => validateM4RuntimeConfig(shares)).toThrow(/toplamı/)
 })
 it('rejects unknown scheduler and unsupported policy', () => {
   const scheduler = mutableRuntime()
   Reflect.set(scheduler.slices[0], 'scheduler', 'unknown')
   expect(() => validateM4RuntimeConfig(scheduler)).toThrow(/scheduler/)
   const policy = mutableRuntime()
   Reflect.set(policy, 'interSlicePolicy', 'dynamic')
   expect(() => validateM4RuntimeConfig(policy)).toThrow(/policy/)
 })
 it('does not mutate factory inputs and is deterministic', () => {
   const counts = { embb: 2, urllc: 1, mmtc: 1 } as const
   const snapshot = structuredClone(counts)
   const first = createM4RuntimeConfig(4, counts)
   const second = createM4RuntimeConfig(4, counts)
   expect(counts).toEqual(snapshot)
   expect(first).toEqual(second)
   expect(first).not.toBe(second)
 })
 it('returns an immutable deep snapshot', () => {
   const runtime = createM4RuntimeConfig(3, { embb: 1, urllc: 1, mmtc: 1 })
   expect(Object.isFrozen(runtime)).toBe(true)
   expect(Object.isFrozen(runtime.slices)).toBe(true)
   expect(runtime.slices.every((slice) =>
     Object.isFrozen(slice) && Object.isFrozen(slice.allowedFiveQis))).toBe(true)
 })
 it('validates JSON duplicate, unknown, missing and invalid defaults', () => {
   const base = structuredClone(rawConfig)
   base.slices[1].id = 'embb'
   expect(() => validateM4Config(base)).toThrow(/canonical|duplicate/)
   const unknown = structuredClone(rawConfig)
   unknown.slices[0].id = 'unknown'
   expect(() => validateM4Config(unknown)).toThrow(/Bilinmeyen/)
   const missing = structuredClone(rawConfig)
   missing.slices.pop()
   expect(() => validateM4Config(missing)).toThrow(/tam olarak üç/)
   const weights = structuredClone(rawConfig)
   weights.slices.forEach((slice) => { slice.defaultWeight = 0 })
   expect(() => validateM4Config(weights)).toThrow(/ağırlıkları/)
   const shares = structuredClone(rawConfig)
   shares.slices.forEach((slice) => { slice.defaultMinimumShare = 0.4 })
   expect(() => validateM4Config(shares)).toThrow(/toplamı/)
 })
})
