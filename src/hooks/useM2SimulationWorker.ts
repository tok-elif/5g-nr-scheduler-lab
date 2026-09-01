import { useEffect, useState } from 'react'
import type { M2WorkerData, M2WorkerRequest, M2WorkerResponse } from '../workers/m2Protocol'
type M2WorkerState =
 | { status: 'running'; data?: M2WorkerData; error?: undefined }
 | { status: 'ready'; data: M2WorkerData; error?: undefined }
 | { status: 'error'; data?: undefined; error: string }
export function useM2SimulationWorker(request: M2WorkerRequest, enabled = true): M2WorkerState {
 const [state, setState] = useState<M2WorkerState>({ status: 'running' })
 const { baseSeed, cell, config, ues } = request
 const requestKey = JSON.stringify({ baseSeed, cell, config, ues })
 useEffect(() => {
   if (!enabled) return
   const worker = new Worker(new URL('../workers/m2.worker.ts', import.meta.url), { type: 'module' })
   setState((current) => ({ status: 'running', data: current.data }))
   worker.onmessage = (event: MessageEvent<M2WorkerResponse>) => {
     if (event.data.ok) setState({ status: 'ready', data: event.data.data })
     else setState({ status: 'error', error: event.data.error })
   }
   worker.onerror = () => setState({ status: 'error', error: 'M2 simülasyon worker’ı çalıştırılamadı.' })
   worker.postMessage({ baseSeed, cell, config, ues } satisfies M2WorkerRequest)
   return () => worker.terminate()
 }, [baseSeed, cell, config, enabled, requestKey, ues])
 return state
}
