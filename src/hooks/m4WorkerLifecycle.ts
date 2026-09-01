import type { M4RunInput, M4Result } from '../simulation/m4Types'
import type { M4WorkerRequest, M4WorkerResponse } from '../workers/m4Protocol'
export type M4WorkerStatus = 'idle' | 'running' | 'success' | 'error' | 'cancelled'
export interface M4WorkerLifecycleState {
 readonly status: M4WorkerStatus
 readonly result: M4Result | null
 readonly error: string | null
}
export interface M4WorkerLike {
 onmessage: ((event: MessageEvent<M4WorkerResponse>) => void) | null
 onerror: (() => void) | null
 onmessageerror: (() => void) | null
 postMessage(message: M4WorkerRequest): void
 terminate(): void
}
export function createM4WorkerLifecycle(input: {
 readonly createWorker: () => M4WorkerLike
 readonly createRequestId: () => string
 readonly onState?: (state: M4WorkerLifecycleState) => void
}) {
 let worker: M4WorkerLike | null = null
 let requestId: string | null = null
 const listeners = new Set<() => void>()
 let state: M4WorkerLifecycleState = Object.freeze({ status: 'idle', result: null, error: null })
 const publish = (next: M4WorkerLifecycleState) => {
   state = Object.freeze(next)
   input.onState?.(state)
   for (const listener of [...listeners]) {
     try { listener() } catch { /* A listener must not block other subscribers. */ }
   }
 }
 const terminate = () => {
   worker?.terminate()
   worker = null
   requestId = null
 }
 const fail = (error: string) => {
   terminate()
   publish({ status: 'error', result: null, error })
 }
 return Object.freeze({
   getState: () => state,
   getSnapshot: () => state,
   subscribe(listener: () => void): () => void {
     listeners.add(listener)
     return () => listeners.delete(listener)
   },
   run(runInput: M4RunInput): void {
     terminate()
     const nextId = input.createRequestId()
     const nextWorker = input.createWorker()
     worker = nextWorker
     requestId = nextId
     publish({ status: 'running', result: null, error: null })
     nextWorker.onmessage = (event) => {
       if (event.data.requestId !== requestId) return
       if (event.data.ok) {
         const result = event.data.result
         publish({ status: 'success', result, error: null })
         if (worker === nextWorker) terminate()
       } else fail(event.data.error)
     }
     nextWorker.onerror = () => fail('M4 simülasyon worker’ı çalıştırılamadı.')
     nextWorker.onmessageerror = () => fail('M4 worker yanıtı okunamadı.')
     nextWorker.postMessage({
       kind: 'run-m4',
       requestId: nextId,
       input: structuredClone(runInput),
     })
   },
   cancel(): void {
     terminate()
     publish({ status: 'cancelled', result: null, error: null })
   },
   reset(): void {
     terminate()
     publish({ status: 'idle', result: null, error: null })
   },
   dispose(): void {
     terminate()
     listeners.clear()
   },
 })
}
