import type { M2QueueState, M2Scheduler } from '../simulation/m2Types'
import { delayCoefficient, greedyAllocate, hasSchedulableBacklog, pfMetric } from './allocation'
const scheduler: M2Scheduler = {
 kind: 'exp-pf',
 label: 'EXP/PF',
 shortLabel: 'EXP/PF',
 color: '#be123c',
 order: 50,
 createSession: () => ({
   selectAllocations: (context) => {
     const active = context.queues.filter(hasSchedulableBacklog)
     const meanUrgency = expPfMeanUrgency(active)
     return greedyAllocate(context, (queue) => {
       const urgency = delayCoefficient(queue) * (queue.headOfLineDelayMs / 1_000)
       const exponentialWeight = Math.exp((urgency - meanUrgency) / (1 + Math.sqrt(meanUrgency)))
       return exponentialWeight * pfMetric(queue)
     })
   },
 }),
}
export function expPfMeanUrgency(queues: readonly M2QueueState[]): number {
 const active = queues.filter(hasSchedulableBacklog)
 return active.length === 0
   ? 0
   : active.reduce(
     (sum, queue) => sum + delayCoefficient(queue) * (queue.headOfLineDelayMs / 1_000),
     0,
   ) / active.length
}
export default scheduler
