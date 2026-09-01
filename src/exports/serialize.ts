import type { CellConfig, M0Result, M1BatchResult, M1CellMatrixResult, M1Config, M1Result, ScenarioConfig } from '../simulation/types'
import { APPLICATION_METADATA } from '../config/application'
import { createExperimentFingerprint } from '../config/reproducibility'
import type { M2Result } from '../simulation/m2Types'
const csvCell = (value: string | number): string => {
 const text = String(value)
 return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
const csvRow = (values: readonly (string | number)[]): string => values.map(csvCell).join(',')
export function createM0Csv(result: M0Result): string {
 const rows = [csvRow(['ue_id', 'sinr_db', 'cqi', 'mcs_index', 'mcs_table', 'modulation', 'target_code_rate_x1024', 'spectral_efficiency', 'achievable_rate_mbps'])]
 for (const ue of result.ues) {
   rows.push(csvRow([
     ue.id, ue.sinrDb, ue.cqi, ue.mcsIndex, ue.mcsTable, ue.modulation,
     ue.targetCodeRateX1024, ue.spectralEfficiency, ue.achievableRateMbps,
   ]))
 }
 return rows.join('\n')
}
export function createM0CellMatrixCsv(results: readonly M0Result[]): string {
 const rows = [csvRow([
   'cell_id', 'band_mhz', 'bandwidth_mhz', 'resource_blocks', 'scs_khz',
   'slot_duration_ms', 'ue_id', 'sinr_db', 'cqi', 'mcs_index', 'mcs_table', 'modulation',
   'spectral_efficiency', 'achievable_rate_mbps', 'average_ue_rate_mbps',
   'sampled_full_band_upper_bound_mbps', 'capacity_definition',
 ])]
 for (const result of results) {
   for (const ue of result.ues) {
     rows.push(csvRow([
       result.cell.id, result.cell.bandMHz, result.cell.bandwidthMHz,
       result.cell.resourceBlocks, result.cell.scsKHz, result.cell.slotDurationMs,
       ue.id, ue.sinrDb, ue.cqi, ue.mcsIndex, ue.mcsTable, ue.modulation,
       ue.spectralEfficiency, ue.achievableRateMbps, result.averageUeRateMbps,
       result.sampledFullBandUpperBoundMbps, result.capacityDefinition,
     ]))
   }
 }
 return rows.join('\n')
}
export function createM1Csv(result: M1Result): string {
 const rows = [csvRow(['scheduler', 'ue_id', 'sinr_db', 'achievable_rate_mbps', 'throughput_mbps', 'selected_slots', 'airtime_percent'])]
 for (const ue of result.ueResults) {
   rows.push(csvRow([
     result.schedulerLabel, ue.ueId, ue.sinrDb, ue.achievableRateMbps,
     ue.throughputMbps, ue.selectedSlots, ue.airtimePercent,
   ]))
 }
 return rows.join('\n')
}
export function createM2Csv(result: M2Result): string {
 const rows = [csvRow([
   'scheduler', 'base_seed', 'traffic_seed_offset', 'effective_traffic_seed',
   'traffic_fingerprint', 'ue_sinr_fingerprint', 'capacity_reference_mbps',
   'offered_load_mbps_total', 'normalized_offered_load',
   'gbr_ue_meeting_ratio', 'gbr_mean_fulfillment_ratio', 'aggregate_gbr_service_ratio',
   'latency_scope', 'ue_id', 'five_qi', 'qos_label', 'resource_type',
   'packet_delay_budget_ms', 'offered_load_mbps', 'gbr_mbps', 'gbr_target_mbps',
   'gbr_fulfillment_ratio', 'throughput_mbps',
   'gbr_satisfied', 'generated_packets', 'delivered_packets', 'queued_packets',
   'queued_mbits', 'queued_bytes', 'undelivered_ratio', 'latency_sample_packets',
   'pdb_violation_packets', 'pdb_violation_ratio', 'overdue_queued_packets',
   'oldest_queued_packet_age_ms', 'delay_p50_ms', 'delay_p95_ms', 'delay_p99_ms',
   'delay_p99_status', 'delay_p99_method', 'delay_p99_minimum_sample_count',
 ])]
 for (const ue of result.ueResults) {
   rows.push(csvRow([
     result.schedulerLabel, result.baseSeed, result.trafficSeedOffset,
     result.effectiveTrafficSeed, result.trafficFingerprint, result.ueSinrFingerprint,
     result.capacityReferenceMbps, result.offeredLoadMbps, result.normalizedOfferedLoad,
     result.gbrUeMeetingRatio ?? '', result.gbrMeanFulfillmentRatio ?? '',
     result.aggregateGbrServiceRatio ?? '',
     result.latencyScope, ue.ueId, ue.fiveQi, ue.qosLabel, ue.resourceType,
     ue.packetDelayBudgetMs, ue.offeredLoadMbps, ue.gbrMbps, ue.gbrTargetMbps ?? '',
     ue.gbrFulfillmentRatio ?? '', ue.throughputMbps,
     ue.gbrSatisfied === null ? '' : ue.gbrSatisfied ? 'true' : 'false',
     ue.generatedPackets, ue.deliveredPackets, ue.queuedPackets, ue.queuedMbits,
     ue.queuedBytes, ue.undeliveredRatio, ue.latencySamplePackets, ue.pdbViolationPackets,
     ue.pdbViolationRatio, ue.overdueQueuedPackets, ue.oldestQueuedPacketAgeMs,
     ue.delayP50Ms ?? '', ue.delayP95Ms ?? '', ue.delayP99Ms ?? '',
     ue.delayP99Estimate.status, ue.delayP99Estimate.method,
     ue.delayP99Estimate.minimumRequiredSampleCount,
   ]))
 }
 return rows.join('\n')
}
export function createBatchCsv(result: M1BatchResult): string {
 const rows = [csvRow([
   'scheduler', 'run_count', 'throughput_mean_mbps', 'throughput_std_mbps',
   'throughput_ci95_half_width_mbps', 'throughput_min_mbps', 'throughput_max_mbps',
   'jain_mean', 'jain_std', 'jain_ci95_half_width', 'jain_min', 'jain_max',
 ])]
 for (const item of result.schedulerResults) {
   rows.push(csvRow([
     item.schedulerLabel, item.runCount,
     item.throughputMbps.mean, item.throughputMbps.standardDeviation,
     item.throughputMbps.confidence95HalfWidth, item.throughputMbps.minimum,
     item.throughputMbps.maximum, item.jainFairness.mean,
     item.jainFairness.standardDeviation, item.jainFairness.confidence95HalfWidth,
     item.jainFairness.minimum, item.jainFairness.maximum,
   ]))
 }
 return rows.join('\n')
}
export function createPairwiseCsv(result: M1BatchResult): string {
 const rows = [csvRow([
   'baseline_scheduler', 'comparator_scheduler', 'run_count',
   'throughput_difference_mean_mbps', 'throughput_difference_std_mbps',
   'throughput_difference_ci95_half_width_mbps', 'jain_difference_mean',
   'jain_difference_std', 'jain_difference_ci95_half_width',
 ])]
 for (const item of result.pairwiseComparisons) {
   rows.push(csvRow([
     item.baselineSchedulerLabel, item.comparatorSchedulerLabel, item.runCount,
     item.throughputDifferenceMbps.mean, item.throughputDifferenceMbps.standardDeviation,
     item.throughputDifferenceMbps.confidence95HalfWidth,
     item.jainFairnessDifference.mean, item.jainFairnessDifference.standardDeviation,
     item.jainFairnessDifference.confidence95HalfWidth,
   ]))
 }
 return rows.join('\n')
}
export function createCellMatrixCsv(result: M1CellMatrixResult): string {
 const rows = [csvRow([
   'cell_id', 'band_mhz', 'bandwidth_mhz', 'resource_blocks', 'scs_khz',
   'slot_duration_ms', 'scheduler', 'run_count', 'throughput_mean_mbps',
   'throughput_std_mbps', 'throughput_ci95_half_width_mbps', 'jain_mean',
   'jain_std', 'jain_ci95_half_width',
 ])]
 for (const item of result.rows) {
   rows.push(csvRow([
     item.cell.id, item.cell.bandMHz, item.cell.bandwidthMHz,
     item.cell.resourceBlocks, item.cell.scsKHz, item.cell.slotDurationMs,
     item.schedulerLabel, item.runCount, item.throughputMbps.mean,
     item.throughputMbps.standardDeviation, item.throughputMbps.confidence95HalfWidth,
     item.jainFairness.mean, item.jainFairness.standardDeviation,
     item.jainFairness.confidence95HalfWidth,
   ]))
 }
 return rows.join('\n')
}
export function createCellMatrixPairwiseCsv(result: M1CellMatrixResult): string {
 const rows = [csvRow([
   'cell_id', 'band_mhz', 'bandwidth_mhz', 'baseline_scheduler',
   'comparator_scheduler', 'run_count', 'throughput_difference_mean_mbps',
   'throughput_difference_ci95_half_width_mbps', 'jain_difference_mean',
   'jain_difference_ci95_half_width',
 ])]
 for (const item of result.pairwiseRows) {
   rows.push(csvRow([
     item.cell.id, item.cell.bandMHz, item.cell.bandwidthMHz,
     item.baselineSchedulerLabel, item.comparatorSchedulerLabel, item.runCount,
     item.throughputDifferenceMbps.mean, item.throughputDifferenceMbps.confidence95HalfWidth,
     item.jainFairnessDifference.mean, item.jainFairnessDifference.confidence95HalfWidth,
   ]))
 }
 return rows.join('\n')
}
interface ExperimentExport {
 generatedAt: string
 cell: CellConfig
 scenario: ScenarioConfig
 m1Config: M1Config
 m0: M0Result
 m0CellMatrix: M0Result[]
 m1: M1Result[]
 multiSeed: M1BatchResult
 cellMatrix: M1CellMatrixResult
}
export function createExperimentJson(data: Omit<ExperimentExport, 'generatedAt'>): string {
 const experimentId = createExperimentFingerprint({
   cellId: data.cell.id,
   scenario: data.scenario,
   m1Config: data.m1Config,
   seedCount: data.multiSeed.seeds.length,
 })
 return JSON.stringify({
   generatedAt: new Date().toISOString(),
   application: APPLICATION_METADATA,
   experimentId,
   ...data,
 }, null, 2)
}
