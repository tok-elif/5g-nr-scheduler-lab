import type { M2Scheduler } from '../simulation/m2Types'
import { greedyAllocate, pfMetric } from './allocation'
const scheduler: M2Scheduler = {
 kind: 'proportional-fair',
 label: 'Proportional Fair',
 shortLabel: 'PF',
 color: '#0f766e',
 order: 30,
 createSession: () => ({
   selectAllocations: (context) => greedyAllocate(context, pfMetric),
 }),
}
export default scheduler
