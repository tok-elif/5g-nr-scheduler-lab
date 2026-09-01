import { describe, expect, it } from 'vitest'
import type { SampleStatistics } from '../simulation/m3Experiment'
import {
 aggregateQosP99,
 classifyDifference,
 heatmapDifference,
 type PairwiseMetricSource,
 type QosP99Input,
} from './m3ScientificHelpers'
const statistic = (mean: number): SampleStatistics => ({
 sampleCount: 3,
 status: 'available',
 mean,
 standardDeviation: 0.001,
 confidence95HalfWidth: 0.001,
 confidence95Low: mean - 0.001,
 confidence95High: mean + 0.001,
})
function pairwise(deliveryDifference: number): PairwiseMetricSource {
 return {
   metrics: { deliveryRatio: statistic(deliveryDifference) },
 }
}
const qos = (status: QosP99Input['p99Status'], value: number | null): QosP99Input => ({
 p99Status: status,
 delayP99Ms: value,
})
describe('M3 scientific presentation guards', () => {
 it('uses the paired row as the heatmap difference source', () => {
   expect(heatmapDifference(pairwise(0.123), 'deliveryRatio')).toBe(0.123)
 })
 it('does not call a small baseline-favorable difference candidate-favorable', () => {
   const text = classifyDifference(pairwise(-0.005), 'deliveryRatio', 0.9)
   expect(text).toContain('baseline lehine')
   expect(text).not.toContain('yön aday lehine')
 })
 it('requires at least two sufficient seed P99 values for a displayable mean', () => {
   expect(aggregateQosP99([qos('empty', null), qos('insufficient', 20)]))
     .toMatchObject({ sufficientCount: 0, status: 'not-available', displayableMean: null })
   expect(aggregateQosP99([qos('sufficient', 20), qos('insufficient', 30)]))
     .toMatchObject({ sufficientCount: 1, status: 'insufficient', displayableMean: null })
   expect(aggregateQosP99([qos('sufficient', 20), qos('sufficient', 30)]))
     .toMatchObject({ sufficientCount: 2, status: 'available', displayableMean: 25 })
 })
})
