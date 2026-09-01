import { describe, expect, it } from 'vitest'
import { normalizeTinyDifference, summarizeM2Sample } from './m2BatchMatrix'
describe('M2 bounded confidence intervals and numerical cleanup', () => {
 it('bounds ratio confidence intervals to [0, 1]', () => {
   const summary = summarizeM2Sample([0.9, 1, 1], 'ratio')
   expect(summary.confidence95Lower).toBeGreaterThanOrEqual(0)
   expect(summary.confidence95Upper).toBeLessThanOrEqual(1)
 })
 it('bounds nonnegative confidence intervals at zero', () => {
   const summary = summarizeM2Sample([0, 0, 1], 'nonnegative')
   expect(summary.confidence95Lower).toBe(0)
   expect(summary.confidence95Upper).toBeGreaterThanOrEqual(summary.mean)
 })
 it('normalizes sub-1e-16 floating differences to exact zero', () => {
   expect(normalizeTinyDifference(5e-17)).toBe(0)
   expect(normalizeTinyDifference(-5e-17)).toBe(0)
   expect(normalizeTinyDifference(2e-16)).toBe(2e-16)
 })
})
