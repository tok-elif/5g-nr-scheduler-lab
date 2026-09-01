import { describe, expect, it } from 'vitest'
import { CELL_CONFIGS } from '../config/cells'
import { runM2 } from './m2'
import type { M2Config } from './m2Types'
import type { UeResult } from './types'
const makeUe = (id: number, rate: number): UeResult => ({
 id,
 sinrDb: 0,
 cqi: 4,
 cqiSpectralEfficiency: 0.6016,
 mcsIndex: 4,
 mcs: 'MCS 4',
 mcsTable: 'PDSCH Table 1',
 modulation: 'QPSK',
 targetCodeRateX1024: 308,
 mcsSpectralEfficiency: 0.6016,
 spectralEfficiency: 0.6016,
 achievableRateMbps: rate,
})
const overloaded: M2Config = {
 slotCount: 1_000,
 pfWindowSlots: 50,
 traceSlotLimit: 0,
 trafficSeedOffset: 100,
 trafficClasses: [{
   fiveQi: 1,
   arrivalRatePacketsPerSecond: 2_000,
   packetSizeBytes: 1_500,
   gbrMbps: 0.3,
 }],
}
describe('M2 scientific queue and PDB metrics', () => {
 it('separates delivered-packet PDB violations from overdue queued packets', () => {
   const result = runM2(CELL_CONFIGS[0], [makeUe(1, 0.05)], 'round-robin', overloaded, 2026)
   const ue = result.ueResults[0]
   expect(ue.generatedPackets).toBe(ue.deliveredPackets + ue.queuedPackets)
   expect(ue.undeliveredRatio).toBeCloseTo(ue.queuedPackets / ue.generatedPackets, 12)
   expect(ue.pdbViolationRatio).toBe(
     ue.deliveredPackets > 0 ? ue.pdbViolationPackets / ue.deliveredPackets : 0,
   )
   expect(ue.overdueQueuedPackets).toBeGreaterThan(0)
   expect(ue.overdueQueuedPackets).toBeLessThanOrEqual(ue.queuedPackets)
   expect(ue.oldestQueuedPacketAgeMs).toBeGreaterThan(ue.packetDelayBudgetMs)
   expect(ue.queuedBytes).toBeGreaterThan(0)
 })
 it('conserves the new result-level queue metrics', () => {
   const result = runM2(
     CELL_CONFIGS[0],
     [makeUe(1, 0.05), makeUe(2, 0.08)],
     'proportional-fair',
     overloaded,
     77,
   )
   expect(result.queuedPackets).toBe(result.ueResults.reduce((sum, ue) => sum + ue.queuedPackets, 0))
   expect(result.overdueQueuedPackets).toBe(
     result.ueResults.reduce((sum, ue) => sum + ue.overdueQueuedPackets, 0),
   )
   expect(result.queuedBytes).toBeCloseTo(
     result.ueResults.reduce((sum, ue) => sum + ue.queuedBytes, 0),
     9,
   )
   expect(result.undeliveredRatio).toBeGreaterThanOrEqual(0)
   expect(result.undeliveredRatio).toBeLessThanOrEqual(1)
   expect(result.pdbViolationRatio).toBeGreaterThanOrEqual(0)
   expect(result.pdbViolationRatio).toBeLessThanOrEqual(1)
 })
})
