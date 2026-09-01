import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type {
 M3ExperimentWorkerData,
 M3ExperimentWorkerRequest,
 M3ExperimentWorkerResponse,
} from '../workers/m3ExperimentProtocol'
import {
 createRequestWorkerLifecycle,
 type RequestWorkerLike,
} from './requestWorkerLifecycle'
/**
* Bilimsel M3 deney worker'ı. Ortak, test edilebilir `requestWorkerLifecycle`
* üzerinden sürülür (F-TEST-01): instance tabanlı stale-yanıt guard, başarıda
* sonucu koruyan terminate, string'e indirgenmiş hata ve unmount temizliği.
*/
export function useM3ExperimentWorker() {
 const controller = useRef<ReturnType<
   typeof createRequestWorkerLifecycle<
     M3ExperimentWorkerRequest,
     M3ExperimentWorkerResponse,
     M3ExperimentWorkerData
   >
 > | null>(null)
 if (!controller.current) {
   controller.current = createRequestWorkerLifecycle<
     M3ExperimentWorkerRequest,
     M3ExperimentWorkerResponse,
     M3ExperimentWorkerData
   >({
     createWorker: () => new Worker(
       new URL('../workers/m3Experiment.worker.ts', import.meta.url),
       { type: 'module' },
     ) as RequestWorkerLike<M3ExperimentWorkerRequest, M3ExperimentWorkerResponse>,
     readResponse: (response) => response.ok
       ? { ok: true, data: response.data }
       : { ok: false, error: response.error },
     errorMessage: 'M3 bilimsel deney worker’ı çalıştırılamadı.',
   })
 }
 const lifecycle = controller.current
 const state = useSyncExternalStore(lifecycle.subscribe, lifecycle.getSnapshot, lifecycle.getSnapshot)
 useEffect(() => () => lifecycle.dispose(), [lifecycle])
 const run = useCallback((request: M3ExperimentWorkerRequest) => lifecycle.run(request), [lifecycle])
 const cancel = useCallback(() => lifecycle.cancel(), [lifecycle])
 return {
   status: state.status,
   data: state.data ?? undefined,
   error: state.error ?? undefined,
   run,
   cancel,
 }
}
