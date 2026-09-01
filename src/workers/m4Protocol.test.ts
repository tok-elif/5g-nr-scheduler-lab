import { describe, expect, it } from 'vitest'
import { makeM4TestInput } from '../testing/m4Fixture'
import { requestIdFromUnknown, validateM4WorkerRequest } from './m4Protocol'
describe('M4 worker protocol', () => {
 it('validates and snapshots a valid request', () => {
   const request = { kind: 'run-m4', requestId: 'r-1', input: makeM4TestInput() }
   const validated = validateM4WorkerRequest(request)
   expect(validated).toEqual(request)
   expect(validated.input).not.toBe(request.input)
 })
 it('rejects unknown kind and missing/empty IDs', () => {
   expect(() => validateM4WorkerRequest({ kind: 'unknown', requestId: 'x' })).toThrow('kind')
   expect(() => validateM4WorkerRequest({ kind: 'run-m4', input: makeM4TestInput() })).toThrow('requestId')
   expect(() => validateM4WorkerRequest({ kind: 'run-m4', requestId: ' ', input: makeM4TestInput()
})).toThrow('requestId')
 })
 it('rejects invalid trace and UE input', () => {
   expect(() => validateM4WorkerRequest({
     kind: 'run-m4', requestId: 'x', input: { ...makeM4TestInput(), resourceTraceSlotLimit: -1 },
   })).toThrow('trace')
 })
 it('uses a safe fallback request ID', () => {
   expect(requestIdFromUnknown({ requestId: '' })).toBe('invalid-request')
   expect(requestIdFromUnknown({ requestId: 'abc' })).toBe('abc')
 })
})
