import type { CellConfig, M1BatchResult, M1CellMatrixResult, M1Config, M1Result, ScenarioConfig } from '../simulation/types'
export interface SimulationWorkerRequest {
 cell: CellConfig
 scenario: ScenarioConfig
 m1Config: M1Config
 seedCount: number
 cachedCellMatrixResult?: M1CellMatrixResult
}
export interface SimulationWorkerData {
 singleSeedResults: M1Result[]
 multiSeedResult: M1BatchResult
 cellMatrixResult: M1CellMatrixResult
 elapsedMilliseconds: number
}
export type SimulationWorkerResponse =
 | { ok: true; data: SimulationWorkerData }
 | { ok: false; error: string }
