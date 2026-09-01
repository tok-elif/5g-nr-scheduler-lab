import { APPLICATION_METADATA } from '../config/application'
import { SCHEDULER_DESCRIPTORS } from '../schedulers/metadata'
import type { M2Config, M2Result } from '../simulation/m2Types'
import type { CellConfig } from '../simulation/types'
const UTF8_BOM = '\uFEFF'
function csvCell(value: string | number | boolean | null): string {
 if (value === null) return ''
 const text = String(value)
 return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
function csvRow(values: readonly (string | number | boolean | null)[]): string {
 return values.map(csvCell).join(',')
}
export function createM3ResultCsv(result: M2Result): string {
 const header = csvRow([
   'scheduler', 'base_seed', 'effective_traffic_seed',
   'traffic_fingerprint', 'ue_sinr_fingerprint',
   'capacity_reference_mbps', 'offered_load_mbps_total', 'normalized_offered_load',
   'ue_id', 'five_qi',
   'resource_type', 'priority_level', 'priority_level_source',
   'packet_delay_budget_ms', 'offered_load_mbps', 'gbr_mbps',
   'gbr_target_mbps', 'gbr_fulfillment_ratio',
   'throughput_mbps', 'gbr_satisfied', 'generated_packets',
   'delivered_packets', 'queued_packets', 'queued_bytes',
   'pdb_violation_ratio', 'overdue_queued_packets',
   'oldest_queued_packet_age_ms', 'delay_p50_ms', 'delay_p95_ms',
   'delay_p99_ms', 'delay_p99_status', 'latency_sample_packets',
 ])
 const rows = result.ueResults.map((ue) => csvRow([
   result.schedulerLabel,
   result.baseSeed,
   result.effectiveTrafficSeed,
   result.trafficFingerprint,
   result.ueSinrFingerprint,
   result.capacityReferenceMbps,
   result.offeredLoadMbps,
   result.normalizedOfferedLoad,
   ue.ueId,
   ue.fiveQi,
   ue.resourceType,
   ue.priorityLevel ?? null,
   '3GPP TS 23.501 Table 5.7.4-1',
   ue.packetDelayBudgetMs,
   ue.offeredLoadMbps,
   ue.gbrMbps,
   ue.gbrTargetMbps,
   ue.gbrFulfillmentRatio,
   ue.throughputMbps,
   ue.gbrSatisfied === null ? null : ue.gbrSatisfied,
   ue.generatedPackets,
   ue.deliveredPackets,
   ue.queuedPackets,
   ue.queuedBytes,
   ue.pdbViolationRatio,
   ue.overdueQueuedPackets,
   ue.oldestQueuedPacketAgeMs,
   ue.delayP50Ms,
   ue.delayP95Ms,
   ue.delayP99Ms,
   ue.delayP99Estimate.status,
   ue.latencySamplePackets,
 ]))
 return `${UTF8_BOM}${[header, ...rows].join('\n')}\n`
}
export function createM3ComparisonJson(input: {
 cell: CellConfig
 config: M2Config
 baseSeed: number
 results: M2Result[]
}): string {
 return JSON.stringify({
   schemaVersion: 2,
   experimentType: 'm3-scheduler-quick-single-seed-comparison',
   generatedAt: new Date().toISOString(),
   application: APPLICATION_METADATA,
   schedulerMetadata: SCHEDULER_DESCRIPTORS.filter((descriptor) =>
     input.results.some((result) => result.scheduler === descriptor.id)),
   notice: 'Bu çıktı hızlı tek-seed görünümüdür. Bilimsel sonuç için M3 çoklu-seed deney matrisini kullanın.',
   schedulerSet: input.results.map((result) => ({
     kind: result.scheduler,
     label: result.schedulerLabel,
   })),
   cell: input.cell,
   config: input.config,
   baseSeed: input.baseSeed,
   results: input.results,
 }, null, 2)
}
