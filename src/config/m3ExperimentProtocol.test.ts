import { describe, expect, it } from 'vitest'
import {
 M3_EXPERIMENT_PROTOCOL,
 seedListFingerprint,
 seedsForRole,
 validateM3ExperimentProtocol,
} from './m3ExperimentProtocol'
describe('M3 experiment protocol', () => {
 it('keeps development and evaluation seed lists disjoint', () => {
   const development = new Set(seedsForRole('development'))
   expect(seedsForRole('evaluation').filter((seed) => development.has(seed))).toEqual([])
 })
 it('locks the normalized load definition and configured P99 policy', () => {
   expect(M3_EXPERIMENT_PROTOCOL.loadDefinition)
     .toBe('offeredLoadMbps / capacityReferenceMbps')
   expect(M3_EXPERIMENT_PROTOCOL.latencyPercentiles.minimumSampleCountForP99).toBe(100)
 })
 it('rejects overlapping seed roles', () => {
   expect(() => validateM3ExperimentProtocol({
     ...M3_EXPERIMENT_PROTOCOL,
     seedProtocol: { developmentSeeds: [1, 2], evaluationSeeds: [2, 3] },
   })).toThrow(/kesişemez/)
 })
 it('creates a stable seed-list fingerprint', () => {
   expect(seedListFingerprint([1, 2, 3])).toBe(seedListFingerprint([1, 2, 3]))
   expect(seedListFingerprint([1, 2, 3])).not.toBe(seedListFingerprint([1, 3, 2]))
 })
})
