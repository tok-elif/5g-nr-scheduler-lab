import { requiredResourceBlocksForQueue } from '../m2Schedulers/allocation'
import type { M2QueueState } from './m2Types'
import {
 M4_SLICE_IDS,
 type M4DemandResult,
 type M4SliceDemand,
 type M4UeDemand,
 type UeSliceMapping,
} from './m4Types'
function safeAdd(left: number, right: number, label: string): number {
 const result = left + right
 if (!Number.isSafeInteger(result)) throw new Error(`${label} güvenli tam sayı sınırını aşıyor.`)
 return result
}
export function calculateM4Demand(
 queues: readonly M2QueueState[],
 mapping: UeSliceMapping,
 totalResourceBlocks: number,
 slotDurationSeconds: number,
): M4DemandResult {
 const seen = new Set<number>()
 const ueDemands: M4UeDemand[] = queues.map((queue) => {
   if (!Number.isSafeInteger(queue.ueIndex) || queue.ueIndex < 0
     || queue.ueIndex >= mapping.sliceByUeIndex.length) {
     throw new Error(`Mapping dışı UE index: ${queue.ueIndex}`)
   }
   if (seen.has(queue.ueIndex)) throw new Error(`Duplicate queue UE index: ${queue.ueIndex}`)
   seen.add(queue.ueIndex)
   if (!Number.isFinite(queue.queuedMbits) || queue.queuedMbits < 0) {
     throw new Error(`UE ${queue.ueIndex} queue backlog geçersiz.`)
   }
   return Object.freeze({
     ueIndex: queue.ueIndex,
     sliceId: mapping.sliceByUeIndex[queue.ueIndex],
     demandResourceBlocks: requiredResourceBlocksForQueue(
       queue,
       totalResourceBlocks,
       slotDurationSeconds,
     ),
     queuedMbits: queue.queuedMbits,
   })
 })
 const sliceDemands: M4SliceDemand[] = M4_SLICE_IDS.map((sliceId) => {
   const members = ueDemands.filter((demand) => demand.sliceId === sliceId)
   return Object.freeze({
     sliceId,
     demandResourceBlocks: members.reduce(
       (sum, demand) => safeAdd(sum, demand.demandResourceBlocks, `${sliceId} RB talebi`),
       0,
     ),
     queuedMbits: members.reduce((sum, demand) => sum + demand.queuedMbits, 0),
     activeUeCount: members.filter((demand) => demand.demandResourceBlocks > 0).length,
   })
 })
 return Object.freeze({
   ueDemands: Object.freeze(ueDemands),
   sliceDemands: Object.freeze(sliceDemands),
 })
}
