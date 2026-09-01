import { describe, expect, it } from 'vitest'
import { runM2Matrix } from '../simulation/m2Matrix'
import { runM2BatchMatrix } from '../simulation/m2BatchMatrix'
import {
 createM2BatchJson,
 createM2BatchPairwiseCsv,
 createM2BatchSummaryCsv,
 createM2MatrixCsv,
 createM2MatrixJson,
} from './m2MatrixSerialize'
const singleRequest = {
 scenarioId: 'sc2-mixed-qos',
 loadProfileId: 'capacity-80',
 durationMs: 10,
 ueCount: 4,
 baseSeed: 2026,
}
const batchRequest = { ...singleRequest, seedCount: 2, seedStep: 1 }
describe('M2 matrix serialization', () => {
 it('serializes a single matrix with capacity-load and queue-censoring metadata', () => {
   const result = runM2Matrix(singleRequest)
   const csv = createM2MatrixCsv(result)
   expect(csv.startsWith('\uFEFF')).toBe(true)
   expect(csv).toContain('normalized_offered_load')
   expect(csv).toContain('pdb_violation_ratio')
   expect(csv).toContain('overdue_queued_packets')
   expect(csv).toContain('oldest_queued_packet_age_ms')
   expect(csv).toContain('queued_bytes')
   expect(csv).toContain('undelivered_ratio')
   const parsed = JSON.parse(createM2MatrixJson(result))
   expect(parsed.schemaVersion).toBe(3)
   expect(parsed.rows).toHaveLength(result.rows.length)
 })
 it('serializes multi-seed summaries, pairwise differences and full JSON', () => {
   const result = runM2BatchMatrix(batchRequest)
   const summaryCsv = createM2BatchSummaryCsv(result)
   const pairwiseCsv = createM2BatchPairwiseCsv(result)
   expect(summaryCsv.startsWith('\uFEFF')).toBe(true)
   expect(pairwiseCsv.startsWith('\uFEFF')).toBe(true)
   expect(summaryCsv).toContain('pdbViolationRatio_ci95_lower')
   expect(summaryCsv).toContain('queuedBytes_ci95_upper')
   expect(pairwiseCsv).toContain('scheduler_a')
   expect(pairwiseCsv).toContain('scheduler_b')
   const parsed = JSON.parse(createM2BatchJson(result))
   expect(parsed.schemaVersion).toBe(2)
   expect(parsed.seeds).toEqual([2026, 2027])
   expect(parsed.summaryRows).toHaveLength(result.summaryRows.length)
   expect(parsed.pairwiseRows).toHaveLength(result.pairwiseRows.length)
 })
})
