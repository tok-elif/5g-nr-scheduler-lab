import simulationConfig from '../config/simulation.json'
import { M3_SCHEDULERS } from '../m3Schedulers'
import { DEFAULT_M2_CONFIG, runM2 } from './m2'
import type { M2Config, M2Result } from './m2Types'
import type { CellConfig, UeResult } from './types'
export const DEFAULT_M3_CONFIG: M2Config = DEFAULT_M2_CONFIG
export function compareM3Schedulers(
 cell: CellConfig,
 ues: readonly UeResult[],
 config: M2Config = DEFAULT_M3_CONFIG,
 baseSeed = simulationConfig.m0.seed,
): M2Result[] {
 return M3_SCHEDULERS.map((scheduler) => runM2(cell, ues, scheduler, config, baseSeed))
}
