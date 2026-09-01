import { describe, expect, it } from 'vitest'
import { DEFAULT_M2_CONFIG } from './m2'
import { createM3ScenarioDefinitions } from './m3Experiment'
describe('M3 scientific scenario definitions', () => {
 it('uses the documented SC-1 and SC-2 traffic classes', () => {
   const scenarios = createM3ScenarioDefinitions(DEFAULT_M2_CONFIG)
   expect(scenarios.map((scenario) => scenario.kind)).toEqual([
     'sc1-same-qos',
     'sc2-mixed-qos',
   ])
   expect(scenarios[0]?.config.trafficClasses.map((traffic) => traffic.fiveQi)).toEqual([9])
   expect(scenarios[1]?.config.trafficClasses.map((traffic) => traffic.fiveQi)).toEqual([1, 2, 6, 9])
 })
 it('preserves runtime settings while disabling trace output for the matrix', () => {
   const custom = {
     ...DEFAULT_M2_CONFIG,
     slotCount: 321,
     pfWindowSlots: 77,
     traceSlotLimit: 12,
   }
   const scenarios = createM3ScenarioDefinitions(custom)
   expect(scenarios.every((scenario) => scenario.config.slotCount === 321)).toBe(true)
   expect(scenarios.every((scenario) => scenario.config.pfWindowSlots === 77)).toBe(true)
   expect(scenarios.every((scenario) => scenario.config.traceSlotLimit === 0)).toBe(true)
 })
})
