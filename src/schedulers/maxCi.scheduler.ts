import type { Scheduler } from '../simulation/types'
const scheduler: Scheduler = {
 kind: 'max-ci',
 label: 'Max C/I',
 shortLabel: 'Max C/I',
 color: '#c2410c',
 order: 20,
 createSession: ({ ues, resourceBlocks }) => {
   const bestRate = Math.max(...ues.map((ue) => ue.achievableRateMbps))
   const bestIndices = ues.flatMap((ue, index) => ue.achievableRateMbps === bestRate ? [index] : [])
   return {
     selectAllocations: ({ slotIndex }) => [{
       ueIndex: bestIndices[slotIndex % bestIndices.length],
       resourceBlocks,
     }],
   }
 },
}
export default scheduler
