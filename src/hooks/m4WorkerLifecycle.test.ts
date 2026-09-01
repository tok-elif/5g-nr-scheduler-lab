import { describe, expect, it, vi } from 'vitest'
import { makeM4TestInput } from '../testing/m4Fixture'
import type { M4WorkerResponse } from '../workers/m4Protocol'
import { createM4WorkerLifecycle, type M4WorkerLike } from './m4WorkerLifecycle'
class FakeWorker implements M4WorkerLike {
 onmessage: ((event: MessageEvent<M4WorkerResponse>) => void) | null = null
 onerror: (() => void) | null = null
 onmessageerror: (() => void) | null = null
 messages: unknown[] = []
 terminated = 0
 postMessage(message: unknown) { this.messages.push(message) }
 terminate() { this.terminated += 1 }
}
const setup = () => {
 const workers: FakeWorker[] = []
 const states: any[] = []
 let id = 0
 const controller = createM4WorkerLifecycle({
   createWorker: () => {
     const worker = new FakeWorker()
     workers.push(worker)
     return worker
   },
   createRequestId: () => `request-${++id}`,
   onState: (state) => states.push(state),
 })
 return { controller, workers, states }
}
describe('M4 worker lifecycle', () => {
 it('starts idle and runs one request', () => {
   const { controller, workers } = setup()
   expect(controller.getState().status).toBe('idle')
   controller.run(makeM4TestInput())
   expect(controller.getState().status).toBe('running')
   expect(workers[0].messages).toHaveLength(1)
 })
 it('accepts matching success and terminates', () => {
   const { controller, workers } = setup()
   controller.run(makeM4TestInput())
   const result = {} as any
   workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'request-1', ok: true, result } } as MessageEvent<M4WorkerResponse>)
   expect(controller.getState()).toEqual({ status: 'success', result, error: null })
   expect(workers[0].terminated).toBe(1)
 })
 it('accepts matching error without exposing stack', () => {
   const { controller, workers } = setup()
   controller.run(makeM4TestInput())
   workers[0].onmessage?.({ data: { kind: 'm4-error', requestId: 'request-1', ok: false, error: 'Güvenli hata' } } as MessageEvent<M4WorkerResponse>)
   expect(controller.getState()).toEqual({ status: 'error', result: null, error: 'Güvenli hata' })
 })
 it('ignores stale success and stale error', () => {
   const { controller, workers } = setup()
   controller.run(makeM4TestInput())
   controller.run(makeM4TestInput())
   workers[0].onmessage?.({ data: { kind: 'm4-error', requestId: 'request-1', ok: false, error: 'stale' } } as MessageEvent<M4WorkerResponse>)
   expect(controller.getState().status).toBe('running')
   workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'request-1', ok: true, result: {} as any } } as MessageEvent<M4WorkerResponse>)
   expect(controller.getState().status).toBe('running')
 })
 it('terminates the old worker on double run', () => {
   const { controller, workers } = setup()
   controller.run(makeM4TestInput())
   controller.run(makeM4TestInput())
   expect(workers[0].terminated).toBe(1)
   expect(workers).toHaveLength(2)
 })
 it('supports cancel, reset and idempotent cleanup', () => {
   const { controller, workers } = setup()
   controller.run(makeM4TestInput())
   controller.cancel()
   expect(controller.getState().status).toBe('cancelled')
   expect(workers[0].terminated).toBe(1)
   controller.reset()
   expect(controller.getState().status).toBe('idle')
   expect(() => { controller.dispose(); controller.dispose() }).not.toThrow()
 })
 it('handles worker error and messageerror', () => {
   const first = setup()
   first.controller.run(makeM4TestInput())
   first.workers[0].onerror?.()
   expect(first.controller.getState().error).toContain('çalıştırılamadı')
   const second = setup()
   second.controller.run(makeM4TestInput())
   second.workers[0].onmessageerror?.()
   expect(second.controller.getState().error).toContain('okunamadı')
 })
 it('does not mutate or freeze caller input', () => {
   const { controller } = setup()
   const input = makeM4TestInput()
   const before = structuredClone(input)
   controller.run(input)
   expect(input).toEqual(before)
   expect(Object.isFrozen(input)).toBe(false)
 })
 it('keeps lifecycle instances isolated and clears stale results', () => {
   const first = setup()
   const second = setup()
   first.controller.run(makeM4TestInput())
   expect(first.controller.getState().status).toBe('running')
   expect(second.controller.getState().status).toBe('idle')
   first.workers[0].onmessage?.({ data: { kind: 'm4-error', requestId: 'request-1', ok: false, error: 'x' } } as MessageEvent<M4WorkerResponse>)
   expect(first.controller.getState().result).toBeNull()
 })
 it('keeps a stable immutable idle snapshot', () => {
   const { controller } = setup()
   expect(controller.getSnapshot()).toBe(controller.getSnapshot())
   expect(Object.isFrozen(controller.getSnapshot())).toBe(true)
 })
 it('creates a new snapshot and notifies after run', () => {
   const { controller } = setup()
   const idle = controller.getSnapshot()
   const listener = vi.fn()
   controller.subscribe(listener)
   controller.run(makeM4TestInput())
   expect(controller.getSnapshot()).not.toBe(idle)
   expect(controller.getSnapshot().status).toBe('running')
   expect(listener).toHaveBeenCalledOnce()
 })
 it('notifies success after storing the exact result', () => {
   const { controller, workers } = setup()
   const snapshots: unknown[] = []
   controller.subscribe(() => snapshots.push(controller.getSnapshot()))
   controller.run(makeM4TestInput())
   const result = { reproducibilityFingerprint: 'M4-test' } as any
   workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'request-1', ok: true, result } } as MessageEvent<M4WorkerResponse>)
   expect(snapshots.at(-1)).toBe(controller.getSnapshot())
   expect(controller.getSnapshot()).toEqual({ status: 'success', result, error: null })
 })
 it('does not clear success while terminating its worker', () => {
   const { controller, workers } = setup()
   controller.run(makeM4TestInput())
   const result = {} as any
   workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'request-1', ok: true, result } } as MessageEvent<M4WorkerResponse>)
   expect(workers[0].terminated).toBe(1)
   expect(controller.getSnapshot().status).toBe('success')
   expect(controller.getSnapshot().result).toBe(result)
 })
 it('does not automatically return success to idle', () => {
   const { controller, workers } = setup()
   controller.run(makeM4TestInput())
   workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'request-1', ok: true, result: {} as any } } as MessageEvent<M4WorkerResponse>)
   expect(controller.getSnapshot().status).toBe('success')
   expect(controller.getSnapshot().status).not.toBe('idle')
 })
 it('clears a success only on explicit reset', () => {
   const { controller, workers } = setup()
   controller.run(makeM4TestInput())
   workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'request-1', ok: true, result: {} as any } } as MessageEvent<M4WorkerResponse>)
   controller.reset()
   expect(controller.getSnapshot()).toEqual({ status: 'idle', result: null, error: null })
 })
 it('clears the previous result when a new run starts', () => {
   const { controller, workers } = setup()
   controller.run(makeM4TestInput())
   workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'request-1', ok: true, result: {} as any } } as MessageEvent<M4WorkerResponse>)
   controller.run(makeM4TestInput())
   expect(controller.getSnapshot()).toEqual({ status: 'running', result: null, error: null })
 })
 it('unsubscribes the exact listener', () => {
   const { controller } = setup()
   const listener = vi.fn()
   const unsubscribe = controller.subscribe(listener)
   unsubscribe()
   controller.run(makeM4TestInput())
   expect(listener).not.toHaveBeenCalled()
 })
 it('isolates a throwing listener from other subscribers', () => {
   const { controller } = setup()
   const listener = vi.fn()
   controller.subscribe(() => { throw new Error('listener') })
   controller.subscribe(listener)
   controller.run(makeM4TestInput())
   expect(listener).toHaveBeenCalledOnce()
 })
 it('ignores a late response after dispose', () => {
   const { controller, workers } = setup()
   controller.run(makeM4TestInput())
   controller.dispose()
   const before = controller.getSnapshot()
   workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'request-1', ok: true, result: {} as any } } as MessageEvent<M4WorkerResponse>)
   expect(controller.getSnapshot()).toBe(before)
 })
 it('clears the active handle after success', () => {
   const { controller, workers } = setup()
   controller.run(makeM4TestInput())
   workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'request-1', ok: true, result: {} as any } } as MessageEvent<M4WorkerResponse>)
   controller.run(makeM4TestInput())
   expect(workers[0].terminated).toBe(1)
   expect(workers).toHaveLength(2)
 })
 it('accepts the active request ID instead of treating it as stale', () => {
   const { controller, workers } = setup()
   controller.run(makeM4TestInput())
   workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'request-1', ok: true, result: {} as any } } as MessageEvent<M4WorkerResponse>)
   expect(controller.getSnapshot().status).toBe('success')
 })
 it('notifies subscribers of cancellation after state changes', () => {
   const { controller } = setup()
   const observed: string[] = []
   controller.subscribe(() => observed.push(controller.getSnapshot().status))
   controller.run(makeM4TestInput())
   controller.cancel()
   expect(observed).toEqual(['running', 'cancelled'])
 })
})
