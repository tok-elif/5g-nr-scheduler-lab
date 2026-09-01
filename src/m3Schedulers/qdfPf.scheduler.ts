import { M3_CONFIG } from '../config/m3'
import type { M2QueueState, M2Scheduler } from '../simulation/m2Types'
import { greedyAllocate } from '../m2Schedulers/allocation'
const parameters = M3_CONFIG.qdfPf
function bounded(value: number, minimum: number, maximum: number): number {
 return Math.min(maximum, Math.max(minimum, value))
}
/**
* QDF-PF is a project-specific delay-aware PF extension:
*
*   base_i = a_i * W_i * R_i / max(T_i, epsilonThroughput)
*   deficit_i = clamp((GBR_i - T_i) / max(GBR_i, epsilonGbr), 0, 1)
*   priority_i = 1 / max(priorityLevel_i, 1)
*   metric_i = base_i * (1 + beta * deficit_i) * (1 + gamma * priority_i)
*
* a_i = -ln(delta_i) / PDB_i and W_i is the head-of-line delay.
* Time and throughput tolerances are deliberately separated to preserve units.
*/
export function qdfPfMetric(queue: M2QueueState): number {
 const packetDelayBudgetSeconds = Math.max(
   queue.qos.packetDelayBudgetMs / 1_000,
   parameters.epsilonTimeSeconds,
 )
 const headOfLineSeconds = Math.max(
   queue.headOfLineDelayMs / 1_000,
   parameters.delta * packetDelayBudgetSeconds,
 )
 const delayCoefficient = -Math.log(queue.qos.delayViolationProbability)
   / packetDelayBudgetSeconds
 const pfRatio = queue.ue.achievableRateMbps / Math.max(
   queue.averageThroughputMbps,
   parameters.epsilonThroughputMbps,
 )
 const baseMetric = delayCoefficient * headOfLineSeconds * pfRatio
 const gbrDeficit = queue.traffic.gbrMbps > 0
   ? bounded(
     (queue.traffic.gbrMbps - queue.averageThroughputMbps)
       / Math.max(queue.traffic.gbrMbps, parameters.epsilonGbrMbps),
     0,
     1,
   )
   : 0
 const priorityWeight = 1 / Math.max(queue.qos.priorityLevel, 1)
 return baseMetric
   * (1 + parameters.beta * gbrDeficit)
   * (1 + parameters.gamma * priorityWeight)
}
const scheduler: M2Scheduler = {
 kind: 'qdf-pf',
 label: 'QDF-PF',
 shortLabel: 'QDF-PF',
 color: '#0891b2',
 order: 30,
 createSession: () => ({
   selectAllocations: (context) => greedyAllocate(context, qdfPfMetric),
 }),
}
export default scheduler
