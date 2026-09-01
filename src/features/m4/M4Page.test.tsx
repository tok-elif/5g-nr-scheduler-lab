import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { runM4 } from '../../simulation/m4'
import { makeM4TestInput } from '../../testing/m4Fixture'
import { createM4WorkerLifecycle, type M4WorkerLike } from '../../hooks/m4WorkerLifecycle'
import type { M4WorkerResponse } from '../../workers/m4Protocol'
import { M4Results, M4StatusRegion } from './M4Page'
import { createM4ViewModel } from './m4ViewModel'
const status = (value: Parameters<typeof M4StatusRegion>[0]['status'], error: string | null = null) =>
 renderToStaticMarkup(<M4StatusRegion status={value} error={error} />)
const view = createM4ViewModel(runM4(makeM4TestInput(3)))
const results = () => renderToStaticMarkup(<M4Results view={view} />)
describe('M4 page visible states and results', () => {
 it('shows ready while idle', () => expect(status('idle')).toContain('Hazır'))
 it('shows running with a live status region', () => { const html = status('running'); expect(html).toContain('Simülasyon çalışıyor…'); expect(html).toContain('role="status"'); expect(html).toContain('aria-live="polite"') })
 it('shows completed for success', () => expect(status('success')).toContain('Simülasyon tamamlandı'))
 it('shows a visible alert and message for error', () => { const html = status('error', 'Worker hatası');
expect(html).toContain('role="alert"'); expect(html).toContain('Worker hatası') })
 it('shows cancelled state', () => expect(status('cancelled')).toContain('Simülasyon iptal edildi'))
 it('renders the cell summary after success', () => expect(results()).toContain('M4 hücre özeti'))
 it('renders all three canonical slice cards', () => { const html = results(); expect(html).toContain('eMBB');
expect(html).toContain('URLLC'); expect(html).toContain('mMTC') })
 it('keeps result cards renderable after the worker-owned run has ended', () => expect(results()).toContain('Slice sonuç kartları'))
 it('does not include the idle message inside successful results', () => expect(results()).not.toContain('Bir M4senaryosu yapılandırın'))
 it('renders the deterministic fingerprint', () => expect(results()).toContain(view.fingerprint))
 it('keeps results stable across parent rerenders', () => expect(results()).toBe(results()))
 it('keeps results independent from later form-state edits', () => { const before = results(); const editedFormOnly = { slotCount: 1 }; expect(editedFormOnly.slotCount).toBe(1); expect(results()).toBe(before) })
 it('models submit → worker success → terminate → persistent UI cards end to end', () => {
   const worker: M4WorkerLike & { terminated: number; request: unknown } = {
     onmessage: null,
     onerror: null,
     onmessageerror: null,
     terminated: 0,
     request: null,
     postMessage(request) { this.request = request },
     terminate() { this.terminated += 1 },
   }
   const lifecycle = createM4WorkerLifecycle({ createWorker: () => worker, createRequestId: () => 'ui-request' })
   lifecycle.run(makeM4TestInput())
   const result = runM4(makeM4TestInput())
   worker.onmessage?.({ data: { kind: 'm4-result', requestId: 'ui-request', ok: true, result } } as MessageEvent<M4WorkerResponse>)
   const snapshot = lifecycle.getSnapshot()
   expect(worker.request).toMatchObject({ kind: 'run-m4', requestId: 'ui-request' })
   expect(worker.terminated).toBe(1)
   expect(renderToStaticMarkup(<M4StatusRegion status={snapshot.status} error={snapshot.error}
/>)).toContain('Simülasyon tamamlandı')
   expect(renderToStaticMarkup(<M4Results view={createM4ViewModel(snapshot.result!)} />)).toContain('M4 hücre özeti')
   expect(lifecycle.getSnapshot().result).toBe(result)
 })
})
