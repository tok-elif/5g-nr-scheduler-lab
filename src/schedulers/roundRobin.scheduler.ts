import type { Scheduler } from '../simulation/types'
const scheduler: Scheduler = {
 kind: 'round-robin',
 label: 'Round Robin',
 shortLabel: 'RR',
 color: '#2563eb',
 order: 10,
 createSession: ({ ues, resourceBlocks }) => ({
   selectAllocations: ({ slotIndex }) => [{ ueIndex: slotIndex % ues.length, resourceBlocks }],
 }),
}
export default scheduler
