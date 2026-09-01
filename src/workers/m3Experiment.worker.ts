import { CELL_CONFIGS } from '../config/cells'
import { M3_SCHEDULERS } from '../m3Schedulers'
import { runM3ScientificExperiment } from '../simulation/m3Experiment'
import { assertM3ScientificWorkUnitsAllowed } from '../simulation/m3WorkloadGuard'
import type {
 M3ExperimentWorkerRequest,
 M3ExperimentWorkerResponse,
} from './m3ExperimentProtocol'
interface WorkerScope {
 onmessage: ((event: MessageEvent<M3ExperimentWorkerRequest>) => void) | null
 postMessage: (message: M3ExperimentWorkerResponse) => void
}
const scope = self as unknown as WorkerScope
scope.onmessage = (event) => {
 try {
   const request = event.data
   const scenarioCount = 2
   const workUnits = scenarioCount
     * CELL_CONFIGS.length
     * M3_SCHEDULERS.length
     * request.seedCount
     * request.m2Config.slotCount
     * request.baseScenario.ueCount
   assertM3ScientificWorkUnitsAllowed(workUnits)
   const startedAt = performance.now()
   const result = runM3ScientificExperiment(request)
   scope.postMessage({
     ok: true,
     data: {
       result,
       elapsedMilliseconds: performance.now() - startedAt,
     },
   })
 } catch (error) {
   scope.postMessage({
     ok: false,
     error: error instanceof Error
       ? error.message
       : 'Bilinmeyen M3 bilimsel deney hatası.',
   })
 }
}
