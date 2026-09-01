import { describe, expect, it } from 'vitest'
import { estimatePercentile, latencyPercentileEstimates, maximumFinite } from './percentiles'
describe('latency percentile reporting', () => {
 it('distinguishes empty, insufficient and sufficient P99 estimates', () => {
   expect(estimatePercentile([], 0.99, 100)).toMatchObject({
     value: null,
     sampleCount: 0,
     status: 'empty',
   })
   expect(estimatePercentile([1, 2, 3], 0.99, 100)).toMatchObject({
     sampleCount: 3,
     status: 'insufficient',
   })
   expect(estimatePercentile(Array.from({ length: 100 }, (_, index) => index), 0.99, 100))
     .toMatchObject({ sampleCount: 100, status: 'sufficient' })
 })
 it('uses the documented linear interpolation method', () => {
   const estimates = latencyPercentileEstimates([0, 10, 20, 30])
   expect(estimates.p50.value).toBe(15)
   expect(estimates.p50.method).toBe('linear-interpolation-r7')
 })
 it('computes a maximum without spreading a large queue into function arguments', () => {
   const values = Array.from({ length: 250_000 }, (_, index) => index / 10)
   expect(maximumFinite(values)).toBe(24_999.9)
 })
})
describe('R7 / type-7 percentile reference vectors', () => {
 // Beklenen değerler bağımsız olarak elle hesaplanmıştır:
 // position = (n-1)·p; value = x[floor] + (x[ceil]-x[floor])·(position-floor)
 it('single element returns that element for any percentile', () => {
   expect(estimatePercentile([42], 0.5).value).toBe(42)
   expect(estimatePercentile([42], 0.99).value).toBe(42)
 })
 it('two elements interpolate linearly', () => {
   // n=2 -> position = 1·p
   expect(estimatePercentile([10, 20], 0.5).value).toBe(15) // 10 + 10·0.5
   expect(estimatePercentile([10, 20], 0.95).value).toBeCloseTo(19.5, 10) // 10 + 10·0.95
   expect(estimatePercentile([10, 20], 0.99).value).toBeCloseTo(19.9, 10) // 10 + 10·0.99
 })
 it('four elements interpolate at the documented positions', () => {
   // n=4 -> position = 3·p
   expect(estimatePercentile([0, 10, 20, 30], 0.5).value).toBe(15) // pos 1.5 -> 10 + 10·0.5
   expect(estimatePercentile([0, 10, 20, 30], 0.95).value).toBeCloseTo(28.5, 10) // pos 2.85 -> 20 + 10·0.85
   expect(estimatePercentile([0, 10, 20, 30], 0.99).value).toBeCloseTo(29.7, 10) // pos 2.97 -> 20 + 10·0.97
 })
 it('repeated values return the repeated value', () => {
   expect(estimatePercentile([5, 5, 5, 5], 0.5).value).toBe(5)
   expect(estimatePercentile([5, 5, 5, 5], 0.99).value).toBe(5)
 })
 it('sorts unsorted input before interpolation', () => {
   expect(estimatePercentile([30, 0, 20, 10], 0.5).value).toBe(15)
   expect(estimatePercentile([30, 0, 20, 10], 0.95).value).toBeCloseTo(28.5, 10)
 })
 it('returns null for an empty sample', () => {
   expect(estimatePercentile([], 0.5).value).toBeNull()
   expect(estimatePercentile([], 0.5).status).toBe('empty')
 })
 it('guarantees P50 <= P95 <= P99 monotonicity', () => {
   const values = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
   const { p50, p95, p99 } = latencyPercentileEstimates(values)
   expect(p50.value).not.toBeNull()
   expect((p50.value as number) <= (p95.value as number)).toBe(true)
   expect((p95.value as number) <= (p99.value as number)).toBe(true)
 })
})
