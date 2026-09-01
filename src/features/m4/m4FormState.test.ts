import { describe, expect, it } from 'vitest'
import { M4_CONFIG } from '../../config/m4Config'
import { calculateM4WorkUnits } from '../../simulation/m4WorkloadGuard'
import { createDefaultM4FormState, createM4RunInputFromForm, validateM4FormState } from './m4FormState'
const change = (value: ReturnType<typeof createDefaultM4FormState>, patch: Partial<typeof value>) => ({ ...value, ...patch })
const sliceChange = (value: ReturnType<typeof createDefaultM4FormState>, index: number, patch: Partial<typeof value.slices[number]>) =>
 ({ ...value, slices: value.slices.map((slice, current) => current === index ? { ...slice, ...patch } : slice) })
describe('M4 form state', () => {
 it('uses backend defaults', () => expect(createDefaultM4FormState().slices.map((x) =>
x.weight)).toEqual(M4_CONFIG.slices.map((x) => x.defaultWeight)))
 it('keeps canonical order', () => expect(createDefaultM4FormState().slices.map((x) => x.id)).toEqual(['embb', 'urllc', 'mmtc']))
 it('accepts defaults', () => expect(validateM4FormState(createDefaultM4FormState()).valid).toBe(true))

 it('accepts exactly 100 enabled UE across slices', () => {
   const state = createDefaultM4FormState()
   const slices = state.slices.map((slice, index) => ({ ...slice, enabled: true, ueCount: [50, 30, 20][index] }))
   expect(validateM4FormState({ ...state, slices }).valid).toBe(true)
 })
 it('rejects more than 100 enabled UE across slices', () => {
   const state = createDefaultM4FormState()
   const slices = state.slices.map((slice, index) => ({ ...slice, enabled: true, ueCount: [50, 30, 21][index] }))
   const validation = validateM4FormState({ ...state, slices })
   expect(validation.valid).toBe(false)
   expect(validation.errors).toContain('Toplam etkin UE sayısı 100 değerini aşamaz.')
 })
 it('rejects negative UE', () => expect(validateM4FormState(sliceChange(createDefaultM4FormState(), 0, { ueCount: -1 })).valid).toBe(false))
 it('rejects fractional UE', () => expect(validateM4FormState(sliceChange(createDefaultM4FormState(), 0, { ueCount: 1.5 })).valid).toBe(false))
 it('rejects zero total UE', () => expect(validateM4FormState(change(createDefaultM4FormState(), { slices: createDefaultM4FormState().slices.map((x) => ({ ...x, ueCount: 0 })) })).valid).toBe(false))
 it('rejects negative weight', () => expect(validateM4FormState(sliceChange(createDefaultM4FormState(), 0, { weight: -1 })).valid).toBe(false))
 it('rejects zero enabled weights', () => expect(validateM4FormState(change(createDefaultM4FormState(), { slices: createDefaultM4FormState().slices.map((x) => ({ ...x, weight: 0 })) })).valid).toBe(false))
 it('rejects minimum share below zero', () => expect(validateM4FormState(sliceChange(createDefaultM4FormState(), 0, { minimumShare: -0.1 })).valid).toBe(false))
 it('rejects minimum share above one', () => expect(validateM4FormState(sliceChange(createDefaultM4FormState(), 0, { minimumShare: 1.1 })).valid).toBe(false))
 it('rejects minimum share sum above one', () => expect(validateM4FormState(change(createDefaultM4FormState(), { slices: createDefaultM4FormState().slices.map((x) => ({ ...x, minimumShare: 0.5 })) })).valid).toBe(false))
 it('rejects unsafe seed', () => expect(validateM4FormState(change(createDefaultM4FormState(), { baseSeed: Number.MAX_VALUE })).valid).toBe(false))
 it('rejects zero slots', () => expect(validateM4FormState(change(createDefaultM4FormState(), { slotCount: 0 })).valid).toBe(false))
 it('rejects negative trace limit', () => expect(validateM4FormState(change(createDefaultM4FormState(), {
resourceTraceSlotLimit: -1 })).valid).toBe(false))
 it('rejects unsupported scheduler', () => expect(validateM4FormState(sliceChange(createDefaultM4FormState(), 0, { scheduler: 'bad' as never })).valid).toBe(false))
 it('maps disabled slice UE count to zero', () => expect(createM4RunInputFromForm(sliceChange( createDefaultM4FormState(), 2, { enabled: false })).m4Config.slices[2].ueCount).toBe(0))
 it('converts to a worker input', () => expect(createM4RunInputFromForm(createDefaultM4FormState()).ues.length).toBeGreaterThan(0))
 it('converts deterministically', () => expect(createM4RunInputFromForm(createDefaultM4FormState())).toEqual( createM4RunInputFromForm(createDefaultM4FormState())))
 it('does not mutate caller state', () => { const form = createDefaultM4FormState(); const before = structuredClone(form); createM4RunInputFromForm(form); expect(form).toEqual(before) })
 it('uses the shared workload helper', () => { const form = createDefaultM4FormState(); const input = createM4RunInputFromForm(form); expect(validateM4FormState(form).workUnits).toBe(calculateM4WorkUnits({ ueCount: input.ues.length, resourceBlockCount: input.cell.resourceBlocks, slotCount: form.slotCount })) })
})
