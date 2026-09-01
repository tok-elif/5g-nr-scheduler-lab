import m2Config from '../config/m2.json'
import simulationConfig from '../config/simulation.json'
import { getQosProfile } from '../config/qos'
import { calculateJainFairness } from '../metrics/fairness'
import { latencyPercentileEstimates, maximumFinite } from '../metrics/percentiles'
import { getM2Scheduler, M2_SCHEDULERS } from '../m2Schedulers'
import { clamp, createSeededRandom, samplePoisson } from './random'
import type { ResourceAllocation, UeResult, CellConfig } from './types'
import type {
 M2Config,
 M2QosResult,
 M2QueueState,
 M2Result,
 M2RunOptions,
 M2Scheduler,
 M2TrafficClassConfig,
 M2UeResult,
} from './m2Types'
import { validateCellConfig, validateUes } from './validation'
interface Packet {
 arrivalTimeMs: number
 arrivalSlotIndex: number
 packetSizeMbits: number
 remainingMbits: number
}
interface UeRuntime {
 queue: Packet[]
 queuedMbits: number
 generatedPackets: number
 deliveredPackets: number
 deliveredMbits: number
 delaysMs: number[]
 averageThroughputMbps: number
}
const EPSILON = simulationConfig.model.numericalEpsilon
export const M2_LATENCY_SCOPE = 'delivered-packets-arrival-to-completion' as const
export const DEFAULT_M2_CONFIG = m2Config satisfies M2Config
function assertFinite(value: number, label: string): void {
 if (!Number.isFinite(value)) throw new Error(`${label} sonlu bir sayı olmalıdır.`)
}
export function validateM2TrafficClass(traffic: M2TrafficClassConfig): void {
 if (!Number.isInteger(traffic.fiveQi)) throw new Error('M2 trafik sınıfı 5QI değeri tam sayı olmalıdır.')
 const qos = getQosProfile(traffic.fiveQi)
 assertFinite(traffic.arrivalRatePacketsPerSecond, `5QI ${traffic.fiveQi} paket geliş hızı`)
 assertFinite(traffic.packetSizeBytes, `5QI ${traffic.fiveQi} paket boyutu`)
 assertFinite(traffic.gbrMbps, `5QI ${traffic.fiveQi} GBR`)
 if (traffic.arrivalRatePacketsPerSecond < 0 || traffic.packetSizeBytes <= 0 || traffic.gbrMbps < 0) {
   throw new Error(`5QI ${traffic.fiveQi} trafik parametreleri geçersiz.`)
 }
 if (qos.resourceType === 'GBR' && traffic.gbrMbps <= 0) {
   throw new Error(`5QI ${traffic.fiveQi} GBR sınıfı için pozitif GBR hedefi gereklidir.`)
 }
 if (qos.resourceType === 'Non-GBR' && traffic.gbrMbps !== 0) {
   throw new Error(`5QI ${traffic.fiveQi} Non-GBR sınıfında GBR hedefi sıfır olmalıdır.`)
 }
}
function safeRatio(numerator: number, denominator: number, emptyValue = 0): number {
 if (denominator <= 0) return emptyValue
 return clamp(numerator / denominator, 0, 1)
}
function fnv1aUpdate(hash: number, text: string): number {
 let next = hash
 for (let index = 0; index < text.length; index += 1) {
   next ^= text.charCodeAt(index)
   next = Math.imul(next, 0x01000193)
 }
 return next >>> 0
}
function fingerprint(hash: number, prefix: string): string {
 return `${prefix}-${(hash >>> 0).toString(16).padStart(8, '0').toUpperCase()}`
}
export function validateM2Config(config: M2Config): void {
 if (!Number.isInteger(config.slotCount) || config.slotCount < 1 || config.slotCount > 100_000) {
   throw new Error('M2 slot sayısı 1–100000 arasında bir tam sayı olmalıdır.')
 }
 if (!Number.isInteger(config.pfWindowSlots) || config.pfWindowSlots < 1 || config.pfWindowSlots > 10_000) {
   throw new Error('M2 PF pencere uzunluğu 1–10000 arasında bir tam sayı olmalıdır.')
 }
 if (!Number.isInteger(config.trafficSeedOffset)) throw new Error('M2 trafik seed ofseti tam sayı olmalıdır.')
 if (config.traceSlotLimit !== undefined
   && (!Number.isInteger(config.traceSlotLimit) || config.traceSlotLimit < 0 || config.traceSlotLimit > 1_000)) {
   throw new Error('M2 slot trace sınırı 0–1000 arasında bir tam sayı olmalıdır.')
 }
 if (!Array.isArray(config.trafficClasses) || config.trafficClasses.length === 0) {
   throw new Error('M2 için en az bir trafik sınıfı gereklidir.')
 }
 const fiveQis = new Set<number>()
 for (const traffic of config.trafficClasses) {
   if (!Number.isInteger(traffic.fiveQi) || fiveQis.has(traffic.fiveQi)) {
     throw new Error('M2 trafik sınıflarında 5QI değerleri benzersiz tam sayılar olmalıdır.')
   }
   validateM2TrafficClass(traffic)
   fiveQis.add(traffic.fiveQi)
 }
}
function trafficForUe(index: number, trafficClasses: readonly M2TrafficClassConfig[]): M2TrafficClassConfig {
 return trafficClasses[index % trafficClasses.length]
}
function validateTrafficOverride(
 ues: readonly UeResult[],
 options: M2RunOptions,
): readonly M2TrafficClassConfig[] | undefined {
 const override = options.trafficClassByUeIndex
 if (override === undefined) return undefined
 if (!Array.isArray(override) || override.length !== ues.length) {
   throw new Error('M2 per-UE trafik override uzunluğu UE sayısıyla eşleşmelidir.')
 }
 override.forEach(validateM2TrafficClass)
 return override
}
function validateAllocations(
 allocations: readonly ResourceAllocation[],
 queueStates: readonly M2QueueState[],
 resourceBlocks: number,
 schedulerLabel: string,
): void {
 if (!Array.isArray(allocations)) throw new Error(`${schedulerLabel} tahsis listesi döndürmelidir.`)
 let allocatedResourceBlocks = 0
 const allocatedUes = new Set<number>()
 for (const allocation of allocations) {
   if (!Number.isInteger(allocation.ueIndex)
     || allocation.ueIndex < 0
     || allocation.ueIndex >= queueStates.length) {
     throw new Error(`${schedulerLabel} geçersiz UE indeksi döndürdü.`)
   }
   if (!Number.isInteger(allocation.resourceBlocks) || allocation.resourceBlocks <= 0) {
     throw new Error(`${schedulerLabel} pozitif tam sayı RB tahsis etmelidir.`)
   }
   if (allocatedUes.has(allocation.ueIndex)) {
     throw new Error(`${schedulerLabel} aynı UE için yinelenen tahsis döndürdü.`)
   }
   if (queueStates[allocation.ueIndex].queuedMbits <= EPSILON) {
     throw new Error(`${schedulerLabel} boş kuyruğa RB tahsis etti.`)
   }
   allocatedUes.add(allocation.ueIndex)
   allocatedResourceBlocks += allocation.resourceBlocks
 }
 if (allocatedResourceBlocks > resourceBlocks) {
   throw new Error(`${schedulerLabel} hücrede bulunandan fazla RB tahsis etti.`)
 }
}
export function runM2(
 cell: CellConfig,
 ues: readonly UeResult[],
 schedulerKind: string | M2Scheduler,
 config: M2Config = DEFAULT_M2_CONFIG,
 baseSeed = simulationConfig.m0.seed,
 options: M2RunOptions = {},
): M2Result {
 validateCellConfig(cell)
 validateUes(ues)
 validateM2Config(config)
 const trafficOverride = validateTrafficOverride(ues, options)
 const observationSink = options.observationSink
 const selectTraffic = (index: number): M2TrafficClassConfig =>
   trafficOverride?.[index] ?? trafficForUe(index, config.trafficClasses)
 const scheduler = typeof schedulerKind === 'string' ? getM2Scheduler(schedulerKind) : schedulerKind
 const session = scheduler.createSession()
 const effectiveTrafficSeed = baseSeed + config.trafficSeedOffset
 if (!Number.isSafeInteger(effectiveTrafficSeed)) {
   throw new Error('Efektif M2 trafik seed değeri güvenli bir tam sayı olmalıdır.')
 }
 const random = createSeededRandom(effectiveTrafficSeed)
 const slotDurationSeconds = cell.slotDurationMs / 1_000
 const runtimes: UeRuntime[] = ues.map(() => ({
   queue: [],
   queuedMbits: 0,
   generatedPackets: 0,
   deliveredPackets: 0,
   deliveredMbits: 0,
   delaysMs: [],
   averageThroughputMbps: simulationConfig.model.initialAverageThroughputMbps,
 }))
 const alpha = 1 / config.pfWindowSlots
 const slotTrace: M2Result['slotTrace'] = []
 let trafficHash = 0x811c9dc5
 for (let slotIndex = 0; slotIndex < config.slotCount; slotIndex += 1) {
   const slotStartMs = slotIndex * cell.slotDurationMs
   for (let index = 0; index < ues.length; index += 1) {
     const traffic = selectTraffic(index)
     const arrivals = samplePoisson(random, traffic.arrivalRatePacketsPerSecond * slotDurationSeconds)
     trafficHash = fnv1aUpdate(trafficHash, `${slotIndex}:${index}:${arrivals}|`)
     const packetMbits = traffic.packetSizeBytes * 8 / 1_000_000
     for (let packetIndex = 0; packetIndex < arrivals; packetIndex += 1) {
       runtimes[index].queue.push({
         arrivalTimeMs: slotStartMs,
         arrivalSlotIndex: slotIndex,
         packetSizeMbits: packetMbits,
         remainingMbits: packetMbits,
       })
       observationSink?.observe(Object.freeze({
         kind: 'packet-arrival',
         slotIndex,
         ueIndex: index,
         fiveQi: traffic.fiveQi,
         packetSizeMbits: packetMbits,
       }))
     }
     runtimes[index].generatedPackets += arrivals
     runtimes[index].queuedMbits += arrivals * packetMbits
   }
   const queueStates: M2QueueState[] = ues.map((ue, index) => {
     const traffic = selectTraffic(index)
     const firstPacket = runtimes[index].queue[0]
     return {
       ueIndex: index,
       ue,
       qos: getQosProfile(traffic.fiveQi),
       traffic,
       queuedMbits: runtimes[index].queuedMbits,
       headOfLineDelayMs: firstPacket ? slotStartMs - firstPacket.arrivalTimeMs : 0,
       averageThroughputMbps: runtimes[index].averageThroughputMbps,
     }
   })
   const allocations = session.selectAllocations({
     slotIndex,
     slotDurationSeconds,
     resourceBlocks: cell.resourceBlocks,
     queues: queueStates,
   })
   validateAllocations(allocations, queueStates, cell.resourceBlocks, scheduler.label)
   if (slotTrace.length < (config.traceSlotLimit ?? simulationConfig.model.defaultM2TraceSlotLimit)) {
     slotTrace.push({ slotIndex, allocations: allocations.map((allocation) => ({ ...allocation })) })
   }
   const servedMbits = Array(ues.length).fill(0) as number[]
   for (const allocation of allocations) {
     const index = allocation.ueIndex
     let capacityMbits = ues[index].achievableRateMbps
       * (allocation.resourceBlocks / cell.resourceBlocks)
       * slotDurationSeconds
     while (capacityMbits > EPSILON && runtimes[index].queue.length > 0) {
       const packet = runtimes[index].queue[0]
       const served = Math.min(capacityMbits, packet.remainingMbits)
       packet.remainingMbits -= served
       capacityMbits -= served
       servedMbits[index] += served
       runtimes[index].queuedMbits = Math.max(0, runtimes[index].queuedMbits - served)
       if (packet.remainingMbits <= EPSILON) {
         runtimes[index].queue.shift()
         runtimes[index].deliveredPackets += 1
         const delayMs = slotStartMs + cell.slotDurationMs - packet.arrivalTimeMs
         runtimes[index].delaysMs.push(delayMs)
         observationSink?.observe(Object.freeze({
           kind: 'packet-delivery',
           slotIndex,
           ueIndex: index,
           fiveQi: queueStates[index].traffic.fiveQi,
           packetSizeMbits: packet.packetSizeMbits,
           delaySlots: slotIndex - packet.arrivalSlotIndex + 1,
           delayMs,
         }))
       }
     }
     runtimes[index].deliveredMbits += servedMbits[index]
   }
   for (let index = 0; index < ues.length; index += 1) {
     const servedRateMbps = servedMbits[index] / slotDurationSeconds
     runtimes[index].averageThroughputMbps = (1 - alpha) * runtimes[index].averageThroughputMbps
       + alpha * servedRateMbps
     const firstPacket = runtimes[index].queue[0]
     observationSink?.observe(Object.freeze({
       kind: 'ue-slot-end',
       slotIndex,
       ueIndex: index,
       fiveQi: queueStates[index].traffic.fiveQi,
       queuedMbits: runtimes[index].queuedMbits,
       headOfLineDelayMs: firstPacket
         ? slotStartMs + cell.slotDurationMs - firstPacket.arrivalTimeMs
         : 0,
     }))
   }
 }
 const simulationDurationSeconds = config.slotCount * slotDurationSeconds
 const simulationEndMs = config.slotCount * cell.slotDurationMs
 const capacityReferenceMbps = maximumFinite(ues.map((ue) => ue.achievableRateMbps))
 const offeredLoadMbps = ues.reduce((sum, _, index) => {
   const traffic = selectTraffic(index)
   return sum + traffic.arrivalRatePacketsPerSecond * traffic.packetSizeBytes * 8 / 1_000_000
 }, 0)
 const ueSinrHash = ues.reduce(
   (hash, ue) => fnv1aUpdate(hash, `${ue.id}:${ue.sinrDb.toFixed(9)}:${ue.achievableRateMbps.toFixed(9)}|`),
   0x811c9dc5,
 )
 const ueResults: M2UeResult[] = ues.map((ue, index) => {
   const traffic = selectTraffic(index)
   const qos = getQosProfile(traffic.fiveQi)
   const runtime = runtimes[index]
   const throughputMbps = runtime.deliveredMbits / simulationDurationSeconds
   const offeredLoadMbps = traffic.arrivalRatePacketsPerSecond * traffic.packetSizeBytes * 8 / 1_000_000
   const gbrTargetMbps = qos.resourceType === 'GBR'
     ? Math.min(traffic.gbrMbps, offeredLoadMbps)
     : null
   const gbrFulfillmentRatio = gbrTargetMbps !== null && gbrTargetMbps > EPSILON
     ? safeRatio(throughputMbps, gbrTargetMbps)
     : null
   const queuedAgesMs = runtime.queue.map((packet) => simulationEndMs - packet.arrivalTimeMs)
   const latencyEstimates = latencyPercentileEstimates(runtime.delaysMs)
   const pdbViolationPackets = runtime.delaysMs.filter(
     (delayMs) => delayMs > qos.packetDelayBudgetMs + EPSILON,
   ).length
   const overdueQueuedPackets = queuedAgesMs.filter(
     (ageMs) => ageMs > qos.packetDelayBudgetMs + EPSILON,
   ).length
   return {
     ueId: ue.id,
     fiveQi: qos.fiveQi,
     qosLabel: qos.label,
     resourceType: qos.resourceType,
     packetDelayBudgetMs: qos.packetDelayBudgetMs,
     priorityLevel: qos.priorityLevel,
     achievableRateMbps: ue.achievableRateMbps,
     offeredLoadMbps,
     gbrMbps: traffic.gbrMbps,
     gbrTargetMbps,
     throughputMbps,
     gbrSatisfied: gbrTargetMbps !== null ? throughputMbps + EPSILON >= gbrTargetMbps : null,
     gbrFulfillmentRatio,
     generatedPackets: runtime.generatedPackets,
     deliveredPackets: runtime.deliveredPackets,
     queuedPackets: runtime.queue.length,
     queuedMbits: runtime.queuedMbits,
     queuedBytes: runtime.queuedMbits * 1_000_000 / 8,
     undeliveredRatio: safeRatio(runtime.queue.length, runtime.generatedPackets),
     latencySamplePackets: runtime.delaysMs.length,
     pdbViolationPackets,
     pdbViolationRatio: safeRatio(pdbViolationPackets, runtime.deliveredPackets),
     overdueQueuedPackets,
     oldestQueuedPacketAgeMs: maximumFinite(queuedAgesMs),
     delayP50Ms: latencyEstimates.p50.value,
     delayP95Ms: latencyEstimates.p95.value,
     delayP99Ms: latencyEstimates.p99.value,
     delayP50Estimate: latencyEstimates.p50,
     delayP95Estimate: latencyEstimates.p95,
     delayP99Estimate: latencyEstimates.p99,
   }
 })
 const qosResults: M2QosResult[] = [...new Set(ueResults.map((result) => result.fiveQi))].map((fiveQi) => {
   const members = ueResults.filter((result) => result.fiveQi === fiveQi)
   const memberIndices = ueResults.flatMap((result, index) => result.fiveQi === fiveQi ? [index] : [])
   const delays = memberIndices.flatMap((index) => runtimes[index].delaysMs)
   const gbrMembers = members.filter((member) => member.resourceType === 'GBR')
   const latencyEstimates = latencyPercentileEstimates(delays)
   const gbrUeMeetingRatio = gbrMembers.length > 0
     ? safeRatio(gbrMembers.filter((member) => member.gbrSatisfied).length, gbrMembers.length)
     : null
   const gbrMeanFulfillmentRatio = gbrMembers.length > 0
     ? gbrMembers.reduce((sum, member) => sum + (member.gbrFulfillmentRatio ?? 0), 0) / gbrMembers.length
     : null
   const totalGbrTargetMbps = gbrMembers.reduce((sum, member) => sum + (member.gbrTargetMbps ?? 0), 0)
   const aggregateGbrServiceRatio = gbrMembers.length > 0 && totalGbrTargetMbps > EPSILON
     ? safeRatio(
       gbrMembers.reduce(
         (sum, member) => sum + Math.min(member.throughputMbps, member.gbrTargetMbps ?? 0),
         0,
       ),
       totalGbrTargetMbps,
     )
     : null
   const generatedPackets = members.reduce((sum, member) => sum + member.generatedPackets, 0)
   const deliveredPackets = members.reduce((sum, member) => sum + member.deliveredPackets, 0)
   const queuedPackets = members.reduce((sum, member) => sum + member.queuedPackets, 0)
   const pdbViolationPackets = members.reduce((sum, member) => sum + member.pdbViolationPackets, 0)
   return {
     fiveQi,
     qosLabel: members[0].qosLabel,
     resourceType: members[0].resourceType,
     packetDelayBudgetMs: members[0].packetDelayBudgetMs,
     ueCount: members.length,
     gbrUeCount: gbrMembers.length,
     gbrUeMeetingRatio,
     gbrMeanFulfillmentRatio,
     aggregateGbrServiceRatio,
     gbrMeetingRatio: gbrUeMeetingRatio,
     generatedPackets,
     deliveredPackets,
     queuedPackets,
     queuedBytes: members.reduce((sum, member) => sum + member.queuedBytes, 0),
     undeliveredRatio: safeRatio(queuedPackets, generatedPackets),
     latencySamplePackets: delays.length,
     pdbViolationPackets,
     pdbViolationRatio: safeRatio(pdbViolationPackets, deliveredPackets),
     overdueQueuedPackets: members.reduce((sum, member) => sum + member.overdueQueuedPackets, 0),
     oldestQueuedPacketAgeMs: maximumFinite(members.map((member) => member.oldestQueuedPacketAgeMs)),
     delayP50Ms: latencyEstimates.p50.value,
     delayP95Ms: latencyEstimates.p95.value,
     delayP99Ms: latencyEstimates.p99.value,
     delayP50Estimate: latencyEstimates.p50,
     delayP95Estimate: latencyEstimates.p95,
     delayP99Estimate: latencyEstimates.p99,
   }
 })
 const throughputValues = ueResults.map((result) => result.throughputMbps)
 const generatedPackets = ueResults.reduce((sum, result) => sum + result.generatedPackets, 0)
 const deliveredPackets = ueResults.reduce((sum, result) => sum + result.deliveredPackets, 0)
 const queuedPackets = ueResults.reduce((sum, result) => sum + result.queuedPackets, 0)
 const pdbViolationPackets = ueResults.reduce((sum, result) => sum + result.pdbViolationPackets, 0)
 const gbrUsers = ueResults.filter((result) => result.resourceType === 'GBR')
 const gbrUeMeetingRatio = gbrUsers.length > 0
   ? safeRatio(gbrUsers.filter((result) => result.gbrSatisfied).length, gbrUsers.length)
   : null
 const gbrMeanFulfillmentRatio = gbrUsers.length > 0
   ? gbrUsers.reduce((sum, result) => sum + (result.gbrFulfillmentRatio ?? 0), 0) / gbrUsers.length
   : null
 const totalGbrTargetMbps = gbrUsers.reduce((sum, result) => sum + (result.gbrTargetMbps ?? 0), 0)
 const aggregateGbrServiceRatio = gbrUsers.length > 0 && totalGbrTargetMbps > EPSILON
   ? safeRatio(
     gbrUsers.reduce(
       (sum, result) => sum + Math.min(result.throughputMbps, result.gbrTargetMbps ?? 0),
       0,
     ),
     totalGbrTargetMbps,
   )
   : null
 return {
   scheduler: scheduler.kind,
   schedulerLabel: scheduler.label,
   cell,
   config,
   baseSeed,
   trafficSeedOffset: config.trafficSeedOffset,
   effectiveTrafficSeed,
   trafficFingerprint: fingerprint(trafficHash, 'TRAFFIC'),
   ueSinrFingerprint: fingerprint(ueSinrHash, 'UE-SINR'),
   capacityReferenceMbps,
   offeredLoadMbps,
   normalizedOfferedLoad: capacityReferenceMbps > 0 ? offeredLoadMbps / capacityReferenceMbps : 0,
   latencyScope: M2_LATENCY_SCOPE,
   latencySamplePackets: ueResults.reduce((sum, result) => sum + result.latencySamplePackets, 0),
   simulationDurationSeconds,
   cellThroughputMbps: throughputValues.reduce((sum, value) => sum + value, 0),
   jainFairness: calculateJainFairness(throughputValues),
   gbrUeMeetingRatio,
   gbrMeanFulfillmentRatio,
   aggregateGbrServiceRatio,
   generatedPackets,
   deliveredPackets,
   queuedPackets,
   queuedBytes: ueResults.reduce((sum, result) => sum + result.queuedBytes, 0),
   undeliveredRatio: safeRatio(queuedPackets, generatedPackets),
   pdbViolationPackets,
   pdbViolationRatio: safeRatio(pdbViolationPackets, deliveredPackets),
   overdueQueuedPackets: ueResults.reduce((sum, result) => sum + result.overdueQueuedPackets, 0),
   oldestQueuedPacketAgeMs: maximumFinite(ueResults.map((result) => result.oldestQueuedPacketAgeMs)),
   slotTrace,
   ueResults,
   qosResults,
 }
}
export function compareM2Schedulers(
 cell: CellConfig,
 ues: readonly UeResult[],
 config: M2Config = DEFAULT_M2_CONFIG,
 baseSeed = simulationConfig.m0.seed,
): M2Result[] {
 return M2_SCHEDULERS.map((scheduler) => runM2(cell, ues, scheduler.kind, config, baseSeed)) }
