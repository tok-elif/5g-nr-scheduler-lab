/// <reference lib="webworker" />
import { runM2BatchMatrix } from '../simulation/m2BatchMatrix'
import type {
 M2BatchMatrixRequest,
 M2BatchMatrixResult,
 M2BatchProgress,
} from '../simulation/m2BatchMatrix'
interface MatrixWorkerRequest {
 requestId: number
 request: M2BatchMatrixRequest
}
type MatrixWorkerResponse =
 | { type: 'progress'; requestId: number; progress: M2BatchProgress }
 | { type: 'success'; requestId: number; result: M2BatchMatrixResult }
 | { type: 'error'; requestId: number; message: string }
const workerScope = self as DedicatedWorkerGlobalScope
workerScope.onmessage = (event: MessageEvent<MatrixWorkerRequest>) => {
 const { requestId, request } = event.data
 try {
   const result = runM2BatchMatrix(request, (progress) => {
     const response: MatrixWorkerResponse = { type: 'progress', requestId, progress }
     workerScope.postMessage(response)
   })
   const response: MatrixWorkerResponse = { type: 'success', requestId, result }
   workerScope.postMessage(response)
 } catch (error) {
   const response: MatrixWorkerResponse = {
     type: 'error',
     requestId,
     message: error instanceof Error ? error.message : String(error),
   }
   workerScope.postMessage(response)
 }
}
export {}
