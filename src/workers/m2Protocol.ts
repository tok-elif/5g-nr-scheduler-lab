import type { M2Config, M2Result } from '../simulation/m2Types'
import type { CellConfig, UeResult } from '../simulation/types'
export interface M2WorkerRequest {
 cell: CellConfig
 ues: UeResult[]
 config: M2Config
 baseSeed: number
}
export interface M2WorkerData {
 results: M2Result[]
 elapsedMilliseconds: number
}
export type M2WorkerResponse =
 | { ok: true; data: M2WorkerData }
 | { ok: false; error: string }
