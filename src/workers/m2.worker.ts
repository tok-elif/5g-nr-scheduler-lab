import { compareM2Schedulers } from '../simulation/m2'
import { assertM2WorkloadAllowed } from '../simulation/m2WorkloadGuard'
import type { M2WorkerRequest, M2WorkerResponse } from './m2Protocol'
interface WorkerScope {
 onmessage: ((event: MessageEvent<M2WorkerRequest>) => void) | null
 postMessage: (message: M2WorkerResponse) => void
}
const scope = self as unknown as WorkerScope
scope.onmessage = (event) => {
 try {
   const { cell, ues, config, baseSeed } = event.data
   assertM2WorkloadAllowed({
     ueCount: ues.length,
     resourceBlockCount: cell.resourceBlocks,
     slotCount: config.slotCount,
   })
   const startedAt = performance.now()
   const results = compareM2Schedulers(cell, ues, config, baseSeed)
   scope.postMessage({ ok: true, data: { results, elapsedMilliseconds: performance.now() - startedAt } })
 } catch (error) {
   scope.postMessage({
     ok: false,
     error: error instanceof Error ? error.message : 'Bilinmeyen M2 simülasyon hatası.',
   })
 }
}
