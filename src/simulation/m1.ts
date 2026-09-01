import { calculateJainFairness } from '../metrics/fairness'
import { getScheduler, SCHEDULERS } from '../schedulers'
import type { CellConfig, M1Config, M1Result, SchedulerKind, UeResult } from './types'
import simulationConfig from '../config/simulation.json'
import { validateCellConfig, validateM1Config, validateUes } from './validation'
export const DEFAULT_M1_CONFIG = simulationConfig.m1 satisfies M1Config
export function runM1(
 cell: CellConfig,
 ues: UeResult[],
 schedulerKind: SchedulerKind,
 config: M1Config = DEFAULT_M1_CONFIG,
): M1Result {
 validateCellConfig(cell)
 validateUes(ues)
 validateM1Config(config)
 const scheduler = getScheduler(schedulerKind)
 const schedulerSession = scheduler.createSession({ ues, resourceBlocks: cell.resourceBlocks })
 const deliveredMbits = Array(ues.length).fill(0) as number[]
 const selectedSlots = Array(ues.length).fill(0) as number[]
 const slotTrace: number[] = []
 // Equal non-zero initialization avoids undefined PF metrics at the first slot.
 const averageThroughputMbps = Array(ues.length).fill(
   simulationConfig.model.initialAverageThroughputMbps,
 ) as number[]
 const alpha = 1 / config.pfWindowSlots
 const slotDurationSeconds = cell.slotDurationMs / 1_000
 for (let slotIndex = 0; slotIndex < config.slotCount; slotIndex += 1) {
   const allocations = schedulerSession.selectAllocations({ slotIndex, averageThroughputMbps })
   if (!Array.isArray(allocations) || allocations.length !== 1 || allocations[0].resourceBlocks !== cell.resourceBlocks) {
     throw new Error(`${scheduler.label}, M1 için bütün RB'leri tek UE'ye tahsis etmelidir.`)
   }
   const selectedIndex = allocations[0].ueIndex
   if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= ues.length) {
     throw new Error(`${scheduler.label} geçersiz bir UE indeksi döndürdü.`)
   }
   selectedSlots[selectedIndex] += 1
   if (slotTrace.length < (config.traceSlotLimit ?? simulationConfig.model.defaultM1TraceSlotLimit)) {
     slotTrace.push(ues[selectedIndex].id)
   }
   deliveredMbits[selectedIndex] += ues[selectedIndex].achievableRateMbps * slotDurationSeconds
   if (scheduler.tracksAverageThroughput) {
     for (let index = 0; index < ues.length; index += 1) {
       const servedRate = index === selectedIndex ? ues[index].achievableRateMbps : 0
       averageThroughputMbps[index] = (1 - alpha) * averageThroughputMbps[index] + alpha * servedRate
     }
   }
 }
 const simulationDurationSeconds = config.slotCount * slotDurationSeconds
 const throughputValues = deliveredMbits.map((mbits) => mbits / simulationDurationSeconds)
 const totalDeliveredMbits = deliveredMbits.reduce((total, value) => total + value, 0)
 return {
   scheduler: scheduler.kind,
   schedulerLabel: scheduler.label,
   cellThroughputMbps: totalDeliveredMbits / simulationDurationSeconds,
   jainFairness: calculateJainFairness(throughputValues),
   totalDeliveredMbits,
   simulationDurationSeconds,
   slotTrace,
   ueResults: ues.map((ue, index) => ({
     ueId: ue.id,
     sinrDb: ue.sinrDb,
     achievableRateMbps: ue.achievableRateMbps,
     throughputMbps: throughputValues[index],
     selectedSlots: selectedSlots[index],
     airtimePercent: selectedSlots[index] / config.slotCount * 100,
   })),
 }
}
export function compareM1Schedulers(
 cell: CellConfig,
 ues: UeResult[],
 config: M1Config = DEFAULT_M1_CONFIG,
): M1Result[] {
 return SCHEDULERS.map((scheduler) => runM1(cell, ues, scheduler.kind, config))
}
