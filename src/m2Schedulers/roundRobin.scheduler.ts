import type { M2Scheduler } from '../simulation/m2Types'
import { greedyAllocate } from './allocation'
const scheduler: M2Scheduler = {
 kind: 'round-robin',
 label: 'Round Robin',
 shortLabel: 'RR',
 color: '#2563eb',
 order: 10,
 createSession: () => ({
   selectAllocations: (context) => greedyAllocate(context, (queue) => {
     const distance = (queue.ueIndex - context.slotIndex + context.queues.length) % context.queues.length
     return context.queues.length - distance
   }),
 }),
}
export default scheduler
