import { describe, expect, it } from 'vitest'
import {
 canonicalizeM3ExperimentResult,
 serializeM3ExperimentCanonical,
 stableStringify,
} from './m3ExperimentCanonical'
import type { M3ScientificExperimentResult } from '../simulation/m3Experiment'
import { runM3ScientificExperiment } from '../simulation/m3Experiment'
import { DEFAULT_SCENARIO } from '../simulation/m0'
import { DEFAULT_M2_CONFIG } from '../simulation/m2'
function buildExperiment(): M3ScientificExperimentResult {
 return runM3ScientificExperiment({
   baseScenario: { ...DEFAULT_SCENARIO, ueCount: 2 },
   m2Config: { ...DEFAULT_M2_CONFIG, slotCount: 1, traceSlotLimit: 0 },
   seedCount: 2,
 })
}
describe('M3 canonical deterministic export', () => {
 it('produces byte-for-byte identical output for different generatedAt', () => {
   const experiment = buildExperiment()
   const a: M3ScientificExperimentResult = { ...experiment, generatedAt: '2020-01-01T00:00:00.000Z' }
   const b: M3ScientificExperimentResult = { ...experiment, generatedAt: '2999-12-31T23:59:59.999Z' }
   expect(serializeM3ExperimentCanonical(a)).toBe(serializeM3ExperimentCanonical(b))
 })
 it('excludes generatedAt from the canonical payload', () => {
   const experiment = buildExperiment()
   const text = serializeM3ExperimentCanonical(experiment)
   expect(text.includes('generatedAt')).toBe(false)
   expect(canonicalizeM3ExperimentResult(experiment)).not.toHaveProperty('generatedAt')
 })
 it('keeps a stable, sorted key order', () => {
   expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(
     '{\n  "a": {\n    "c": 3,\n    "d": 2\n  },\n  "b": 1\n}',
   )
 })
 it('rejects non-finite numbers', () => {
   expect(() => stableStringify({ x: Number.POSITIVE_INFINITY })).toThrow(/non-finite/)
   expect(() => stableStringify({ nested: [{ y: Number.NaN }] })).toThrow(/non-finite/)
 })
 it('preserves the scientific fingerprint and null policy', () => {
   const experiment = buildExperiment()
   const parsed = JSON.parse(serializeM3ExperimentCanonical(experiment))
   expect(parsed.result.seedListFingerprint).toBe(experiment.seedListFingerprint)
   expect(parsed.statisticalProtocol.nullPolicy).toBe('not-applicable-values-remain-null')
   expect(parsed.canonical).toBe(true)
 })
 it('keeps the scientific result content identical to the runtime result (minus timestamp)', () => {
   const experiment = buildExperiment()
   const parsed = JSON.parse(serializeM3ExperimentCanonical(experiment))
   expect(parsed.result.seeds).toEqual(experiment.seeds)
   expect(parsed.result.rawRuns.length).toBe(experiment.rawRuns.length)
   expect(parsed.result.allIntegrityChecksPassed).toBe(experiment.allIntegrityChecksPassed)
 })
})
