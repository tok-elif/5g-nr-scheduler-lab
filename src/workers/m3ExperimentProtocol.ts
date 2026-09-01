import type {
 M3ExperimentRequest,
 M3ScientificExperimentResult,
} from '../simulation/m3Experiment'
export type M3ExperimentWorkerRequest = M3ExperimentRequest
export interface M3ExperimentWorkerData {
 result: M3ScientificExperimentResult
 elapsedMilliseconds: number
}
export type M3ExperimentWorkerResponse =
 | { ok: true; data: M3ExperimentWorkerData }
 | { ok: false; error: string }
