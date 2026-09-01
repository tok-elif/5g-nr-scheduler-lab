import { CELL_CONFIGS } from '../config/cells'
import { runM1CellMatrixExperiment } from '../simulation/experiments'
import { runM0 } from '../simulation/m0'
import { compareM1Schedulers } from '../simulation/m1'
import simulationConfig from '../config/simulation.json'
import type { SimulationWorkerData, SimulationWorkerRequest } from './protocol'
export function executeSimulationRequest(request: SimulationWorkerRequest): SimulationWorkerData {
 const startedAt = performance.now()
 const workUnits = CELL_CONFIGS.length * request.seedCount * request.m1Config.slotCount * request.scenario.ueCount
 if (!request.cachedCellMatrixResult && workUnits > simulationConfig.experiments.maxWorkUnits) {
   throw new Error(`Deney yükü ${workUnits.toLocaleString('tr-TR')} UE-slot birimi; güvenli sınır ${simulationConfig.experiments.maxWorkUnits.toLocaleString('tr-TR')}. UE, slot veya seed sayısını azaltın.`)
 }
 const m0 = runM0(request.cell, request.scenario)
 const singleSeedResults = compareM1Schedulers(request.cell, m0.ues, request.m1Config)
 const cellMatrixResult = request.cachedCellMatrixResult ?? runM1CellMatrixExperiment(
   CELL_CONFIGS,
   request.scenario,
   request.m1Config,
   request.seedCount,
 )
 const multiSeedResult = {
   seeds: cellMatrixResult.seeds,
   schedulerResults: cellMatrixResult.rows
     .filter((result) => result.cell.id === request.cell.id)
     .map((result) => ({
       scheduler: result.scheduler,
       schedulerLabel: result.schedulerLabel,
       runCount: result.runCount,
       throughputMbps: result.throughputMbps,
       jainFairness: result.jainFairness,
     })),
   pairwiseComparisons: cellMatrixResult.pairwiseRows
     .filter((result) => result.cell.id === request.cell.id)
     .map((result) => ({
       baselineScheduler: result.baselineScheduler,
       baselineSchedulerLabel: result.baselineSchedulerLabel,
       comparatorScheduler: result.comparatorScheduler,
       comparatorSchedulerLabel: result.comparatorSchedulerLabel,
       runCount: result.runCount,
       throughputDifferenceMbps: result.throughputDifferenceMbps,
       jainFairnessDifference: result.jainFairnessDifference,
     })),
 }
 return {
   singleSeedResults,
   multiSeedResult,
   cellMatrixResult,
   elapsedMilliseconds: performance.now() - startedAt,
 }
}
