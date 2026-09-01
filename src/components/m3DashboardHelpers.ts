import type { M2QosResult, M2Result } from '../simulation/m2Types'
const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 })
type DeliveryCounts = Pick<M2Result, 'generatedPackets' | 'deliveredPackets'>
type QuickQos = Pick<M2QosResult, 'delayP99Ms' | 'delayP99Estimate'>
type QuickP99Result = { qosResults: QuickQos[] }
export function deliveryRatio(result: DeliveryCounts): number | null {
 return result.generatedPackets > 0 ? result.deliveredPackets / result.generatedPackets : null
}
export function worstP99(result: QuickP99Result): number | null {
 const values = result.qosResults
   .map((qos) => qos.delayP99Estimate.status === 'sufficient' ? qos.delayP99Ms : null)
   .filter((value): value is number => value !== null)
 return values.length > 0 ? Math.max(...values) : null
}
export function latency(value: number | null): string {
 return value === null ? 'N/A' : `${number.format(value)} ms`
}
export function p99Status(result: QuickP99Result): string {
 const estimates = result.qosResults.map((qos) => qos.delayP99Estimate)
 if (estimates.length === 0) return '5QI sonucu yok'
 const sufficient = estimates.filter((item) => item.status === 'sufficient').length
 const insufficient = estimates.filter((item) => item.status === 'insufficient').length
 const empty = estimates.filter((item) => item.status === 'empty').length
 return `${sufficient}/${estimates.length} sınıfta yeterli · ${insufficient} yetersiz · ${empty} boş`
}
export function p99Latency(qos: QuickQos): string {
 if (qos.delayP99Estimate.status === 'empty') return 'N/A · teslim örneği yok'
 if (qos.delayP99Estimate.status === 'insufficient') {
   return `Yetersiz · n=${qos.delayP99Estimate.sampleCount}`
 }
 return latency(qos.delayP99Ms)
}
