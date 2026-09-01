import { describe, expect, it, vi } from 'vitest'
import { createDefaultM4FormState } from './m4FormState'
import { submitM4Form } from './m4Submit'
const invoke = (overrides: Partial<Parameters<typeof submitM4Form>[0]> = {}) => {
 const preventDefault = vi.fn()
 const run = vi.fn()
 const state = createDefaultM4FormState()
 const error = submitM4Form({ event: { preventDefault }, state, running: false, run, ...overrides })
 return { error, preventDefault, run, state }
}
describe('M4 submit handler', () => {
 it('prevents native navigation', () => expect(invoke().preventDefault).toHaveBeenCalledOnce())
 it('runs a valid default form exactly once', () => expect(invoke().run).toHaveBeenCalledOnce())
 it('returns no error for valid submit', () => expect(invoke().error).toBeNull())
 it('builds a matching worker input', () => { const { run, state } = invoke(); expect(run.mock.calls[0][0].ues).toHaveLength(state.slices.reduce((sum, slice) => sum + slice.ueCount, 0)) })
 it('preserves seed, slots and trace', () => { const { run, state } = invoke(); const input = run.mock.calls[0][0];
expect([input.baseSeed, input.m2Config.slotCount, input.resourceTraceSlotLimit]).toEqual([state.baseSeed, state.slotCount, state.resourceTraceSlotLimit]) })
 it('keeps static-weighted policy', () => expect(invoke().run.mock.calls[0][0].m4Config.interSlicePolicy).toBe('static-weighted'))
 it('does not run an invalid form', () => { const state = { ...createDefaultM4FormState(), slotCount: 0 }; expect(invoke({ state }).run).not.toHaveBeenCalled() })
 it('returns a visible invalid reason', () => { const state = { ...createDefaultM4FormState(), slotCount: 0 };
expect(invoke({ state }).error).toContain('Simülasyon başlatılamıyor:') })
 it('blocks a second submit while running', () => { const result = invoke({ running: true }); expect(result.run).not.toHaveBeenCalled(); expect(result.error).toContain('zaten çalışıyor') })
 it('surfaces conversion or run exceptions', () => { const error = invoke({ run: () => { throw new Error('worker bridge') } }).error; expect(error).toBe('Simülasyon çalıştırılamadı: worker bridge') })
})
