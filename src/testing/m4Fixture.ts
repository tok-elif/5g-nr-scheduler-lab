import { CELL_CONFIGS } from '../config/cells'
import { createM4RuntimeConfig } from '../config/m4Config'
import type { M2Config } from '../simulation/m2Types'
import type { M4RunInput } from '../simulation/m4Types'
import type { UeResult } from '../simulation/types'
export const makeTestUe = (id: number, rate = 10): UeResult => ({
 id, sinrDb: rate, cqi: 10, cqiSpectralEfficiency: 2.7305, mcsIndex: 18,
 mcs: 'MCS 18', mcsTable: 'PDSCH Table 1', modulation: '64QAM',
 targetCodeRateX1024: 466, mcsSpectralEfficiency: 2.7305,
 spectralEfficiency: 2.7305, achievableRateMbps: rate,
})
export const TEST_M2_CONFIG: M2Config = {
 slotCount: 20,
 pfWindowSlots: 10,
 traceSlotLimit: 2,
 trafficSeedOffset: 100,
 trafficClasses: [
   { fiveQi: 1, arrivalRatePacketsPerSecond: 300, packetSizeBytes: 200, gbrMbps: 0.3 },
   { fiveQi: 2, arrivalRatePacketsPerSecond: 200, packetSizeBytes: 500, gbrMbps: 0.5 },
   { fiveQi: 6, arrivalRatePacketsPerSecond: 100, packetSizeBytes: 1200, gbrMbps: 0 },
   { fiveQi: 9, arrivalRatePacketsPerSecond: 80, packetSizeBytes: 1500, gbrMbps: 0 },
 ],
}
export const makeM4TestInput = (traceLimit = 3): M4RunInput => ({
 cell: structuredClone(CELL_CONFIGS[0]),
 ues: Array.from({ length: 6 }, (_, index) => makeTestUe(index + 1, 8 + index)),
 m2Config: structuredClone(TEST_M2_CONFIG),
 m4Config: createM4RuntimeConfig(6, { embb: 2, urllc: 2, mmtc: 2 }),
 baseSeed: 2026,
 resourceTraceSlotLimit: traceLimit,
})
