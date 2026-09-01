import { describe, expect, it } from 'vitest'
import type { M2FinalExperimentPreset } from '../config/m2Scenarios'
import { runFinalM2Experiment } from '../simulation/m2FinalExperiment'
import {
 createM2FinalJson,
 createM2FinalManifestCsv,
 createM2FinalPairwiseCsv,
 createM2FinalSummaryCsv,
} from './m2FinalExperimentSerialize'
const preset: M2FinalExperimentPreset = {
 id: 'serialize-final',
 label: 'Serialize Final',
 description: 'Serialization test preset.',
 durationMs: 10,
 ueCount: 4,
 baseSeed: 900,
 seedCount: 2,
 seedStep: 1,
 runs: [
   {
     id: 'sc1',
     label: 'SC-1',
     scenarioId: 'sc1-same-qos',
     loadProfileId: 'medium',
   },
   {
     id: 'sc2',
     label: 'SC-2',
     scenarioId: 'sc2-mixed-qos',
     loadProfileId: 'medium',
   },
 ],
}
describe('final M2 experiment serialization', () => {
 it('exports BOM-prefixed combined summary, pairwise and manifest CSV files', () => {
   const result = runFinalM2Experiment(preset)
   const summary = createM2FinalSummaryCsv(result)
   const pairwise = createM2FinalPairwiseCsv(result)
   const manifest = createM2FinalManifestCsv(result)
   expect(summary.startsWith('\uFEFF')).toBe(true)
   expect(pairwise.startsWith('\uFEFF')).toBe(true)
   expect(manifest.startsWith('\uFEFF')).toBe(true)
   expect(summary).toContain('pdbViolationRatio_ci95_half_width')
   expect(summary).toContain('normalized_offered_load_mean')
   expect(pairwise).toContain('scheduler_a')
   expect(manifest).toContain('integrity_common_seed_list,true')
 })
 it('exports a parseable complete final experiment JSON', () => {
   const result = runFinalM2Experiment(preset)
   const parsed = JSON.parse(createM2FinalJson(result))
   expect(parsed.schemaVersion).toBe(2)
   expect(parsed.experimentType).toBe('m2-main-document-final-suite')
   expect(parsed.runs).toHaveLength(2)
   expect(parsed.integrity.commonSeedList).toBe(true)
 })
})
