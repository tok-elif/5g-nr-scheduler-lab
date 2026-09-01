import { describe, expect, it } from 'vitest'
import { makeM4TestInput, makeTestUe } from '../testing/m4Fixture'
import { handleM4WorkerRequest } from './m4WorkerHandler'
const request = (requestId = 'req-1') => ({
 kind: 'run-m4',
 requestId,
 input: makeM4TestInput(),
})
describe('pure M4 worker handler', () => {
 it('returns a structured-clone-safe success and echoes request ID', () => {
   const response = handleM4WorkerRequest(request())
   expect(response.ok).toBe(true)
   expect(response.requestId).toBe('req-1')
   expect(() => structuredClone(response)).not.toThrow()
 })
 it('is deterministic and keeps request ID outside fingerprint', () => {
   const first = handleM4WorkerRequest(request('a'))
   const second = handleM4WorkerRequest(request('b'))
   expect(first.ok && second.ok).toBe(true)
   if (first.ok && second.ok) {
     expect(first.result).toEqual(second.result)
     expect(first.result.reproducibilityFingerprint).toBe(second.result.reproducibilityFingerprint)
   }
 })
 it('returns sanitized errors for invalid protocol and input', () => {
   const unknown = handleM4WorkerRequest({ kind: 'bad', requestId: 'x' })
   expect(unknown.ok).toBe(false)
   expect(unknown.requestId).toBe('x')
   if (!unknown.ok) expect(unknown.error).not.toContain('\n    at ')
   expect(handleM4WorkerRequest({ kind: 'run-m4', requestId: '', input: makeM4TestInput() }).ok).toBe(false)
 })
 it('rejects UE count mismatch and invalid trace', () => {
   const base = request()
   const mismatch = { ...base, input: { ...base.input, ues: base.input.ues.slice(1) } }
   expect(handleM4WorkerRequest(mismatch).ok).toBe(false)
   const trace = { ...base, input: { ...base.input, resourceTraceSlotLimit: -1 } }
   expect(handleM4WorkerRequest(trace).ok).toBe(false)
 })
 it('enforces the M4 workload guard', () => {
   const base = request()
   const oversized = {
     ...base,
     input: {
       ...base.input,
       cell: { ...base.input.cell, resourceBlocks: 273 },
       m2Config: { ...base.input.m2Config, slotCount: 100_000 },
       ues: Array.from({ length: 6 }, (_, index) => makeTestUe(index + 1)),
     },
   }
   const response = handleM4WorkerRequest(oversized)
   expect(response.ok).toBe(false)
   if (!response.ok) expect(response.error).toContain('güvenli sınır 100.000.000')
 })
 it('does not mutate or freeze caller requests', () => {
   const caller = request()
   const before = structuredClone(caller)
   handleM4WorkerRequest(caller)
   expect(caller).toEqual(before)
   expect(Object.isFrozen(caller)).toBe(false)
   expect(Object.isFrozen(caller.input)).toBe(false)
 })
 it('does not leak session state across calls', () => {
   const first = handleM4WorkerRequest(request())
   const second = handleM4WorkerRequest(request())
   expect(first).toEqual(second)
 })
})
