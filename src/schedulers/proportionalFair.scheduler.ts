import simulationConfig from '../config/simulation.json'
import type { Scheduler } from '../simulation/types'
const EPSILON_MBPS = simulationConfig.model.pfMetricMinimumThroughputMbps
const scheduler: Scheduler = {
 kind: 'proportional-fair',
 label: 'Proportional Fair',
 shortLabel: 'PF',
 color: '#0f766e',
 order: 30,
 tracksAverageThroughput: true,
 createSession: ({ ues, resourceBlocks }) => ({
   selectAllocations: ({ averageThroughputMbps }) => {
     let bestIndex = 0
     let bestMetric = -Infinity
     for (let index = 0; index < ues.length; index += 1) {
       const metric = ues[index].achievableRateMbps / Math.max(averageThroughputMbps[index], EPSILON_MBPS)
       if (metric > bestMetric) {
         bestMetric = metric
         bestIndex = index
       }
     }
     return [{ ueIndex: bestIndex, resourceBlocks }]
   },
 }),
}
export default scheduler
