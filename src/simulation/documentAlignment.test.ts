import { describe, expect, it } from 'vitest'
import { CELL_CONFIGS } from '../config/cells'
import simulationConfig from '../config/simulation.json'
import { DEFAULT_SCENARIO, runM0 } from './m0'
import { runM2 } from './m2'
import type { M2Config } from './m2Types'
const TEST_M2_CONFIG: M2Config = {
 slotCount: 300,
 pfWindowSlots: 20,
 traceSlotLimit: 5,
 trafficSeedOffset: 1000,
 trafficClasses: [{
   fiveQi: 1,
   arrivalRatePacketsPerSecond: 500,
   packetSizeBytes: 100,
   gbrMbps: 0.1,
 }],
}
describe('main document alignment', () => {
 it('reports the sampled best-UE full-band upper bound explicitly', () => {
   const result = runM0(CELL_CONFIGS[0], { ...DEFAULT_SCENARIO, ueCount: 4 })
   expect(result.capacityDefinition).toBe('sampled-best-ue-full-band-rate')
   expect(result.sampledFullBandUpperBoundMbps).toBe(
     Math.max(...result.ues.map((ue) => ue.achievableRateMbps)),
   )
   expect(result.theoreticalCellCapacityMbps).toBe(result.sampledFullBandUpperBoundMbps)
 })
 it('records effective traffic seed and delivered-packet latency scope', () => {
   const m0 = runM0(CELL_CONFIGS[0], { ...DEFAULT_SCENARIO, ueCount: 2 })
   const result = runM2(CELL_CONFIGS[0], m0.ues, 'round-robin', TEST_M2_CONFIG, 2026)
   expect(result.baseSeed).toBe(2026)
   expect(result.trafficSeedOffset).toBe(1000)
   expect(result.effectiveTrafficSeed).toBe(3026)
   expect(result.latencyScope).toBe('delivered-packets-arrival-to-completion')
   expect(result.latencySamplePackets).toBe(result.deliveredPackets)
   expect(result.ueResults.every((ue) => ue.latencySamplePackets === ue.deliveredPackets)).toBe(true)
   expect(result.qosResults.every((qos) => qos.latencySamplePackets === qos.deliveredPackets)).toBe(true)
 })
 it('loads simulation-defining numerical parameters from configuration', () => {
   expect(simulationConfig.model.numericalEpsilon).toBeGreaterThan(0)
   expect(simulationConfig.model.initialAverageThroughputMbps).toBeGreaterThan(0)
   expect(simulationConfig.model.pfMetricMinimumThroughputMbps).toBeGreaterThan(0)
   expect(simulationConfig.model.defaultM1TraceSlotLimit).toBeGreaterThanOrEqual(0)
   expect(simulationConfig.model.defaultM2TraceSlotLimit).toBeGreaterThanOrEqual(0)
 })
})
