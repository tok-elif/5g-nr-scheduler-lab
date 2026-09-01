import { handleM4WorkerRequest } from './m4WorkerHandler'
interface WorkerScope {
 onmessage: ((event: MessageEvent<unknown>) => void) | null
 postMessage(message: ReturnType<typeof handleM4WorkerRequest>): void
}
const scope = self as unknown as WorkerScope
scope.onmessage = (event) => {
 scope.postMessage(handleM4WorkerRequest(event.data))
}
