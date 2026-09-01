import { describe, expect, it } from 'vitest'
import { calculateJainFairness, formatFairnessValue } from './fairness'
describe('Jain fairness null semantics (F-METRIC-01)', () => {
 it('returns null for an empty UE list', () => {
   expect(calculateJainFairness([])).toBeNull()
 })
 it('returns null when every throughput is zero', () => {
   expect(calculateJainFairness([0, 0, 0])).toBeNull()
   expect(calculateJainFairness([0])).toBeNull()
 })
 it('returns 1 for a perfectly equal positive distribution', () => {
   expect(calculateJainFairness([5, 5, 5, 5])).toBe(1)
 })
 it('computes the correct value for an unequal positive distribution', () => {
   // Jain = (sum)^2 / (n * sumSq) = (10+20+30)^2 / (3 * (100+400+900))
   //      = 3600 / (3*1400) = 3600 / 4200 = 0.857142857...
   expect(calculateJainFairness([10, 20, 30])).toBeCloseTo(0.8571428571, 10)
 })
 it('does not conflate an all-zero distribution with a fair (1.0) distribution', () => {
   expect(calculateJainFairness([0, 0])).not.toBe(0)
   expect(calculateJainFairness([0, 0])).toBeNull()
 })
 it('formats null as N/A and numbers with fixed digits', () => {
   expect(formatFairnessValue(null)).toBe('N/A')
   expect(formatFairnessValue(0.8571428571)).toBe('0.857')
   expect(formatFairnessValue(1)).toBe('1.000')
   expect(formatFairnessValue(0.5, 2)).toBe('0.50')
 })
})
