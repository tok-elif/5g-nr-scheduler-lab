import { M3_SCHEDULERS } from '../m3Schedulers'
import { compareM3Schedulers } from '../simulation/m3'
import { assertM3WorkloadAllowed } from '../simulation/m3WorkloadGuard'
import type { M3WorkerRequest, M3WorkerResponse } from './m3Protocol'
interface WorkerScope {
 onmessage: ((event: MessageEvent<M3WorkerRequest>) => void) | null
 postMessage: (message: M3WorkerResponse) => void
}
const scope = self as unknown as WorkerScope
scope.onmessage = (event) => {
 try {
   const { cell, ues, config, baseSeed } = event.data
   assertM3WorkloadAllowed({
     ueCount: ues.length,
     resourceBlockCount: cell.resourceBlocks,
     slotCount: config.slotCount,
     schedulerCount: M3_SCHEDULERS.length,
   })
   const startedAt = performance.now()
   const results = compareM3Schedulers(cell, ues, config, baseSeed)
   scope.postMessage({ ok: true, data: { results, elapsedMilliseconds: performance.now() - startedAt } })
 } catch (error) {
   scope.postMessage({
     ok: false,
     error: error instanceof Error ? error.message : 'Bilinmeyen M3 simülasyon hatası.',
   })
 }
}
