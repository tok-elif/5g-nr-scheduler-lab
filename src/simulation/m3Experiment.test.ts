import { describe, expect, it } from 'vitest'
import { DEFAULT_SCENARIO } from './m0'
import { DEFAULT_M2_CONFIG } from './m2'
import {
 buildIntegrityChecks,
 buildSummaryRows,
 deliveryRatioOrNull,
 runM3ScientificExperiment,
} from './m3Experiment'
describe('M3 scientific experiment', () => {
 it('covers two scenarios, five cells, three schedulers and paired differences', () => {
   const result = runM3ScientificExperiment({
     baseScenario: { ...DEFAULT_SCENARIO, ueCount: 4, seed: 800 },
     m2Config: {
       ...DEFAULT_M2_CONFIG,
       slotCount: 12,
       traceSlotLimit: 0,
     },
     seedCount: 2,
   })
   expect(result.rawRuns).toHaveLength(2 * 3 * 5 * 3 * 2)
   expect(result.summaryRows).toHaveLength(2 * 3 * 5 * 3)
   expect(result.pairwiseRows).toHaveLength(2 * 3 * 5 * 2)
   expect(result.rawRuns.every((run) => run.qosMetrics.length > 0)).toBe(true)
   expect(result.seeds).toEqual([31001, 31002])
   expect([...new Set(result.rawRuns.map((run) => run.normalizedOfferedLoad))].sort())
     .toEqual([0.5, 0.8, 1.1])
   expect(result.allIntegrityChecksPassed).toBe(true)
   expect(result.integrityChecks.find((check) => check.id === 'normalized-load-formula')?.passed)
     .toBe(true)
   expect(result.rawRuns
     .filter((run) => run.scenarioKind === 'sc1-same-qos')
     .every((run) => run.metrics.gbrUeMeetingRatio === null
       && run.metrics.gbrMeanFulfillmentRatio === null
       && run.metrics.aggregateGbrServiceRatio === null)).toBe(true)
   const omitted = result.rawRuns.filter((run) => !(run.scenarioKind === 'sc1-same-qos'
     && run.loadProfileId === 'capacity-50'
     && run.cell.id === result.rawRuns[0].cell.id
     && run.scheduler === 'm-lwdf'))
   expect(() => buildSummaryRows(omitted)).toThrow(
     new RegExp(`scenario=sc1-same-qos.*loadProfileId=capacity-50.*cell=${result.rawRuns[0].cell.id}.*scheduler=m-lwdf`),
   )
   const wrongRatio = result.rawRuns.map((run, index) => index === 0
     ? { ...run, normalizedOfferedLoad: run.normalizedOfferedLoad + 0.01 }
     : run)
   const nonPositiveCapacity = result.rawRuns.map((run, index) => index === 0
     ? { ...run, capacityReferenceMbps: 0 }
     : run)
   for (const invalidRuns of [wrongRatio, nonPositiveCapacity]) {
     const checks = buildIntegrityChecks(
       invalidRuns,
       result.summaryRows,
       result.pairwiseRows,
       result.seeds,
       result.scenarioDefinitions,
     )
     expect(checks.find((check) => check.id === 'normalized-load-formula')?.passed).toBe(false)
   }
 })
 it('rejects seeds outside the selected protocol role', () => {
   expect(() => runM3ScientificExperiment({
     baseScenario: { ...DEFAULT_SCENARIO, ueCount: 4, seed: 800 },
     m2Config: { ...DEFAULT_M2_CONFIG, slotCount: 2, traceSlotLimit: 0 },
     seedCount: 2,
     seedRole: 'evaluation',
     seeds: [31001, 31002],
   })).toThrow(/evaluation/)
 })
 it('uses identical traffic and SINR fingerprints across schedulers', () => {
   const result = runM3ScientificExperiment({
     baseScenario: { ...DEFAULT_SCENARIO, ueCount: 4, seed: 900 },
     m2Config: {
       ...DEFAULT_M2_CONFIG,
       slotCount: 10,
       traceSlotLimit: 0,
     },
     seedCount: 2,
   })
   const groups = new Map<string, typeof result.rawRuns>()
   for (const run of result.rawRuns) {
     const key = `${run.scenarioKind}|${run.loadProfileId}|${run.cell.id}|${run.seed}`
     groups.set(key, [...(groups.get(key) ?? []), run])
   }
   for (const group of groups.values()) {
     expect(new Set(group.map((run) => run.sinrFingerprint)).size).toBe(1)
     expect(new Set(group.map((run) => run.trafficFingerprint)).size).toBe(1)
     expect(new Set(group.map((run) => run.effectiveTrafficSeed)).size).toBe(1)
   }
 })
 it('throws instead of inventing normalized load for a missing summary condition', () => {
   expect(() => buildSummaryRows([])).toThrow(
     /scenario=sc1-same-qos.*loadProfileId=capacity-50.*cell=.*scheduler=m-lwdf/,
   )
 })
 it('keeps delivery ratio null when no packet was generated', () => {
   expect(deliveryRatioOrNull(0, 0)).toBeNull()
 })
})
