import { adaptLink, calculateFullBandRateMbps } from './linkAdaptation'
import { clamp, createSeededRandom, sampleNormal } from './random'
import type { CellConfig, M0Result, ScenarioConfig, UeResult } from './types'
import simulationConfig from '../config/simulation.json'
import { validateCellConfig, validateScenarioConfig } from './validation'
export const DEFAULT_SCENARIO = simulationConfig.m0 satisfies ScenarioConfig
export function runM0(cell: CellConfig, scenario: ScenarioConfig): M0Result {
 validateCellConfig(cell)
 validateScenarioConfig(scenario)
 const random = createSeededRandom(scenario.seed)
 const ues: UeResult[] = Array.from({ length: scenario.ueCount }, (_, index) => {
   const rawSinr = sampleNormal(random, scenario.meanSinrDb, scenario.stdDevSinrDb)
   const sinrDb = clamp(rawSinr, scenario.minSinrDb, scenario.maxSinrDb)
   const link = adaptLink(sinrDb)
   return {
     id: index + 1,
     sinrDb,
     ...link,
     achievableRateMbps: calculateFullBandRateMbps(
       cell,
       link.spectralEfficiency,
       scenario.layers,
       scenario.overheadFraction,
     ),
   }
 })
 const totalRate = ues.reduce((sum, ue) => sum + ue.achievableRateMbps, 0)
 const totalSinr = ues.reduce((sum, ue) => sum + ue.sinrDb, 0)
 const sampledFullBandUpperBoundMbps = Math.max(...ues.map((ue) => ue.achievableRateMbps))
 return {
   cell,
   scenario,
   ues,
   theoreticalCellCapacityMbps: sampledFullBandUpperBoundMbps,
   sampledFullBandUpperBoundMbps,
   capacityDefinition: 'sampled-best-ue-full-band-rate',
   averageUeRateMbps: totalRate / ues.length,
   averageSinrDb: totalSinr / ues.length,
 }
}
