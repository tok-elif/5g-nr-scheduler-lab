import type { M2Result } from '../simulation/m2Types'
export type M3LeaderMetric =
 | 'throughput'
 | 'fairness'
 | 'delivery'
 | 'gbr'
 | 'p99'
 | 'pdb'
 | 'queue'
export interface M3LeaderDefinition {
 metric: M3LeaderMetric
 label: string
 description: string
 direction: 'maximum' | 'minimum'
}
export interface M3LeaderGroup extends M3LeaderDefinition {
 value: number | null
 leaders: M2Result[]
}
export const M3_LEADER_DEFINITIONS: readonly M3LeaderDefinition[] = Object.freeze([
 {
   metric: 'throughput',
   label: 'En yüksek throughput',
   description: 'Hücre toplam hızı',
   direction: 'maximum',
 },
 {
   metric: 'fairness',
   label: 'En yüksek Jain',
   description: 'UE throughput adaleti',
   direction: 'maximum',
 },
 {
   metric: 'delivery',
   label: 'En yüksek teslim',
   description: 'Paket teslim oranı',
   direction: 'maximum',
 },
 {
   metric: 'gbr',
   label: 'En yüksek GBR',
   description: 'GBR UE karşılama oranı',
   direction: 'maximum',
 },
 {
   metric: 'p99',
   label: 'En düşük P99',
   description: 'En kötü 5QI gecikmesi',
   direction: 'minimum',
 },
 {
   metric: 'pdb',
   label: 'En düşük PDB ihlali',
   description: 'Teslim edilen paketlerde ihlal',
   direction: 'minimum',
 },
 {
   metric: 'queue',
   label: 'En küçük son kuyruk',
   description: 'Simülasyon sonu backlog',
   direction: 'minimum',
 },
])
function safeRatio(numerator: number, denominator: number): number {
 return denominator > 0 ? numerator / denominator : 1
}
function worstQosP99(result: M2Result): number | null {
 const values = result.qosResults
   .map((qos) => qos.delayP99Ms)
   .filter((value): value is number => value !== null)
 return values.length > 0 ? Math.max(...values) : null
}
export function m3LeaderMetricValue(
 result: M2Result,
 metric: M3LeaderMetric,
): number | null {
 switch (metric) {
   case 'throughput':
     return result.cellThroughputMbps
   case 'fairness':
     return result.jainFairness
   case 'delivery':
     return safeRatio(result.deliveredPackets, result.generatedPackets)
   case 'gbr':
     if (result.gbrUeMeetingRatio !== undefined) return result.gbrUeMeetingRatio
     {
       const users = result.ueResults.filter((ue) => ue.resourceType === 'GBR')
       return users.length > 0
         ? users.filter((ue) => ue.gbrSatisfied).length / users.length
         : null
     }
   case 'p99':
     return worstQosP99(result)
   case 'pdb':
     return result.pdbViolationRatio
   case 'queue':
     return result.queuedPackets
 }
}
export function getM3MetricLeaderGroups(
 results: readonly M2Result[],
): M3LeaderGroup[] {
 if (results.length === 0) return []
 return M3_LEADER_DEFINITIONS.map((definition) => {
   const values = results
     .map((result) => m3LeaderMetricValue(result, definition.metric))
     .filter((value): value is number => value !== null)
   if (values.length === 0) {
     return { ...definition, value: null, leaders: [] }
   }
   const target = definition.direction === 'maximum'
     ? Math.max(...values)
     : Math.min(...values)
   const tolerance = Math.max(1e-12, Math.abs(target) * 1e-9)
   const leaders = results.filter((result) => {
     const value = m3LeaderMetricValue(result, definition.metric)
     return value !== null && Math.abs(value - target) <= tolerance
   })
   return {
     ...definition,
     value: target,
     leaders,
   }
 })
}
