import type { M2Scheduler } from '../simulation/m2Types'
import { delayCoefficient, greedyAllocate, pfMetric } from './allocation'
const scheduler: M2Scheduler = {
 kind: 'm-lwdf',
 label: 'M-LWDF',
 shortLabel: 'M-LWDF',
 color: '#7c3aed',
 order: 40,
 createSession: () => ({
   selectAllocations: (context) => greedyAllocate(
     context,
     (queue) => delayCoefficient(queue) * (queue.headOfLineDelayMs / 1_000) * pfMetric(queue),
   ),
 }),
}
export default scheduler
