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
 if (context.perRbRateMbps) return greedyAllocatePerRb(context, metric, context.perRbRateMbps)
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
/**
 * RB başına (frekans seçici) tahsis.
 *
 * Wideband modda bütün RB'ler aynı olduğu için scheduler slot başına tek bir
 * sıralama yapar ve UE'lere bitişik bloklar verir. Frekans seçici modda her
 * RB'nin hızı UE'ye göre farklıdır, bu yüzden karar RB başına alınır: her RB o
 * an en yüksek metriğe sahip UE'ye gider. Bir UE'nin backlog'u tükendiğinde
 * yarışmadan çıkar. Sonuç doğal olarak serpiştirilmiş bir tahsis olur.
 *
 * Scheduler dosyalarının hiçbiri değişmez: altı metrik de kuyruğun
 * `ue.achievableRateMbps` alanını okuduğundan, her RB için o RB'nin tam-bant
 * eşdeğer hızını gösteren yeniden kullanılabilir bir kuyruk görünümü verilir.
 */
export function greedyAllocatePerRb(
 context: M2SchedulerSlotContext,
 metric: (queue: M2QueueState) => number,
 perRbRateMbps: readonly (readonly number[])[],
): ResourceAllocation[] {
 const queueCount = context.queues.length
 if (perRbRateMbps.length !== queueCount) {
   throw new Error('RB başına hız tablosu kuyruk sayısıyla aynı uzunlukta olmalıdır.')
 }
 const views = context.queues.map((queue) => ({ ...queue, ue: { ...queue.ue } }))
 const remainingMbits = context.queues.map((queue) => queue.queuedMbits)
 const assigned = context.queues.map<number[]>(() => [])
 for (let rbIndex = 0; rbIndex < context.resourceBlocks; rbIndex += 1) {
   let bestIndex = -1
   let bestMetric = 0
   let bestRank = 0
   for (let ueIndex = 0; ueIndex < queueCount; ueIndex += 1) {
     const rbRateMbps = perRbRateMbps[ueIndex][rbIndex] ?? 0
     if (remainingMbits[ueIndex] <= EPSILON || rbRateMbps <= 0) continue
     const view = views[ueIndex]
     view.queuedMbits = remainingMbits[ueIndex]
     view.ue.achievableRateMbps = rbRateMbps * context.resourceBlocks
     const value = metric(view)
     const rank = (ueIndex - context.slotIndex + queueCount) % queueCount
     const difference = value - bestMetric
     const better = bestIndex === -1
       || (Number.isFinite(difference) && difference > EPSILON)
       || (Math.abs(difference) <= EPSILON && rank < bestRank)
     if (better) {
       bestIndex = ueIndex
       bestMetric = value
       bestRank = rank
     }
   }
   if (bestIndex === -1) break
   assigned[bestIndex].push(rbIndex)
   remainingMbits[bestIndex] = Math.max(
     0,
     remainingMbits[bestIndex] - perRbRateMbps[bestIndex][rbIndex] * context.slotDurationSeconds,
   )
 }
 const allocations: ResourceAllocation[] = []
 for (let ueIndex = 0; ueIndex < queueCount; ueIndex += 1) {
   if (assigned[ueIndex].length > 0) {
     allocations.push({
       ueIndex,
       resourceBlocks: assigned[ueIndex].length,
       resourceBlockIndices: assigned[ueIndex],
     })
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
