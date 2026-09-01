import { describe, expect, it } from 'vitest'
import {
 createM3ScientificJson,
 createM3ScientificPairwiseCsv,
 createM3ScientificRawCsv,
 createM3ScientificSummaryCsv,
} from './m3ExperimentSerialize'
import type { M3ScientificExperimentResult } from '../simulation/m3Experiment'
import { runM3ScientificExperiment } from '../simulation/m3Experiment'
import { DEFAULT_SCENARIO } from '../simulation/m0'
import { DEFAULT_M2_CONFIG } from '../simulation/m2'
const emptyResult = {
 schemaVersion: 2,
 generatedAt: '2026-07-14T00:00:00.000Z',
 request: {},
 seedRole: 'development',
 seedListFingerprint: 'SEEDS-EMPTY',
 seeds: [],
 scenarioDefinitions: [],
 rawRuns: [],
 summaryRows: [],
 pairwiseRows: [],
 integrityChecks: [],
 allIntegrityChecksPassed: true,
} as unknown as M3ScientificExperimentResult
describe('M3 scientific serialization', () => {
 it('writes BOM-prefixed CSV files', () => {
   expect(createM3ScientificSummaryCsv(emptyResult).startsWith('\uFEFF')).toBe(true)
   expect(createM3ScientificPairwiseCsv(emptyResult).startsWith('\uFEFF')).toBe(true)
   expect(createM3ScientificRawCsv(emptyResult).startsWith('\uFEFF')).toBe(true)
 })
 it('documents the paired Student-t protocol in JSON', () => {
   const parsed = JSON.parse(createM3ScientificJson(emptyResult))
   expect(parsed.experimentType).toBe('m3-scheduler-scientific-multi-seed-comparison')
   expect(parsed.statisticalProtocol.interval).toBe('two-sided-student-t')
   expect(parsed.statisticalProtocol.pairedDifferenceDirection).toBe('comparator-minus-baseline')
   expect(parsed.statisticalProtocol.nullPolicy).toBe('not-applicable-values-remain-null')
 })
 it('preserves a null delivery ratio in JSON instead of turning it into zero or one', () => {
   const experiment = runM3ScientificExperiment({
     baseScenario: { ...DEFAULT_SCENARIO, ueCount: 2 },
     m2Config: { ...DEFAULT_M2_CONFIG, slotCount: 1, traceSlotLimit: 0 },
     seedCount: 2,
   })
   const result: M3ScientificExperimentResult = {
     ...experiment,
     rawRuns: experiment.rawRuns.map((run, index) => index === 0
       ? { ...run, metrics: { ...run.metrics, deliveryRatio: null } }
       : run),
   }
   const parsed = JSON.parse(createM3ScientificJson(result))
   expect(parsed.result.rawRuns[0].metrics.deliveryRatio).toBeNull()
 })
})
