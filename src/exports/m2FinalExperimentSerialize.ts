import {
 M2_BATCH_METRICS,
 type M2BatchMetric,
 type M2SampleSummary,
} from '../simulation/m2BatchMatrix'
import type { M2FinalExperimentResult } from '../simulation/m2FinalExperiment'
const UTF8_BOM = '\uFEFF'
function csvCell(value: string | number | boolean | null): string {
 if (value === null) return ''
 const text = String(value)
 return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
function csvDocument(rows: Array<Array<string | number | boolean | null>>): string {
 return `${UTF8_BOM}${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`
}
function metricHeaders(metric: M2BatchMetric): string[] {
 return ['n', 'mean', 'sd', 'ci95_lower', 'ci95_upper', 'ci95_half_width'].map(
   (suffix) => `${metric}_${suffix}`,
 )
}
function statCells(summary: M2SampleSummary | null): Array<number | null> {
 return summary
   ? [
       summary.sampleSize,
       summary.mean,
       summary.standardDeviation,
       summary.confidence95Lower,
       summary.confidence95Upper,
       summary.confidence95HalfWidth,
     ]
   : [null, null, null, null, null, null]
}
export function createM2FinalSummaryCsv(
 result: M2FinalExperimentResult,
): string {
 const header = [
   'preset_id',
   'preset_label',
   'run_id',
   'run_label',
   'scenario_id',
   'scenario_label',
   'load_profile_id',
   'load_profile_label',
   'load_mode',
   'target_load_fraction',
   'arrival_rate_multiplier_mean',
   'baseline_offered_load_mbps_mean',
   'offered_load_mbps_mean',
   'capacity_reference_mbps_mean',
   'normalized_offered_load_mean',
   'duration_ms',
   'ue_count',
   'base_seed',
   'seed_count',
   'seed_step',
   'cell_id',
   'cell_label',
   'resource_blocks',
   'slot_duration_ms',
   'scheduler',
   'scheduler_label',
   ...M2_BATCH_METRICS.flatMap(metricHeaders),
 ]
 const rows = result.runs.flatMap((run) =>
   run.result.summaryRows.map((row) => [
     result.preset.id,
     result.preset.label,
     run.definition.id,
     run.definition.label,
     row.scenarioId,
     row.scenarioLabel,
     row.loadProfileId,
     row.loadProfileLabel,
     row.loadMode,
     row.targetLoadFraction,
     row.arrivalRateMultiplier,
     row.baselineOfferedLoadMbps,
     row.offeredLoadMbps,
     row.capacityReferenceMbps,
     row.normalizedOfferedLoad,
     run.request.durationMs,
     run.request.ueCount,
     run.request.baseSeed,
     run.request.seedCount,
     run.request.seedStep,
     row.cellId,
     row.cellLabel,
     row.resourceBlocks,
     row.slotDurationMs,
     row.scheduler,
     row.schedulerLabel,
     ...M2_BATCH_METRICS.flatMap((metric) => statCells(row.metrics[metric])),
   ]),
 )
 return csvDocument([header, ...rows])
}
export function createM2FinalPairwiseCsv(
 result: M2FinalExperimentResult,
): string {
 const header = [
   'preset_id',
   'run_id',
   'run_label',
   'scenario_id',
   'load_profile_id',
   'load_mode',
   'target_load_fraction',
   'cell_id',
   'cell_label',
   'scheduler_a',
   'scheduler_a_label',
   'scheduler_b',
   'scheduler_b_label',
   ...M2_BATCH_METRICS.flatMap(metricHeaders),
 ]
 const rows = result.runs.flatMap((run) =>
   run.result.pairwiseRows.map((row) => [
     result.preset.id,
     run.definition.id,
     run.definition.label,
     row.scenarioId,
     row.loadProfileId,
     row.loadMode,
     row.targetLoadFraction,
     row.cellId,
     row.cellLabel,
     row.schedulerA,
     row.schedulerALabel,
     row.schedulerB,
     row.schedulerBLabel,
     ...M2_BATCH_METRICS.flatMap((metric) => statCells(row.metrics[metric])),
   ]),
 )
 return csvDocument([header, ...rows])
}
export function createM2FinalManifestCsv(
 result: M2FinalExperimentResult,
): string {
 const header = ['field', 'value']
 const rows: Array<[string, string | number | boolean]> = [
   ['preset_id', result.preset.id],
   ['preset_label', result.preset.label],
   ['generated_at', result.generatedAt],
   ['duration_ms', result.preset.durationMs],
   ['ue_count', result.preset.ueCount],
   ['base_seed', result.preset.baseSeed],
   ['seed_count', result.preset.seedCount],
   ['seed_step', result.preset.seedStep],
   ['seed_list', result.runs[0]?.result.seeds.join('|') ?? ''],
   ['scenario_run_count', result.runs.length],
   ['total_simulation_runs', result.totalRuns],
   ['integrity_common_seed_list', result.integrity.commonSeedList],
   ['integrity_common_cell_count', result.integrity.commonCellCount],
   ['integrity_common_scheduler_count', result.integrity.commonSchedulerCount],
   ['integrity_expected_scenario_coverage', result.integrity.expectedScenarioCoverage],
   ['integrity_total_run_count_matches', result.integrity.totalRunCountMatches],
 ]
 return csvDocument([header, ...rows])
}
export function createM2FinalJson(result: M2FinalExperimentResult): string {
 return JSON.stringify(
   {
     schemaVersion: 2,
     experimentType: 'm2-main-document-final-suite',
     ...result,
   },
   null,
   2,
 )
}
