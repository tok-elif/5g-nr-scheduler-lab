import { describe, expect, it } from 'vitest'
import { DEFAULT_SCENARIO } from '../simulation/m0'
import { DEFAULT_M1_CONFIG } from '../simulation/m1'
import { DEFAULT_M2_CONFIG } from '../simulation/m2'
import { APPLICATION_METADATA } from './application'
import { createExperimentFingerprint } from './reproducibility'
import packageMetadata from '../../package.json'
const input = {
 cellId: '2600-20',
 scenario: DEFAULT_SCENARIO,
 m1Config: DEFAULT_M1_CONFIG,
 m2Config: DEFAULT_M2_CONFIG,
 seedCount: 20,
}
describe('experiment fingerprint', () => {
 it('is deterministic and has a compact visible format', () => {
   expect(createExperimentFingerprint(input)).toBe(createExperimentFingerprint(structuredClone(input)))
   expect(createExperimentFingerprint(input)).toMatch(/^RUN-[0-9A-F]{8}$/)
 })
 it('changes when a simulation-defining parameter changes', () => {
   const original = createExperimentFingerprint(input)
   expect(createExperimentFingerprint({ ...input, cellId: '3500-100' })).not.toBe(original)
   expect(createExperimentFingerprint({ ...input, seedCount: 21 })).not.toBe(original)
   expect(createExperimentFingerprint({ ...input, scenario: { ...input.scenario, seed: 2027 } })).not.toBe(original)
   expect(createExperimentFingerprint({ ...input, m1Config: { ...input.m1Config, slotCount: 6_000 }
})).not.toBe(original)
   expect(createExperimentFingerprint({ ...input, m2Config: { ...input.m2Config, slotCount: 3_000 }
})).not.toBe(original)
 })
 it('binds the identity to the application model version', () => {
   expect(createExperimentFingerprint(input, 'different-version')).not.toBe(createExperimentFingerprint(input))
   expect(APPLICATION_METADATA.version).toBe('1.7.5-m3.5')
   expect(APPLICATION_METADATA.version).toBe(packageMetadata.version)
 })
})
