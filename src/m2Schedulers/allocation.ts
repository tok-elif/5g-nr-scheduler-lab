import simulationConfig from '../config/simulation.json'
import type { ResourceAllocation } from '../simulation/types'
import type { M2QueueState, M2SchedulerSlotContext } from '../simulation/m2Types'
const EPSILON = simulationConfig.model.numericalEpsilon
export function hasSchedulableBacklog(queue: M2QueueState): boolean {
 return queue.queuedMbits > EPSILON && queue.ue.achievableRateMbps > 0
}
export function requiredResourceBlocksForQueue(
 queue: M2QueueState,
 totalResourceBlocks: number,
 slotDurationSeconds: number,
): number {
 if (!Number.isSafeInteger(totalResourceBlocks) || totalResourceBlocks <= 0) {
   throw new Error('Toplam RB sayısı pozitif güvenli tam sayı olmalıdır.')
 }
 if (!Number.isFinite(slotDurationSeconds) || slotDurationSeconds <= 0) {
   throw new Error('Slot süresi pozitif ve sonlu olmalıdır.')
 }
 if (!Number.isFinite(queue.queuedMbits) || queue.queuedMbits < 0) {
   throw new Error('Queue backlog sonlu ve negatif olmayan sayı olmalıdır.')
 }
 if (queue.queuedMbits <= EPSILON) return 0
 if (!Number.isFinite(queue.ue.achievableRateMbps) || queue.ue.achievableRateMbps <= 0) {
   throw new Error('Pozitif backlog için servis kapasitesi pozitif ve sonlu olmalıdır.')
 }
 const mbitsPerResourceBlock = queue.ue.achievableRateMbps
   / totalResourceBlocks * slotDurationSeconds
 const required = Math.ceil(queue.queuedMbits / mbitsPerResourceBlock)
 if (!Number.isSafeInteger(required) || required < 0) {
   throw new Error('Gerekli RB sayısı güvenli tam sayı sınırını aşıyor.')
 }
 return required
}
export function greedyAllocate(
 context: M2SchedulerSlotContext,
 metric: (queue: M2QueueState) => number,
): ResourceAllocation[] {
 const queueCount = context.queues.length
 const ranked = context.queues
   .filter(hasSchedulableBacklog)
   .map((queue) => ({ queue, metric: metric(queue) }))
   .sort((left, right) => {
     const metricDifference = right.metric - left.metric
     if (Number.isFinite(metricDifference) && Math.abs(metricDifference) > EPSILON) return metricDifference
     const leftRank = (left.queue.ueIndex - context.slotIndex + queueCount) % queueCount
     const rightRank = (right.queue.ueIndex - context.slotIndex + queueCount) % queueCount
     return leftRank - rightRank
   })
 let remainingResourceBlocks = context.resourceBlocks
 const allocations: ResourceAllocation[] = []
 for (const { queue } of ranked) {
   if (remainingResourceBlocks === 0) break
   const requiredResourceBlocks = requiredResourceBlocksForQueue(
     queue,
     context.resourceBlocks,
     context.slotDurationSeconds,
   )
   const resourceBlocks = Math.min(remainingResourceBlocks, requiredResourceBlocks)
   if (resourceBlocks > 0) {
     allocations.push({ ueIndex: queue.ueIndex, resourceBlocks })
     remainingResourceBlocks -= resourceBlocks
   }
 }
 return allocations
}
export const pfMetric = (queue: M2QueueState): number =>
 queue.ue.achievableRateMbps / Math.max(
   queue.averageThroughputMbps,
   simulationConfig.model.pfMetricMinimumThroughputMbps,
 )
export const delayCoefficient = (queue: M2QueueState): number =>
 -Math.log(queue.qos.delayViolationProbability) / Math.max(queue.qos.packetDelayBudgetMs / 1_000, 1e-9)
