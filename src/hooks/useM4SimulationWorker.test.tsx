import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { makeM4TestInput } from '../testing/m4Fixture'
import type { M4WorkerResponse } from '../workers/m4Protocol'
import { createM4WorkerLifecycle, type M4WorkerLike } from './m4WorkerLifecycle'
import { useM4LifecycleSnapshot } from './useM4SimulationWorker'
class FakeWorker implements M4WorkerLike {
 onmessage: ((event: MessageEvent<M4WorkerResponse>) => void) | null = null
 onerror: (() => void) | null = null
 onmessageerror: (() => void) | null = null
 terminated = 0
 message: unknown = null
 postMessage(message: unknown) { this.message = message }
 terminate() { this.terminated += 1 }
}
const setup = () => {
 const workers: FakeWorker[] = []
 let id = 0
 const lifecycle = createM4WorkerLifecycle({
   createWorker: () => { const worker = new FakeWorker(); workers.push(worker); return worker },
   createRequestId: () => `hook-${++id}`,
 })
 return { lifecycle, workers }
}
function Harness({ lifecycle }: { lifecycle: ReturnType<typeof createM4WorkerLifecycle> }) {
 const snapshot = useM4LifecycleSnapshot(lifecycle)
 return <output data-status={snapshot.status} data-result={snapshot.result ? 'present' : 'none'}>{snapshot.error}</output>
}
const render = (lifecycle: ReturnType<typeof createM4WorkerLifecycle>) => renderToStaticMarkup(<Harness
lifecycle={lifecycle} />)
describe('M4 React external-store bridge', () => {
 it('renders initial idle', () => expect(render(setup().lifecycle)).toContain('data-status="idle"'))
 it('renders running after run', () => { const { lifecycle } = setup(); lifecycle.run(makeM4TestInput());
expect(render(lifecycle)).toContain('data-status="running"') })
 it('renders success after matching fake worker response', () => { const { lifecycle, workers } = setup();
lifecycle.run(makeM4TestInput()); workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'hook-1', ok: true, result: {} as any } } as MessageEvent<M4WorkerResponse>); expect(render(lifecycle)).toContain('data-status="success"') })
 it('exposes the result through the hook snapshot', () => { const { lifecycle, workers } = setup();
lifecycle.run(makeM4TestInput()); workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'hook-1', ok: true, result: {} as any } } as MessageEvent<M4WorkerResponse>); expect(render(lifecycle)).toContain('data-result="present"') })
 it('keeps result after worker termination', () => { const { lifecycle, workers } = setup(); lifecycle.run(makeM4TestInput( )); workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'hook-1', ok: true, result: {} as any } } as MessageEvent<M4WorkerResponse>); expect(workers[0].terminated).toBe(1); expect(render(lifecycle)).toContain('data-result="present"') })
 it('reset clears the rendered result', () => { const { lifecycle, workers } = setup(); lifecycle.run(makeM4TestInput()); workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'hook-1', ok: true, result: {} as any } } as MessageEvent<M4WorkerResponse>); lifecycle.reset(); expect(render(lifecycle)).toContain('data-result="none"') })
 it('parent rerender keeps the same result', () => { const { lifecycle, workers } = setup();
lifecycle.run(makeM4TestInput()); workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'hook-1', ok: true, result: {} as any } } as MessageEvent<M4WorkerResponse>); expect(render(lifecycle)).toBe(render(lifecycle)) })
 it('uses one controller instance across renders', () => { const { lifecycle, workers } = setup(); render(lifecycle);
render(lifecycle); lifecycle.run(makeM4TestInput()); expect(workers).toHaveLength(1) })
 it('survives a Strict Mode-like dispose then setup/run sequence', () => { const { lifecycle, workers } = setup();
lifecycle.dispose(); lifecycle.run(makeM4TestInput()); workers[0].onmessage?.({ data: { kind: 'm4-result', requestId: 'hook-1', ok: true, result: {} as any } } as MessageEvent<M4WorkerResponse>); expect(render(lifecycle)).toContain('data-status="success"') })
 it('renders sanitized worker errors instead of a result', () => { const { lifecycle, workers } = setup();
lifecycle.run(makeM4TestInput()); workers[0].onmessage?.({ data: { kind: 'm4-error', requestId: 'hook-1', ok: false, error: 'Güvenli hata' } } as MessageEvent<M4WorkerResponse>); const html = render(lifecycle);
expect(html).toContain('data-status="error"'); expect(html).toContain('Güvenli hata') })
})
