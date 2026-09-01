import { useEffect, useState } from 'react'
import type { M3WorkerData, M3WorkerRequest, M3WorkerResponse } from '../workers/m3Protocol'
type M3WorkerState =
 | { status: 'running'; data?: M3WorkerData; error?: undefined }
 | { status: 'ready'; data: M3WorkerData; error?: undefined }
 | { status: 'error'; data?: undefined; error: string }
export function useM3SimulationWorker(request: M3WorkerRequest, enabled = true): M3WorkerState {
 const [state, setState] = useState<M3WorkerState>({ status: 'running' })
 const { baseSeed, cell, config, ues } = request
 const requestKey = JSON.stringify({ baseSeed, cell, config, ues })
 useEffect(() => {
   if (!enabled) return
   const worker = new Worker(new URL('../workers/m3.worker.ts', import.meta.url), { type: 'module' })
   setState((current) => ({ status: 'running', data: current.data }))
   worker.onmessage = (event: MessageEvent<M3WorkerResponse>) => {
     const message = event.data
     if (message.ok) setState({ status: 'ready', data: message.data })
     else setState({ status: 'error', error: message.error })
   }
   worker.onerror = () => setState({ status: 'error', error: 'M3 simülasyon worker’ı çalıştırılamadı.' })
   worker.postMessage({ baseSeed, cell, config, ues } satisfies M3WorkerRequest)
   return () => worker.terminate()
 }, [baseSeed, cell, config, enabled, requestKey, ues])
 return state
}
