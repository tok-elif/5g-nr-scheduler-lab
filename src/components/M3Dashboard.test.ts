import { describe, expect, it } from 'vitest'
import type { PercentileEstimate } from '../simulation/m2Types'
import { deliveryRatio, p99Status, worstP99 } from './m3DashboardHelpers'
function resultWithP99(
 entries: Array<{ value: number | null; status: 'empty' | 'insufficient' | 'sufficient'; count: number }>, ): {
 generatedPackets: number
 deliveredPackets: number
 qosResults: Array<{ delayP99Ms: number | null; delayP99Estimate: PercentileEstimate }> } {
 return {
   generatedPackets: 0,
   deliveredPackets: 0,
   qosResults: entries.map((entry) => ({
     delayP99Ms: entry.value,
     delayP99Estimate: {
       value: entry.value,
       status: entry.status,
       sampleCount: entry.count,
       method: 'hyndman-fan-r7-linear-interpolation',
       percentile: 0.99,
       minimumRequiredSampleCount: 100,
     },
   })),
 }
}
describe('M3 quick scientific guards', () => {
 it('excludes insufficient P99 values from the worst P99', () => {
   const result = resultWithP99([
     { value: 900, status: 'insufficient', count: 10 },
     { value: 40, status: 'sufficient', count: 100 },
   ])
   expect(worstP99(result)).toBe(40)
 })
 it('returns null when no P99 estimate is sufficient', () => {
   expect(worstP99(resultWithP99([
     { value: 900, status: 'insufficient', count: 10 },
     { value: null, status: 'empty', count: 0 },
   ]))).toBeNull()
 })
 it('summarizes every P99 status class and treats an empty delivery denominator as N/A', () => {
   const result = resultWithP99([
     { value: 20, status: 'sufficient', count: 100 },
     { value: 30, status: 'insufficient', count: 50 },
     { value: null, status: 'empty', count: 0 },
   ])
   expect(p99Status(result)).toBe('1/3 sınıfta yeterli · 1 yetersiz · 1 boş')
   expect(deliveryRatio(result)).toBeNull()
 })
})
