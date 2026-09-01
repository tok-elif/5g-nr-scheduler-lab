import { describe, expect, it } from 'vitest'
import { CELL_CONFIGS } from './cells'
import {
 DEFAULT_M2_LOAD_PROFILE_ID,
 M2_EXPERIMENT_SCENARIOS,
 M2_LOAD_PROFILES,
 createM2ScenarioConfig,
} from './m2Scenarios'
describe('M2 experiment scenarios and load profiles', () => {
 it('defines the document scenarios and fixed plus capacity-normalized load levels', () => {
   expect(M2_EXPERIMENT_SCENARIOS.map((item) => item.id)).toEqual(['sc1-same-qos', 'sc2-mixed-qos'])
   expect(M2_LOAD_PROFILES.map((item) => item.id)).toEqual(['light', 'medium', 'heavy', 'capacity-50', 'capacity-80', 'capacity-110'])
   expect(DEFAULT_M2_LOAD_PROFILE_ID).toBe('medium')
 })
 it('keeps equal wall-clock duration across numerologies', () => {
   for (const cell of CELL_CONFIGS) {
     const config = createM2ScenarioConfig('sc2-mixed-qos', cell, 1000)
     expect(config.slotCount * cell.slotDurationMs).toBeCloseTo(1000, 10)
   }
 })
 it('scales only packet arrival rates when the load level changes', () => {
   const cell = CELL_CONFIGS[0]
   if (!cell) throw new Error('Expected at least one cell configuration.')
   const light = createM2ScenarioConfig('sc2-mixed-qos', cell, 100, 'light')
   const medium = createM2ScenarioConfig('sc2-mixed-qos', cell, 100, 'medium')
   const heavy = createM2ScenarioConfig('sc2-mixed-qos', cell, 100, 'heavy')
   expect(light.trafficClasses[0]?.arrivalRatePacketsPerSecond).toBe(
     (medium.trafficClasses[0]?.arrivalRatePacketsPerSecond ?? 0) * 0.5,
   )
   expect(heavy.trafficClasses[0]?.arrivalRatePacketsPerSecond).toBe(
     (medium.trafficClasses[0]?.arrivalRatePacketsPerSecond ?? 0) * 2,
   )
   expect(light.trafficClasses[0]?.packetSizeBytes).toBe(medium.trafficClasses[0]?.packetSizeBytes)
   expect(heavy.trafficClasses[0]?.gbrMbps).toBe(medium.trafficClasses[0]?.gbrMbps)
 })
})
