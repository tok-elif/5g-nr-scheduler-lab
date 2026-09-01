import { APPLICATION_METADATA } from '../config/application'
import { M3_EXPERIMENT_PROTOCOL } from '../config/m3ExperimentProtocol'
import { SCHEDULER_DESCRIPTORS } from '../schedulers/metadata'
import {
 M3_METRIC_NAMES,
 type M3ScientificExperimentResult,
} from '../simulation/m3Experiment'
const UTF8_BOM = String.fromCharCode(0xfeff)
const QUOTE = String.fromCharCode(34)
function csvCell(value: string | number | boolean | null): string {
 if (value === null) return ''
 const content = String(value)
 if (!content.includes(',') && !content.includes(QUOTE)
   && !content.includes('\n') && !content.includes('\r')) return content
 return QUOTE + content.replaceAll(QUOTE, QUOTE + QUOTE) + QUOTE
}
function csvRow(values: readonly (string | number | boolean | null)[]): string {
 return values.map(csvCell).join(',')
}
export function createM3ScientificSummaryCsv(
 result: M3ScientificExperimentResult,
): string {
 const header = csvRow([
   'schema_version', 'seed_role', 'seed_fingerprint', 'scenario',
   'load_profile', 'normalized_offered_load', 'cell_id', 'band_mhz',
   'bandwidth_mhz', 'rb', 'scs_khz', 'scheduler', 'metric', 'status',
   'sample_count', 'mean', 'standard_deviation', 'confidence95_half_width',
   'confidence95_low', 'confidence95_high',
 ])
 const rows = result.summaryRows.flatMap((row) =>
   M3_METRIC_NAMES.map((metric) => {
     const stat = row.metrics[metric]
     return csvRow([
       result.schemaVersion, result.seedRole, result.seedListFingerprint,
       row.scenarioKind, row.loadProfileId, row.normalizedOfferedLoad,
       row.cell.id, row.cell.bandMHz, row.cell.bandwidthMHz,
       row.cell.resourceBlocks, row.cell.scsKHz, row.scheduler, metric,
       stat.status, stat.sampleCount, stat.mean, stat.standardDeviation,
       stat.confidence95HalfWidth, stat.confidence95Low, stat.confidence95High,
     ])
   }))
 return `${UTF8_BOM}${[header, ...rows].join('\n')}\n`
}
export function createM3ScientificPairwiseCsv(
 result: M3ScientificExperimentResult,
): string {
 const header = csvRow([
   'schema_version', 'seed_role', 'seed_fingerprint', 'scenario',
   'load_profile', 'normalized_offered_load', 'cell_id',
   'baseline_scheduler', 'comparator_scheduler', 'direction', 'metric',
   'status', 'sample_count', 'mean_difference', 'standard_deviation',
   'confidence95_half_width', 'confidence95_low', 'confidence95_high',
 ])
 const rows = result.pairwiseRows.flatMap((row) =>
   M3_METRIC_NAMES.map((metric) => {
     const stat = row.metrics[metric]
     return csvRow([
       result.schemaVersion, result.seedRole, result.seedListFingerprint,
       row.scenarioKind, row.loadProfileId, row.normalizedOfferedLoad,
       row.cell.id, row.baselineScheduler, row.comparatorScheduler,
       row.direction, metric, stat.status, stat.sampleCount, stat.mean,
       stat.standardDeviation, stat.confidence95HalfWidth,
       stat.confidence95Low, stat.confidence95High,
     ])
   }))
 return `${UTF8_BOM}${[header, ...rows].join('\n')}\n`
}
export function createM3ScientificRawCsv(
 result: M3ScientificExperimentResult,
): string {
 const header = csvRow([
   'schema_version', 'seed_role', 'seed_fingerprint', 'scenario',
   'load_profile', 'offered_load_mbps', 'capacity_reference_mbps',
   'normalized_offered_load', 'cell_id', 'seed', 'effective_traffic_seed',
   'scheduler', 'sinr_fingerprint', 'traffic_fingerprint', 'qos_metrics_json',
   ...M3_METRIC_NAMES,
 ])
 const rows = result.rawRuns.map((run) => csvRow([
   result.schemaVersion, result.seedRole, result.seedListFingerprint,
   run.scenarioKind, run.loadProfileId, run.offeredLoadMbps,
   run.capacityReferenceMbps, run.normalizedOfferedLoad, run.cell.id,
   run.seed, run.effectiveTrafficSeed, run.scheduler, run.sinrFingerprint,
   run.trafficFingerprint, JSON.stringify(run.qosMetrics),
   ...M3_METRIC_NAMES.map((metric) => run.metrics[metric]),
 ]))
 return `${UTF8_BOM}${[header, ...rows].join('\n')}\n`
}
export function createM3ScientificJson(
 result: M3ScientificExperimentResult,
): string {
 return JSON.stringify({
   schemaVersion: 2,
   experimentType: 'm3-scheduler-scientific-multi-seed-comparison',
   generatedAt: new Date().toISOString(),
   application: APPLICATION_METADATA,
   experimentProtocol: M3_EXPERIMENT_PROTOCOL,
   schedulerMetadata: SCHEDULER_DESCRIPTORS,
   statisticalProtocol: {
     confidenceLevel: 0.95,
     standardDeviation: 'sample-standard-deviation-n-minus-1',
     interval: 'two-sided-student-t',
     pairedDifferenceDirection: 'comparator-minus-baseline',
     nullPolicy: 'not-applicable-values-remain-null',
   },
   result,
 }, null, 2)
}
