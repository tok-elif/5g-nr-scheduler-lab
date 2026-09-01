import type { M2Config, M2Result } from '../simulation/m2Types'
import type { CellConfig, UeResult } from '../simulation/types'
export interface M3WorkerRequest {
 cell: CellConfig
 ues: UeResult[]
 config: M2Config
 baseSeed: number
}
export interface M3WorkerData {
 results: M2Result[]
 elapsedMilliseconds: number
}
export type M3WorkerResponse =
 | { ok: true; data: M3WorkerData }
 | { ok: false; error: string }
