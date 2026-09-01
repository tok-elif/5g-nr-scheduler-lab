import { describe, expect, it } from 'vitest'
import {
 createRequestWorkerLifecycle,
 type ParsedResponse,
 type RequestWorkerLike,
} from './requestWorkerLifecycle'
interface FakeResponse { ok: boolean; payload?: string; error?: string; stack?: string }
class FakeWorker implements RequestWorkerLike<unknown, FakeResponse> {
 onmessage: ((event: MessageEvent<FakeResponse>) => void) | null = null
 onerror: (() => void) | null = null
 onmessageerror: (() => void) | null = null
 terminated = 0
 posted: unknown[] = []
 postMessage(message: unknown) { this.posted.push(message) }
 terminate() { this.terminated += 1 }
 emit(response: FakeResponse) { this.onmessage?.({ data: response } as MessageEvent<FakeResponse>) }
}
// M2, normal M3 ve bilimsel M3 yanıt biçimlerini temsil eden readResponse'lar.
const READERS: Record<string, (r: FakeResponse) => ParsedResponse<string>> = {
 m2: (r) => (r.ok ? { ok: true, data: r.payload } : { ok: false, error: r.error }),
 m3: (r) => (r.ok ? { ok: true, data: r.payload } : { ok: false, error: r.error }),
 'm3-scientific': (r) => (r.ok ? { ok: true, data: r.payload } : { ok: false, error: r.error }),
}
function setup(kind: string) {
 const workers: FakeWorker[] = []
 const lifecycle = createRequestWorkerLifecycle<unknown, FakeResponse, string>({
   createWorker: () => { const w = new FakeWorker(); workers.push(w); return w },
   readResponse: READERS[kind],
   errorMessage: `${kind} worker çalıştırılamadı.`,
 })
 return { lifecycle, workers }
}
describe.each(['m2', 'm3', 'm3-scientific'])('requestWorkerLifecycle [%s]', (kind) => {
 it('1. starts idle', () => {
   expect(setup(kind).lifecycle.getSnapshot()).toMatchObject({ status: 'idle', data: null, error: null })
 })
 it('2. run transitions to running', () => {
   const { lifecycle } = setup(kind)
   lifecycle.run({})
   expect(lifecycle.getSnapshot().status).toBe('running')
 })
 it('3. matching success transitions to success', () => {
   const { lifecycle, workers } = setup(kind)
   lifecycle.run({})
   workers[0].emit({ ok: true, payload: 'RESULT' })
   expect(lifecycle.getSnapshot().status).toBe('success')
 })
 it('4. exposes the result data', () => {
   const { lifecycle, workers } = setup(kind)
   lifecycle.run({})
   workers[0].emit({ ok: true, payload: 'RESULT' })
   expect(lifecycle.getSnapshot().data).toBe('RESULT')
 })
 it('5. worker terminate does not clear the result', () => {
   const { lifecycle, workers } = setup(kind)
   lifecycle.run({})
   workers[0].emit({ ok: true, payload: 'RESULT' })
   expect(workers[0].terminated).toBe(1)
   expect(lifecycle.getSnapshot().data).toBe('RESULT')
 })
 it('6. ignores a stale response from a superseded worker', () => {
   const { lifecycle, workers } = setup(kind)
   lifecycle.run({})
   lifecycle.run({}) // supersede: workers[0] is now stale
   workers[0].emit({ ok: true, payload: 'STALE' })
   expect(lifecycle.getSnapshot().status).toBe('running')
   expect(lifecycle.getSnapshot().data).toBeNull()
   workers[1].emit({ ok: true, payload: 'FRESH' })
   expect(lifecycle.getSnapshot().data).toBe('FRESH')
 })
 it('7. Strict Mode-like dispose then run does not swallow the result', () => {
   const { lifecycle, workers } = setup(kind)
   lifecycle.dispose()
   lifecycle.run({})
   workers[0].emit({ ok: true, payload: 'RESULT' })
   expect(lifecycle.getSnapshot().status).toBe('success')
   expect(lifecycle.getSnapshot().data).toBe('RESULT')
 })
 it('8. re-reading the snapshot keeps the same result (parent rerender)', () => {
   const { lifecycle, workers } = setup(kind)
   lifecycle.run({})
   workers[0].emit({ ok: true, payload: 'RESULT' })
   expect(lifecycle.getSnapshot()).toBe(lifecycle.getSnapshot())
   expect(lifecycle.getSnapshot().data).toBe('RESULT')
 })
 it('9. surfaces a sanitized error string, never a stack', () => {
   const { lifecycle, workers } = setup(kind)
   lifecycle.run({})
   workers[0].emit({ ok: false, error: 'Güvenli hata mesajı', stack: 'Error: secret\n at x' })
   expect(lifecycle.getSnapshot().status).toBe('error')
   expect(lifecycle.getSnapshot().error).toBe('Güvenli hata mesajı')
   expect(lifecycle.getSnapshot().data).toBeNull()
 })
 it('10. dispose terminates the active worker (unmount)', () => {
   const { lifecycle, workers } = setup(kind)
   lifecycle.run({})
   lifecycle.dispose()
   expect(workers[0].terminated).toBe(1)
 })
 it('11. double run terminates the first worker', () => {
   const { lifecycle, workers } = setup(kind)
   lifecycle.run({})
   lifecycle.run({})
   expect(workers[0].terminated).toBe(1)
   expect(workers).toHaveLength(2)
 })
 it('12. separate instances do not share state', () => {
   const a = setup(kind)
   const b = setup(kind)
   a.lifecycle.run({})
   a.workers[0].emit({ ok: true, payload: 'A' })
   expect(a.lifecycle.getSnapshot().data).toBe('A')
   expect(b.lifecycle.getSnapshot()).toMatchObject({ status: 'idle', data: null })
 })
 it('onerror produces the fallback error message', () => {
   const { lifecycle, workers } = setup(kind)
   lifecycle.run({})
   workers[0].onerror?.()
   expect(lifecycle.getSnapshot().status).toBe('error')
   expect(lifecycle.getSnapshot().error).toContain('çalıştırılamadı')
 })
})
