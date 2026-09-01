import statisticsConfig from '../config/statistics.json'
import type { PercentileEstimate, PercentileStatus } from '../simulation/m2Types'
export const LATENCY_PERCENTILE_CONFIG = Object.freeze({
 method: statisticsConfig.latencyPercentiles.method,
 minimumSampleCountForP99: statisticsConfig.latencyPercentiles.minimumSampleCountForP99, })
function statusForSampleCount(sampleCount: number, minimumRequiredSampleCount: number): PercentileStatus {
 if (sampleCount === 0) return 'empty'
 return sampleCount < minimumRequiredSampleCount ? 'insufficient' : 'sufficient'
}
/**
* Hyndman-Fan type 7 / NumPy-style linear interpolation.
* The minimum sample rule is a project reporting policy, not a universal statistical threshold.
*/
export function estimatePercentile(
 values: readonly number[],
 percentile: number,
 minimumRequiredSampleCount = 1,
): PercentileEstimate {
 if (!Number.isFinite(percentile) || percentile < 0 || percentile > 1) {
   throw new Error('Yüzdelik 0 ile 1 arasında olmalıdır.')
 }
 if (!Number.isSafeInteger(minimumRequiredSampleCount) || minimumRequiredSampleCount < 1) {
   throw new Error('Minimum yüzdelik örnek sayısı pozitif bir tam sayı olmalıdır.')
 }
 if (values.some((value) => !Number.isFinite(value))) {
   throw new Error('Yüzdelik örnekleri sonlu sayılar olmalıdır.')
 }
 const sampleCount = values.length
 const status = statusForSampleCount(sampleCount, minimumRequiredSampleCount)
 if (sampleCount === 0) {
   return {
     value: null,
     sampleCount,
     status,
     method: LATENCY_PERCENTILE_CONFIG.method,
     percentile,
     minimumRequiredSampleCount,
   }
 }
 const sorted = [...values].sort((left, right) => left - right)
 const position = (sorted.length - 1) * percentile
 const lower = Math.floor(position)
 const upper = Math.ceil(position)
 const value = lower === upper
   ? sorted[lower]
   : sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
 return {
   value,
   sampleCount,
   status,
   method: LATENCY_PERCENTILE_CONFIG.method,
   percentile,
   minimumRequiredSampleCount,
 }
}
export function latencyPercentileEstimates(values: readonly number[]): {
 p50: PercentileEstimate
 p95: PercentileEstimate
 p99: PercentileEstimate
} {
 return {
   p50: estimatePercentile(values, 0.5),
   p95: estimatePercentile(values, 0.95),
   p99: estimatePercentile(
     values,
     0.99,
     LATENCY_PERCENTILE_CONFIG.minimumSampleCountForP99,
   ),
 }
}
export function maximumFinite(values: Iterable<number>): number {
 let maximum = 0
 for (const value of values) {
   if (!Number.isFinite(value)) throw new Error('Maksimum hesabı sonlu sayılar gerektirir.')
   if (value > maximum) maximum = value
 }
 return maximum
}
