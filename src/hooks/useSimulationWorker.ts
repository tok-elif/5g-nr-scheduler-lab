import { useEffect, useRef, useState } from 'react'
import type { SimulationWorkerData, SimulationWorkerRequest, SimulationWorkerResponse } from '../workers/protocol'
type WorkerState =
 | { status: 'running'; data?: SimulationWorkerData; error?: undefined }
 | { status: 'ready'; data: SimulationWorkerData; error?: undefined }
 | { status: 'error'; data?: undefined; error: string }
export function useSimulationWorker(request: SimulationWorkerRequest, enabled = true): WorkerState {
 const [state, setState] = useState<WorkerState>({ status: 'running' })
 const matrixCache = useRef<{ key: string; result: SimulationWorkerData['cellMatrixResult'] } | undefined>(undefined)
 const { cell, scenario, m1Config, seedCount } = request
 const matrixKey = JSON.stringify({ scenario, m1Config, seedCount })
 useEffect(() => {
   if (!enabled) return
   const worker = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), {
     type: 'module',
   })
   setState((current) => ({ status: 'running', data: current.data }))
   worker.onmessage = (event: MessageEvent<SimulationWorkerResponse>) => {
     if (event.data.ok) {
       matrixCache.current = { key: matrixKey, result: event.data.data.cellMatrixResult }
       setState({ status: 'ready', data: event.data.data })
     }
     else setState({ status: 'error', error: event.data.error })
   }
   worker.onerror = () => setState({ status: 'error', error: 'Simülasyon worker’ı çalıştırılamadı.' })
   worker.postMessage({
     cell,
     scenario,
     m1Config,
     seedCount,
     ...(matrixCache.current?.key === matrixKey ? { cachedCellMatrixResult: matrixCache.current.result } : {}),
   } satisfies SimulationWorkerRequest)
   return () => worker.terminate()
 }, [cell, enabled, matrixKey, m1Config, scenario, seedCount])
 return state
}
