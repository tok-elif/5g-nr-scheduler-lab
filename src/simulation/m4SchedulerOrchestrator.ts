import { allocateInterSliceResourceBlocks } from './interSliceAllocator'
import { calculateM4Demand } from './m4Demand'
import { resolveM4Scheduler } from './m4SchedulerResolver'
import type {
 M2QueueState,
 M2Scheduler,
 M2SchedulerSession,
 M2SchedulerSlotContext,
} from './m2Types'
import {
 M4_SLICE_IDS,
 type M4CellResourceTotals,
 type M4ResourceAccumulatorSnapshot,
 type M4RuntimeConfig,
 type M4SliceResourceTotals,
 type M4SliceSlotTelemetry,
 type M4SlotResourceTelemetry,
 type SliceId,
 type UeSliceMapping,
} from './m4Types'
import type { ResourceAllocation } from './types'
export interface M4SchedulerOrchestratorSession {
 readonly schedulerSession: M2SchedulerSession
 getResourceTrace(): readonly M4SlotResourceTelemetry[]
 getResourceTotals(): M4ResourceAccumulatorSnapshot
}
export interface M4SchedulerOrchestrator {
 createSession(): M4SchedulerOrchestratorSession
}
type MutableSliceTotals = {
 -readonly [Key in Exclude<keyof M4SliceResourceTotals, 'sliceId'>]: M4SliceResourceTotals[Key]
}
const emptyTotals = (): MutableSliceTotals => ({
 requestedResourceBlocks: 0,
 roundedGuaranteeQuotaResourceBlocks: 0,
 guaranteedResourceBlocks: 0,
 ordinarySharedResourceBlocks: 0,
 redistributedResourceBlocks: 0,
 allocatedResourceBlocks: 0,
 schedulerUsedResourceBlocks: 0,
 schedulerUnusedResourceBlocks: 0,
 borrowedResourceBlocks: 0,
 lentResourceBlocks: 0,
})
function safeAdd(left: number, right: number, label: string): number {
 const result = left + right
 if (!Number.isSafeInteger(result)) throw new Error(`${label} güvenli tam sayı sınırını aşıyor.`)
 return result
}
function freezeSlot(slot: M4SlotResourceTelemetry): M4SlotResourceTelemetry {
 return Object.freeze({
   ...slot,
   slices: Object.freeze(slot.slices.map((slice) => Object.freeze({ ...slice }))),
 })
}
export function createM4SchedulerOrchestrator(input: {
 readonly config: M4RuntimeConfig
 readonly mapping: UeSliceMapping
 readonly cellTotalResourceBlocks: number
 readonly resourceTraceSlotLimit: number
 readonly resolveScheduler?: (kind: M4RuntimeConfig['slices'][number]['scheduler']) => M2Scheduler }): M4SchedulerOrchestrator {
 if (!Number.isSafeInteger(input.cellTotalResourceBlocks) || input.cellTotalResourceBlocks <= 0) {
   throw new Error('Hücre toplam RB sayısı pozitif güvenli tam sayı olmalıdır.')
 }
 if (!Number.isSafeInteger(input.resourceTraceSlotLimit) || input.resourceTraceSlotLimit < 0) {
   throw new Error('M4 resource trace limiti negatif olmayan güvenli tam sayı olmalıdır.')
 }
 const createSession = (): M4SchedulerOrchestratorSession => {
   const trace: M4SlotResourceTelemetry[] = []
   const totals: Record<SliceId, MutableSliceTotals> = {
     embb: emptyTotals(),
     urllc: emptyTotals(),
     mmtc: emptyTotals(),
   }
   let processedSlotCount = 0
   let totalAvailable = 0
   let totalRequested = 0
   let totalAllocated = 0
   let totalUsed = 0
   let totalUnused = 0
   let totalUnallocated = 0
   const schedulerResolver = input.resolveScheduler ?? resolveM4Scheduler
     const sessions = new Map<SliceId, M2SchedulerSession>()
     for (const slice of input.config.slices) {
       if (slice.enabled && slice.ueCount > 0) {
       sessions.set(slice.id, schedulerResolver(slice.scheduler).createSession())
       }
     }
   const schedulerSession: M2SchedulerSession = {
       selectAllocations(context: M2SchedulerSlotContext): readonly ResourceAllocation[] {
         if (context.resourceBlocks !== input.cellTotalResourceBlocks) {
           throw new Error('M4 orchestrator hücre RB bağlamı uyuşmuyor.')
         }
         const demand = calculateM4Demand(
           context.queues,
           input.mapping,
           context.resourceBlocks,
           context.slotDurationSeconds,
         )
         const allocation = allocateInterSliceResourceBlocks({
           totalResourceBlocks: context.resourceBlocks,
           slotIndex: context.slotIndex,
           policy: input.config.interSlicePolicy,
           redistributionEnabled: input.config.redistributionEnabled,
           slices: input.config.slices.map((slice, index) => ({
             sliceId: slice.id,
             enabled: slice.enabled,
             weight: slice.weight,
             minimumShare: slice.minimumShare,
             demandResourceBlocks: demand.sliceDemands[index].demandResourceBlocks,
           })),
         })
         const combined: ResourceAllocation[] = []
         const globalSeen = new Set<number>()
         const sliceTelemetry: M4SliceSlotTelemetry[] = []
         for (let sliceIndex = 0; sliceIndex < M4_SLICE_IDS.length; sliceIndex += 1) {
           const sliceId = M4_SLICE_IDS[sliceIndex]
           const sliceConfig = input.config.slices[sliceIndex]
           const sliceAllocation = allocation.slices[sliceIndex]
           const sliceDemand = demand.sliceDemands[sliceIndex]
           const globalIndices = input.mapping.ueIndicesBySlice[sliceId]
           const budget = sliceAllocation.allocatedResourceBlocks
           let used = 0
           if (budget > 0 && globalIndices.length > 0) {
             const session = sessions.get(sliceId)
             if (!session) throw new Error(`${sliceId} scheduler session bulunamadı.`)
             const localQueues: M2QueueState[] = globalIndices.map((globalIndex, localIndex) => {
               const queue = context.queues[globalIndex]
               if (!queue || queue.ueIndex !== globalIndex) {
                 throw new Error(`${sliceId} global queue index semantiği geçersiz.`)
               }
               return {
                 ...queue,
                 ueIndex: localIndex,
                 ue: {
                   ...queue.ue,
                   achievableRateMbps: queue.ue.achievableRateMbps
                     * budget / input.cellTotalResourceBlocks,
                 },
               }
             })
             const localAllocations = session.selectAllocations({
               slotIndex: context.slotIndex,
               slotDurationSeconds: context.slotDurationSeconds,
               resourceBlocks: budget,
               queues: localQueues,
             })
             const localSeen = new Set<number>()
             for (const local of localAllocations) {
               if (!Number.isSafeInteger(local.ueIndex)
                 || local.ueIndex < 0
                 || local.ueIndex >= globalIndices.length) {
                 throw new Error(`${sliceId} scheduler geçersiz local UE index döndürdü.`)
               }
               if (localSeen.has(local.ueIndex)) {
                 throw new Error(`${sliceId} scheduler duplicate local UE allocation döndürdü.`)
               }
               if (!Number.isSafeInteger(local.resourceBlocks) || local.resourceBlocks <= 0) {
                 throw new Error(`${sliceId} scheduler pozitif güvenli tam sayı RB döndürmelidir.`)
               }
               localSeen.add(local.ueIndex)
               used = safeAdd(used, local.resourceBlocks, `${sliceId} used RB`)
               const globalUeIndex = globalIndices[local.ueIndex]
               if (globalSeen.has(globalUeIndex)) {
                 throw new Error(`Duplicate global UE allocation: ${globalUeIndex}`)
               }
               globalSeen.add(globalUeIndex)
               combined.push({
                 ueIndex: globalUeIndex,
                 resourceBlocks: local.resourceBlocks,
               })
             }
             if (used > budget) throw new Error(`${sliceId} scheduler slice bütçesini aştı.`)
           }
           const unused = budget - used
           const telemetry: M4SliceSlotTelemetry = {
             sliceId,
             schedulerKind: sliceConfig.scheduler,
             demandResourceBlocks: sliceDemand.demandResourceBlocks,
             queuedMbits: sliceDemand.queuedMbits,
             activeUeCount: sliceDemand.activeUeCount,
             roundedGuaranteeQuotaResourceBlocks: sliceAllocation.roundedGuaranteeQuotaResourceBlocks,
             guaranteedResourceBlocks: sliceAllocation.guaranteedResourceBlocks,
             ordinarySharedResourceBlocks: sliceAllocation.ordinarySharedResourceBlocks,
             redistributedResourceBlocks: sliceAllocation.redistributedResourceBlocks,
             allocatedResourceBlocks: budget,
             schedulerUsedResourceBlocks: used,
             schedulerUnusedResourceBlocks: unused,
             borrowedResourceBlocks: sliceAllocation.borrowedResourceBlocks,
             lentResourceBlocks: sliceAllocation.lentResourceBlocks,
           }
           sliceTelemetry.push(telemetry)
           const sliceTotals = totals[sliceId]
           for (const key of Object.keys(sliceTotals) as (keyof MutableSliceTotals)[]) {
             const slotKey = key === 'requestedResourceBlocks'
               ? 'demandResourceBlocks'
               : key
             sliceTotals[key] = safeAdd(
               sliceTotals[key],
               telemetry[slotKey as keyof M4SliceSlotTelemetry] as number,
               `${sliceId} ${key}`,
             )
           }
         }
         const used = sliceTelemetry.reduce((sum, slice) => safeAdd(
           sum,
           slice.schedulerUsedResourceBlocks,
           'Slot scheduler used RB',
         ), 0)
         const unused = allocation.totalAllocatedResourceBlocks - used
         if (used > context.resourceBlocks) throw new Error('M4 combined allocation hücre bütçesini aştı.')
         const slotConservationSatisfied = combined.reduce((sum, item) => sum + item.resourceBlocks, 0) === used
           && sliceTelemetry.every((slice) =>
             slice.schedulerUsedResourceBlocks + slice.schedulerUnusedResourceBlocks
             === slice.allocatedResourceBlocks)
           && allocation.totalAllocatedResourceBlocks + allocation.totalUnallocatedResourceBlocks
             === context.resourceBlocks
         if (!slotConservationSatisfied) throw new Error('M4 slot resource conservation invariant ihlali.')
         const slot: M4SlotResourceTelemetry = {
           slotIndex: context.slotIndex,
           totalResourceBlocks: context.resourceBlocks,
           totalRequestedResourceBlocks: allocation.totalRequestedResourceBlocks,
           totalAllocatedResourceBlocks: allocation.totalAllocatedResourceBlocks,
           totalUnallocatedResourceBlocks: allocation.totalUnallocatedResourceBlocks,
           totalSchedulerUsedResourceBlocks: used,
           totalSchedulerUnusedResourceBlocks: unused,
           slices: sliceTelemetry,
           conservationSatisfied: slotConservationSatisfied,
         }
         if (trace.length < input.resourceTraceSlotLimit) trace.push(freezeSlot(slot))
         processedSlotCount = safeAdd(processedSlotCount, 1, 'İşlenen slot')
         totalAvailable = safeAdd(totalAvailable, context.resourceBlocks, 'Toplam available RB')
         totalRequested = safeAdd(totalRequested, allocation.totalRequestedResourceBlocks, 'Toplam requested RB')
         totalAllocated = safeAdd(totalAllocated, allocation.totalAllocatedResourceBlocks, 'Toplam allocated RB')
         totalUsed = safeAdd(totalUsed, used, 'Toplam used RB')
         totalUnused = safeAdd(totalUnused, unused, 'Toplam unused RB')
         totalUnallocated = safeAdd(
           totalUnallocated,
           allocation.totalUnallocatedResourceBlocks,
           'Toplam unallocated RB',
         )
         return combined
       },
     }
   return Object.freeze({
     schedulerSession,
   getResourceTrace: () => Object.freeze([...trace]),
   getResourceTotals: (): M4ResourceAccumulatorSnapshot => {
     const slices = M4_SLICE_IDS.map((sliceId) => Object.freeze({
       sliceId,
       ...totals[sliceId],
     }))
     const borrowed = slices.reduce((sum, slice) => sum + slice.borrowedResourceBlocks, 0)
     const lent = slices.reduce((sum, slice) => sum + slice.lentResourceBlocks, 0)
     const redistributed = slices.reduce((sum, slice) => sum + slice.redistributedResourceBlocks, 0)
     const conservationSatisfied = totalAllocated + totalUnallocated === totalAvailable
       && totalUsed + totalUnused === totalAllocated
       && borrowed === lent
       && redistributed === borrowed
     if (!conservationSatisfied) throw new Error('M4 streaming resource conservation invariant ihlali.')
     const cell: M4CellResourceTotals = Object.freeze({
       processedSlotCount,
       totalAvailableResourceBlocks: totalAvailable,
       totalRequestedResourceBlocks: totalRequested,
       totalAllocatedResourceBlocks: totalAllocated,
       totalSchedulerUsedResourceBlocks: totalUsed,
       totalSchedulerUnusedResourceBlocks: totalUnused,
       totalUnallocatedResourceBlocks: totalUnallocated,
       conservationSatisfied,
     })
     return Object.freeze({ slices: Object.freeze(slices), cell })
   },
 })
 }
 return Object.freeze({ createSession })
}
