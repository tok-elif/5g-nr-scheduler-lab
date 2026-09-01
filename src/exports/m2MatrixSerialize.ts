import type { M2MatrixResult } from '../simulation/m2Matrix'
import {
 M2_BATCH_METRICS,
 type M2BatchMatrixResult,
 type M2BatchMetric,
 type M2SampleSummary,
} from '../simulation/m2BatchMatrix'
const UTF8_BOM = '\uFEFF'
function csvCell(value: string | number | null): string {
 if (value === null) return ''
 const text = String(value)
 return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
function csvDocument(rows: Array<Array<string | number | null>>): string {
 return `${UTF8_BOM}${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`
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
function metricHeaders(metric: M2BatchMetric): string[] {
 return ['n', 'mean', 'sd', 'ci95_lower', 'ci95_upper', 'ci95_half_width'].map(
   (suffix) => `${metric}_${suffix}`,
 )
}
export function createM2MatrixCsv(result: M2MatrixResult): string {
 const header = [
   'scenario_id',
   'scenario_label',
   'load_profile_id',
   'load_profile_label',
   'load_mode',
   'target_load_fraction',
   'arrival_rate_multiplier',
   'baseline_offered_load_mbps',
   'offered_load_mbps',
   'capacity_reference_mbps',
   'normalized_offered_load',
   'cell_id',
   'cell_label',
   'resource_blocks',
   'slot_duration_ms',
   'slot_count',
   'scheduler',
   'scheduler_label',
   'base_seed',
   'effective_traffic_seed',
   'sinr_population_fingerprint',
   'simulation_duration_seconds',
   'total_throughput_mbps',
   'jain_fairness',
   'delivery_ratio',
   'undelivered_ratio',
   'gbr_satisfaction_ratio',
   'worst_qos_p99_ms',
   'pdb_violation_ratio',
   'generated_packets',
   'delivered_packets',
   'queued_packets',
   'queued_bytes',
   'overdue_queued_packets',
   'oldest_queued_packet_age_ms',
 ]
 const rows = result.rows.map((row) => [
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
   row.cellId,
   row.cellLabel,
   row.resourceBlocks,
   row.slotDurationMs,
   row.slotCount,
   row.scheduler,
   row.schedulerLabel,
   row.baseSeed,
   row.effectiveTrafficSeed,
   row.sinrPopulationFingerprint,
   row.simulationDurationSeconds,
   row.totalThroughputMbps,
   row.jainFairness,
   row.deliveryRatio,
   row.undeliveredRatio,
   row.gbrSatisfactionRatio,
   row.worstQosP99Ms,
   row.pdbViolationRatio,
   row.generatedPackets,
   row.deliveredPackets,
   row.queuedPackets,
   row.queuedBytes,
   row.overdueQueuedPackets,
   row.oldestQueuedPacketAgeMs,
 ])
 return csvDocument([header, ...rows])
}
export function createM2MatrixJson(result: M2MatrixResult): string {
 return JSON.stringify(
   {
     schemaVersion: 3,
     experimentType: 'm2-five-cell-scheduler-matrix',
     generatedAt: new Date().toISOString(),
     ...result,
   },
   null,
   2,
 )
}
export function createM2BatchSummaryCsv(result: M2BatchMatrixResult): string {
 const header = [
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
   'cell_id',
   'cell_label',
   'resource_blocks',
   'slot_duration_ms',
   'scheduler',
   'scheduler_label',
   ...M2_BATCH_METRICS.flatMap(metricHeaders),
 ]
 const rows = result.summaryRows.map((row) => [
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
   row.cellId,
   row.cellLabel,
   row.resourceBlocks,
   row.slotDurationMs,
   row.scheduler,
   row.schedulerLabel,
   ...M2_BATCH_METRICS.flatMap((metric) => statCells(row.metrics[metric])),
 ])
 return csvDocument([header, ...rows])
}
export function createM2BatchPairwiseCsv(result: M2BatchMatrixResult): string {
 const header = [
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
 const rows = result.pairwiseRows.map((row) => [
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
 ])
 return csvDocument([header, ...rows])
}
export function createM2BatchJson(result: M2BatchMatrixResult): string {
 return JSON.stringify(
   {
     schemaVersion: 2,
     experimentType: 'm2-multi-seed-five-cell-load-matrix',
     generatedAt: new Date().toISOString(),
     ...result,
   },
   null,
   2,
 )
}
