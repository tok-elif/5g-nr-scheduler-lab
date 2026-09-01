import { M4_CONFIG } from '../../config/m4Config'
import { resolveM4Scheduler } from '../../simulation/m4SchedulerResolver'
import type { M4Result, SliceId } from '../../simulation/m4Types'
const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })
export const formatNumber = (value: number | null, suffix = ''): string =>
 value === null || !Number.isFinite(value) ? '—' : `${number.format(value)}${suffix}`
export const formatPercent = (value: number | null): string =>
 value === null || !Number.isFinite(value) ? '—' : `%${number.format(value * 100)}`
export type M4StatusBadge = 'ok' | 'warn' | 'none'
export function createM4ViewModel(result: M4Result) {
 const metadata = new Map(M4_CONFIG.slices.map((slice) => [slice.id, slice]))
 const slices = result.metrics.slices.map((metric, index) => {
   const config = result.config.slices[index]
   const resource = result.sliceResourceTotals[index]
   const gbrStatus: M4StatusBadge = metric.gbrUeCount === 0
     ? 'none'
     : metric.gbrMeetingRatio === 1 ? 'ok' : 'warn'
   const violationStatus: M4StatusBadge = metric.deliveredPacketCount === 0
     ? 'none'
     : metric.delayViolationRatio === 0 ? 'ok' : 'warn'
   return Object.freeze({
     id: metric.sliceId,
     label: metadata.get(metric.sliceId)!.label,
     color: metadata.get(metric.sliceId)!.color,
     scheduler: resolveM4Scheduler(config.scheduler).label,
     ueCount: metric.ueCount,
     throughput: formatNumber(metric.aggregateThroughputMbps, ' Mbps'),
     throughputMbps: metric.aggregateThroughputMbps,
     delivery: formatPercent(metric.packetDeliveryRatio),
     deliveryRatio: metric.packetDeliveryRatio,
     p50: formatNumber(metric.p50PacketDelayMs, ' ms'),
     p95: formatNumber(metric.p95PacketDelayMs, ' ms'),
     p99: formatNumber(metric.p99PacketDelayMs, ' ms'),
     p50Ms: metric.p50PacketDelayMs,
     p95Ms: metric.p95PacketDelayMs,
     p99Ms: metric.p99PacketDelayMs,
     violation: formatPercent(metric.delayViolationRatio),
     violationStatus,
     gbr: formatPercent(metric.gbrMeetingRatio),
     gbrMeetingRatio: metric.gbrMeetingRatio,
     gbrStatus,
     fairness: formatNumber(metric.jainFairness),
     jainFairness: metric.jainFairness,
     resourceShare: formatPercent(metric.resourceAllocationShare),
     utilization: formatPercent(metric.schedulerUtilizationRatio),
     utilizationRatio: metric.schedulerUtilizationRatio,
     queue: formatNumber(metric.finalQueuedMbits, ' Mbit'),
     allocated: resource.allocatedResourceBlocks,
     used: resource.schedulerUsedResourceBlocks,
     unused: resource.schedulerUnusedResourceBlocks,
     guaranteed: resource.guaranteedResourceBlocks,
     ordinaryShared: resource.ordinarySharedResourceBlocks,
     redistributed: resource.redistributedResourceBlocks,
     borrowed: resource.borrowedResourceBlocks,
     lent: resource.lentResourceBlocks,
     latencyAvailable: metric.p50PacketDelayMs !== null,
   })
 })
 const cell = result.metrics.cell
 const trace = result.resourceTrace.map((slot) => Object.freeze({
   slotIndex: slot.slotIndex,
   unallocated: slot.totalUnallocatedResourceBlocks,
   conservation: slot.conservationSatisfied,
   slices: Object.freeze(slot.slices.map((slice) => Object.freeze({
     id: slice.sliceId,
     allocated: slice.allocatedResourceBlocks,
     used: slice.schedulerUsedResourceBlocks,
   }))),
 }))
 return Object.freeze({
   fingerprint: result.reproducibilityFingerprint,
   cell: Object.freeze({
     throughput: formatNumber(cell.aggregateThroughputMbps, ' Mbps'),
     delivery: formatPercent(cell.packetDeliveryRatio),
     p95: formatNumber(cell.p95PacketDelayMs, ' ms'),
     fairness: formatNumber(cell.jainFairness),
     utilization: formatPercent(cell.schedulerUtilizationRatio),
     queue: formatNumber(cell.finalQueuedMbits, ' Mbit'),
     unallocated: result.cellResourceTotals.totalUnallocatedResourceBlocks,
   }),
   slices: Object.freeze(slices),
   trace: Object.freeze(trace),
   exportFilename: `m4-result-${result.reproducibilityFingerprint}.json`,
 })
}
export type M4SliceViewModel = ReturnType<typeof createM4ViewModel>['slices'][number]
export const canonicalSliceLabel = (id: SliceId) => M4_CONFIG.slices.find((slice) => slice.id === id)!.label
