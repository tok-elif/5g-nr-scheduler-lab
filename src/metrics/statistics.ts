import type { MetricStatistics } from '../simulation/types'
const T_CRITICAL_95 = [
 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228,
 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086,
 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042,
]
export function tCritical95(degreesOfFreedom: number): number {
 if (degreesOfFreedom <= 0) return 0
 if (degreesOfFreedom <= T_CRITICAL_95.length) return T_CRITICAL_95[degreesOfFreedom - 1]
 const z = 1.959963984540054
 const df = degreesOfFreedom
 return z
   + (z ** 3 + z) / (4 * df)
   + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df ** 2)
   + (3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z) / (384 * df ** 3)
   + (79 * z ** 9 + 776 * z ** 7 + 1482 * z ** 5 - 1920 * z ** 3 - 945 * z) / (92_160 * df ** 4)
}
export function summarizeMetric(values: readonly number[]): MetricStatistics {
 if (values.length === 0) throw new Error('İstatistik özeti için en az bir değer gereklidir.')
 if (values.some((value) => !Number.isFinite(value))) throw new Error('İstatistik özeti yalnızca sonlu değerleriçerebilir.')
 const mean = values.reduce((sum, value) => sum + value, 0) / values.length
 const variance = values.length > 1
   ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)
   : 0
 const standardDeviation = Math.sqrt(variance)
 const confidence95HalfWidth = values.length > 1
   ? tCritical95(values.length - 1) * standardDeviation / Math.sqrt(values.length)
   : 0
 return {
   mean,
   standardDeviation,
   confidence95HalfWidth,
   minimum: Math.min(...values),
   maximum: Math.max(...values),
 }
}
