import { executeSimulationRequest } from './runRequest'
import type { SimulationWorkerRequest, SimulationWorkerResponse } from './protocol'
interface WorkerScope {
 onmessage: ((event: MessageEvent<SimulationWorkerRequest>) => void) | null
 postMessage: (message: SimulationWorkerResponse) => void
}
const scope = self as unknown as WorkerScope
scope.onmessage = (event) => {
 try {
   scope.postMessage({ ok: true, data: executeSimulationRequest(event.data) })
 } catch (error) {
   scope.postMessage({
     ok: false,
     error: error instanceof Error ? error.message : 'Bilinmeyen simülasyon hatası.',
   })
 }
}
