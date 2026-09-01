import simulationConfig from '../config/simulation.json'
import { getQosProfile } from '../config/qos'
import { calculateJainFairness } from '../metrics/fairness'
import type { M2Observation, M2ObservationSink } from './m2Observation'
import type { M2Result } from './m2Types'
import {
 M4_SLICE_IDS,
 type M4CellResourceTotals,
 type M4MetricsResult,
 type M4SlicePerformanceMetrics,
 type M4SliceResourceTotals,
 type M4UeTrafficAssignment,
 type UeSliceMapping,
} from './m4Types'
interface Bucket {
 arrived: number
 delivered: number
 realizedMbits: number
 deliveredMbits: number
 delaySumMs: number
 violations: number
 delays: Map<number, number>
}
const bucket = (): Bucket => ({
 arrived: 0, delivered: 0, realizedMbits: 0, deliveredMbits: 0,
 delaySumMs: 0, violations: 0, delays: new Map(),
})
const safeCount = (value: number, increment: number, label: string): number => {
 const result = value + increment
 if (!Number.isSafeInteger(result)) throw new Error(`${label} güvenli tam sayı sınırını aşıyor.`)
 return result
}
function percentile(histogram: Map<number, number>, count: number, p: number): number | null {
 if (count === 0) return null
 const sorted = [...histogram.entries()].sort((a, b) => a[0] - b[0])
 const at = (index: number): number => {
   let cumulative = 0
   for (const [value, frequency] of sorted) {
     cumulative += frequency
     if (index < cumulative) return value
   }
   throw new Error('Delay histogram count tutarsız.')
 }
 const position = (count - 1) * p
 const lower = Math.floor(position)
 const upper = Math.ceil(position)
 const left = at(lower)
 const right = at(upper)
 return left + (right - left) * (position - lower)
}
export function createM4MetricsAccumulator(input: {
 readonly mapping: UeSliceMapping
 readonly trafficAssignment: readonly M4UeTrafficAssignment[]
 readonly slotDurationSeconds: number
 readonly slotCount: number
}): {
 readonly observationSink: M2ObservationSink
 finalize(finalInput: {
   readonly m2Result: M2Result
   readonly sliceResourceTotals: readonly M4SliceResourceTotals[]
   readonly cellResourceTotals: M4CellResourceTotals
 }): M4MetricsResult
} {
 if (!Number.isFinite(input.slotDurationSeconds) || input.slotDurationSeconds <= 0) throw new Error('Slot süresigeçersiz.')
 if (!Number.isSafeInteger(input.slotCount) || input.slotCount <= 0) throw new Error('Slot sayısı geçersiz.')
 const byUe = input.trafficAssignment.map(() => bucket())
 const assignmentByUe = new Map(input.trafficAssignment.map((item) => [item.ueIndex, item]))
 let finalized: M4MetricsResult | undefined
 const observationSink: M2ObservationSink = {
   observe(observation: M2Observation): void {
     if (finalized) throw new Error('M4 metrics finalize sonrasında observation kabul edilemez.')
     if (!Number.isSafeInteger(observation.slotIndex)
       || observation.slotIndex < 0 || observation.slotIndex >= input.slotCount) throw new Error('Observation slot indexgeçersiz.')
     if (!Number.isSafeInteger(observation.ueIndex) || !assignmentByUe.has(observation.ueIndex)) {
       throw new Error('Mapping dışı observation UE index.')
     }
     const assignment = assignmentByUe.get(observation.ueIndex)!
     if (assignment.fiveQi !== observation.fiveQi) throw new Error('Observation 5QI trafik atamasıyla uyuşmuyor.')
     const state = byUe[observation.ueIndex]
     if (observation.kind === 'ue-slot-end') {
       if (!Number.isFinite(observation.queuedMbits) || observation.queuedMbits < 0
         || !Number.isFinite(observation.headOfLineDelayMs) || observation.headOfLineDelayMs < 0) {
         throw new Error('UE slot observation değerleri geçersiz.')
       }
       return
     }
     if (!Number.isFinite(observation.packetSizeMbits) || observation.packetSizeMbits <= 0) {
       throw new Error('Observation packet size pozitif ve sonlu olmalıdır.')
     }
     if (observation.kind === 'packet-arrival') {
       state.arrived = safeCount(state.arrived, 1, 'Arrival count')
       state.realizedMbits += observation.packetSizeMbits
       if (!Number.isFinite(state.realizedMbits)) throw new Error('Realized offered Mbits sonlu kalmalıdır.')
       return
     }
     if (!Number.isSafeInteger(observation.delaySlots) || observation.delaySlots < 0
       || !Number.isFinite(observation.delayMs) || observation.delayMs < 0) throw new Error('Delivery delay geçersiz.')
     state.delivered = safeCount(state.delivered, 1, 'Delivery count')
     state.deliveredMbits += observation.packetSizeMbits
     state.delaySumMs += observation.delayMs
     if (!Number.isFinite(state.deliveredMbits) || !Number.isFinite(state.delaySumMs)) throw new Error('Delivery totalssonlu kalmalıdır.')
     state.delays.set(observation.delayMs, safeCount(state.delays.get(observation.delayMs) ?? 0, 1, 'Delayhistogram'))
     if (observation.delayMs > getQosProfile(observation.fiveQi).packetDelayBudgetMs) {
       state.violations = safeCount(state.violations, 1, 'Violation count')
     }
   },
 }
 return Object.freeze({
   observationSink,
   finalize(finalInput): M4MetricsResult {
     if (finalized) return finalized
     const duration = input.slotCount * input.slotDurationSeconds
     const slices: M4SlicePerformanceMetrics[] = M4_SLICE_IDS.map((sliceId, sliceIndex) => {
       const indices = input.mapping.ueIndicesBySlice[sliceId]
       const states = indices.map((index) => byUe[index])
       const assignments = indices.map((index) => input.trafficAssignment[index])
       const ueResults = indices.map((index) => finalInput.m2Result.ueResults[index])
       const arrived = states.reduce((sum, item) => sum + item.arrived, 0)
       const delivered = states.reduce((sum, item) => sum + item.delivered, 0)
       const realized = states.reduce((sum, item) => sum + item.realizedMbits, 0)
       const deliveredMbits = states.reduce((sum, item) => sum + item.deliveredMbits, 0)
       const delaySum = states.reduce((sum, item) => sum + item.delaySumMs, 0)
       const violations = states.reduce((sum, item) => sum + item.violations, 0)
       const histogram = new Map<number, number>()
       states.forEach((state) => state.delays.forEach((count, delay) =>
         histogram.set(delay, (histogram.get(delay) ?? 0) + count)))
       const gbr = assignments.flatMap((assignment, index) =>
         assignment.trafficClass.gbrMbps > 0 ? [{ assignment, result: ueResults[index] }] : [])
       const resource = finalInput.sliceResourceTotals[sliceIndex]
       const configured = assignments.reduce((sum, item) => sum
         + item.trafficClass.arrivalRatePacketsPerSecond * item.trafficClass.packetSizeBytes * 8 / 1_000_000, 0)
       return Object.freeze({
         sliceId, ueCount: indices.length, configuredOfferedLoadMbps: configured,
         realizedOfferedMbits: realized, deliveredMbits,
         aggregateThroughputMbps: deliveredMbits / duration,
         finalQueuedMbits: ueResults.reduce((sum, ue) => sum + ue.queuedMbits, 0),
         arrivedPacketCount: arrived, deliveredPacketCount: delivered,
         packetDeliveryRatio: arrived > 0 ? delivered / arrived : null,
         meanPacketDelayMs: delivered > 0 ? delaySum / delivered : null,
         p50PacketDelayMs: percentile(histogram, delivered, 0.5),
         p95PacketDelayMs: percentile(histogram, delivered, 0.95),
         p99PacketDelayMs: percentile(histogram, delivered, 0.99),
         delayViolationPacketCount: violations,
         delayViolationRatio: delivered > 0 ? violations / delivered : null,
         gbrUeCount: gbr.length,
         gbrMetUeCount: gbr.filter(({ assignment, result }) =>
           result.throughputMbps + simulationConfig.model.numericalEpsilon >= assignment.trafficClass.gbrMbps).length,
         gbrMeetingRatio: gbr.length > 0 ? gbr.filter(({ assignment, result }) =>
           result.throughputMbps + simulationConfig.model.numericalEpsilon >= assignment.trafficClass.gbrMbps).length / gbr.length : null,
         jainFairness: indices.length > 0 ? calculateJainFairness(ueResults.map((ue) => ue.throughputMbps)) : null,
         allocatedResourceBlocks: resource.allocatedResourceBlocks,
         schedulerUsedResourceBlocks: resource.schedulerUsedResourceBlocks,
         schedulerUnusedResourceBlocks: resource.schedulerUnusedResourceBlocks,
         resourceAllocationShare: finalInput.cellResourceTotals.totalAvailableResourceBlocks > 0
           ? resource.allocatedResourceBlocks / finalInput.cellResourceTotals.totalAvailableResourceBlocks : null,
         schedulerUtilizationRatio: resource.allocatedResourceBlocks > 0
           ? resource.schedulerUsedResourceBlocks / resource.allocatedResourceBlocks : null,
       })
     })
     const allStates = byUe
     const count = allStates.reduce((sum, state) => sum + state.delivered, 0)
     const allHistogram = new Map<number, number>()
     allStates.forEach((state) => state.delays.forEach((frequency, delay) =>
       allHistogram.set(delay, (allHistogram.get(delay) ?? 0) + frequency)))
     const arrived = slices.reduce((sum, slice) => sum + slice.arrivedPacketCount, 0)
     const gbrCount = slices.reduce((sum, slice) => sum + slice.gbrUeCount, 0)
     const gbrMet = slices.reduce((sum, slice) => sum + slice.gbrMetUeCount, 0)
     const resource = finalInput.cellResourceTotals
     const cell = Object.freeze({
       ueCount: input.mapping.entries.length,
       configuredOfferedLoadMbps: slices.reduce((sum, slice) => sum + slice.configuredOfferedLoadMbps, 0),
       realizedOfferedMbits: slices.reduce((sum, slice) => sum + slice.realizedOfferedMbits, 0),
       deliveredMbits: slices.reduce((sum, slice) => sum + slice.deliveredMbits, 0),
       aggregateThroughputMbps: slices.reduce((sum, slice) => sum + slice.deliveredMbits, 0) / duration,
       finalQueuedMbits: slices.reduce((sum, slice) => sum + slice.finalQueuedMbits, 0),
       arrivedPacketCount: arrived, deliveredPacketCount: count,
       packetDeliveryRatio: arrived > 0 ? count / arrived : null,
       meanPacketDelayMs: count > 0 ? allStates.reduce((sum, state) => sum + state.delaySumMs, 0) / count : null,
       p50PacketDelayMs: percentile(allHistogram, count, 0.5),
       p95PacketDelayMs: percentile(allHistogram, count, 0.95),
       p99PacketDelayMs: percentile(allHistogram, count, 0.99),
       delayViolationPacketCount: slices.reduce((sum, slice) => sum + slice.delayViolationPacketCount, 0),
       delayViolationRatio: count > 0 ? slices.reduce((sum, slice) => sum + slice.delayViolationPacketCount, 0) / count : null,
       gbrUeCount: gbrCount, gbrMetUeCount: gbrMet,
       gbrMeetingRatio: gbrCount > 0 ? gbrMet / gbrCount : null,
       jainFairness: input.mapping.entries.length > 0
         ? calculateJainFairness(finalInput.m2Result.ueResults.map((ue) => ue.throughputMbps)) : null,
       allocatedResourceBlocks: resource.totalAllocatedResourceBlocks,
       schedulerUsedResourceBlocks: resource.totalSchedulerUsedResourceBlocks,
       schedulerUnusedResourceBlocks: resource.totalSchedulerUnusedResourceBlocks,
       schedulerUtilizationRatio: resource.totalAllocatedResourceBlocks > 0
         ? resource.totalSchedulerUsedResourceBlocks / resource.totalAllocatedResourceBlocks : null,
     })
     finalized = Object.freeze({ slices: Object.freeze(slices), cell })
     return finalized
   },
 })
}
