import { M3_EXPERIMENT_PROTOCOL } from '../config/m3ExperimentProtocol'
import { KPI_DESCRIPTORS, type KpiDescriptor } from '../metrics/kpiDescriptors'
import type {
 M3MetricName,
 M3QosMetrics,
 SampleStatistics,
} from '../simulation/m3Experiment'
export type ScientificMetricName = Exclude<M3MetricName, 'gbrMeetingRatio' | 'overdueQueuedPackets' |
'oldestQueuedPacketAgeMs'>
export type PairwiseMetricSource = {
 metrics: Partial<Record<ScientificMetricName, SampleStatistics>>
}
export type QosP99Input = Pick<M3QosMetrics, 'p99Status' | 'delayP99Ms'>
export const SCIENTIFIC_KPIS: Record<ScientificMetricName, KpiDescriptor> = {
 cellThroughputMbps: KPI_DESCRIPTORS.cellThroughputMbps,
 jainFairness: KPI_DESCRIPTORS.jainFairness,
 deliveryRatio: KPI_DESCRIPTORS.deliveryRatio,
 gbrUeMeetingRatio: KPI_DESCRIPTORS.gbrUeMeetingRatio,
 gbrMeanFulfillmentRatio: KPI_DESCRIPTORS.gbrMeanFulfillmentRatio,
 aggregateGbrServiceRatio: KPI_DESCRIPTORS.aggregateGbrServiceRatio,
 worstQosP99Ms: KPI_DESCRIPTORS.worstQosP99Ms,
 pdbViolationRatio: KPI_DESCRIPTORS.pdbViolationRatio,
 queuedPackets: KPI_DESCRIPTORS.queuedPackets,
}
export function practicalThreshold(metric: ScientificMetricName, baselineMean: number | null): number {
 if (metric === 'cellThroughputMbps') {
   return Math.abs(baselineMean ?? 0)
     * M3_EXPERIMENT_PROTOCOL.practicalImportance.defaultThroughputNonInferiorityLossFraction
 }
 if (metric === 'jainFairness') {
   return M3_EXPERIMENT_PROTOCOL.practicalImportance.defaultJainLossThreshold
 }
 if (metric === 'deliveryRatio'
   || metric === 'gbrUeMeetingRatio'
   || metric === 'gbrMeanFulfillmentRatio'
   || metric === 'aggregateGbrServiceRatio'
   || metric === 'pdbViolationRatio') return 0.01
 if (metric === 'worstQosP99Ms') return 1
 return 1
}
export function classifyDifference(
 pairwise: PairwiseMetricSource | undefined,
 metric: ScientificMetricName,
 baselineMean: number | null,
): string {
 if (!pairwise) return 'Bu koşul için eşleştirilmiş karşılaştırma yok.'
 const statistics = pairwise.metrics[metric]
 if (!statistics || statistics.mean === null
   || statistics.confidence95Low === null
   || statistics.confidence95High === null) {
   return 'KPI bu koşulda uygulanabilir değil; üstünlük sonucu üretilmedi.'
 }
 const favorableSign = SCIENTIFIC_KPIS[metric].betterDirection === 'lower' ? -1 : 1
 const directedMean = statistics.mean * favorableSign
 const directedLow = Math.min(
   statistics.confidence95Low * favorableSign,
   statistics.confidence95High * favorableSign,
 )
 const directedHigh = Math.max(
   statistics.confidence95Low * favorableSign,
   statistics.confidence95High * favorableSign,
 )
 const threshold = practicalThreshold(metric, baselineMean)
 if (directedLow <= 0 && directedHigh >= 0) {
   return 'Belirsiz: %95 güven aralığı sıfırı kesiyor; koşul bazlı üstünlük gösterilmedi.'
 }
 if (Math.abs(statistics.mean) < threshold) {
   const direction = directedMean > 0
     ? 'aday lehine'
     : directedMean < 0 ? 'baseline lehine' : 'yönsüz / fark yok'
   return `İstatistiksel yön ${direction}, ancak fark geçici pratik önem eşiğinin altında.`
 }
 if (directedMean > 0) {
   return 'Bu koşul ve KPI için aday lehine, güven aralığıyla desteklenen pratik fark var.'
 }
 return 'Bu koşul ve KPI için baseline lehine, güven aralığıyla desteklenen pratik fark var.'
}
export interface QosP99Aggregate {
 totalCount: number
 sufficientCount: number
 mean: number | null
 displayableMean: number | null
 status: 'not-available' | 'insufficient' | 'available'
}
export function aggregateQosP99(metrics: readonly QosP99Input[]): QosP99Aggregate {
 const sufficientValues = metrics.flatMap((item) =>
   item.p99Status === 'sufficient' && item.delayP99Ms !== null && Number.isFinite(item.delayP99Ms)
     ? [item.delayP99Ms] : [])
 const sufficientCount = sufficientValues.length
 const mean = sufficientCount > 0
   ? sufficientValues.reduce((sum, value) => sum + value, 0) / sufficientCount : null
 return {
   totalCount: metrics.length,
   sufficientCount,
   mean,
   displayableMean: sufficientCount >= 2 ? mean : null,
   status: sufficientCount === 0 ? 'not-available' : sufficientCount === 1 ? 'insufficient' : 'available',
 }
}
export function heatmapDifference(
 pairwise: PairwiseMetricSource | undefined,
 metric: ScientificMetricName,
): number | null {
 return pairwise?.metrics[metric]?.mean ?? null
}
