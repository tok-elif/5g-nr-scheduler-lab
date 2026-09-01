import type { M2Scheduler } from '../simulation/m2Types'
import { greedyAllocate } from './allocation'
const scheduler: M2Scheduler = {
 kind: 'max-ci',
 label: 'Max C/I',
 shortLabel: 'Max C/I',
 color: '#c2410c',
 order: 20,
 createSession: () => ({
   selectAllocations: (context) => greedyAllocate(context, (queue) => queue.ue.achievableRateMbps),
 }),
}
export default scheduler
