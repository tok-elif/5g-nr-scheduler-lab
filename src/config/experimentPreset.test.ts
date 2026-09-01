import { describe, expect, it } from 'vitest'
import { DEFAULT_SCENARIO } from '../simulation/m0'
import { DEFAULT_M1_CONFIG } from '../simulation/m1'
import { parseExperimentPreset, serializeExperimentPreset } from './experimentPreset'
const validInput = {
 cellId: '2600-20',
 scenario: DEFAULT_SCENARIO,
 m1Config: DEFAULT_M1_CONFIG,
 seedCount: 20,
 selectedScheduler: 'proportional-fair',
}
describe('experiment preset serialization', () => {
 it('round-trips every reproducibility parameter', () => {
   const parsed = parseExperimentPreset(serializeExperimentPreset(validInput))
   expect(parsed).toMatchObject({ schemaVersion: 1, ...validInput })
   expect(parsed.createdAt).toBeTypeOf('string')
   expect(parsed.applicationVersion).toBe('1.7.5-m3.5')
   expect(parsed.experimentId).toMatch(/^RUN-[0-9A-F]{8}$/)
 })
 it('rejects malformed JSON and unsupported schema versions', () => {
   expect(() => parseExperimentPreset('{')).toThrow('geçerli bir JSON')
   const unsupported = JSON.parse(serializeExperimentPreset(validInput))
   unsupported.schemaVersion = 2
   expect(() => parseExperimentPreset(JSON.stringify(unsupported))).toThrow('Desteklenmeyen')
 })
 it('rejects unknown cells and unsafe numeric ranges', () => {
   const unknownCell = JSON.parse(serializeExperimentPreset(validInput))
   unknownCell.cellId = 'unknown'
   expect(() => parseExperimentPreset(JSON.stringify(unknownCell))).toThrow('Bilinmeyen hücre')
   const invalidSeedCount = JSON.parse(serializeExperimentPreset(validInput))
   invalidSeedCount.seedCount = 1
   expect(() => parseExperimentPreset(JSON.stringify(invalidSeedCount))).toThrow('seedCount')
 })
 it('rejects inconsistent SINR bounds', () => {
   const invalid = JSON.parse(serializeExperimentPreset(validInput))
   invalid.scenario.minSinrDb = 20
   invalid.scenario.maxSinrDb = 10
   expect(() => parseExperimentPreset(JSON.stringify(invalid))).toThrow('Minimum SINR')
 })
 it('loads profiles created before version metadata was added', () => {
   const legacy = JSON.parse(serializeExperimentPreset(validInput))
   delete legacy.applicationVersion
   delete legacy.experimentId
   const parsed = parseExperimentPreset(JSON.stringify(legacy))
   expect(parsed.applicationVersion).toBe('1.7.5-m3.5')
   expect(parsed.experimentId).toMatch(/^RUN-[0-9A-F]{8}$/)
 })
})
