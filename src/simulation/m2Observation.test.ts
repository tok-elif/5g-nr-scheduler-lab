import { describe, expect, it } from 'vitest'
import { CELL_CONFIGS } from '../config/cells'
import { runM2 } from './m2'
import type { M2Observation } from './m2Observation'
import { makeTestUe, TEST_M2_CONFIG } from '../testing/m4Fixture'
const observe = (seed = 42) => {
 const events: M2Observation[] = []
 const result = runM2(
   CELL_CONFIGS[0],
   [makeTestUe(1, 10), makeTestUe(2, 12)],
   'round-robin',
   { ...TEST_M2_CONFIG, slotCount: 50 },
   seed,
   { observationSink: { observe: (event) => events.push(event) } },
 )
 return { events, result }
}
describe('M2 packet observation', () => {
 it('keeps result and fingerprints identical without a sink', () => {
   const input = [makeTestUe(1)]
   const baseline = runM2(CELL_CONFIGS[0], input, 'round-robin', TEST_M2_CONFIG, 1)
   expect(runM2(CELL_CONFIGS[0], input, 'round-robin', TEST_M2_CONFIG, 1, {})).toEqual(baseline)
   const withSink = runM2(CELL_CONFIGS[0], input, 'round-robin', TEST_M2_CONFIG, 1, {
     observationSink: { observe: () => undefined },
   })
   expect(withSink).toEqual(baseline)
 })
 it('publishes exact arrival and delivery counts', () => {
   const { events, result } = observe()
   expect(events.filter((event) => event.kind === 'packet-arrival')).toHaveLength(result.generatedPackets)
   expect(events.filter((event) => event.kind === 'packet-delivery')).toHaveLength(result.deliveredPackets)
 })
 it('publishes one UE-slot-end event per UE and slot', () => {
   expect(observe().events.filter((event) => event.kind === 'ue-slot-end')).toHaveLength(100)
 })
 it('uses valid UE, 5QI, packet size and delay semantics', () => {
   const { events } = observe()
   for (const event of events) {
     expect(event.ueIndex).toBeGreaterThanOrEqual(0)
     expect([1, 2]).toContain(event.fiveQi)
     if (event.kind === 'packet-delivery') {
       expect(event.delaySlots).toBeGreaterThanOrEqual(1)
       expect(event.delayMs).toBe(event.delaySlots * CELL_CONFIGS[0].slotDurationMs)
       expect(event.packetSizeMbits).toBeGreaterThan(0)
     }
   }
 })
 it('is deterministic for the same seed', () => {
   expect(observe(7).events).toEqual(observe(7).events)
 })
 it('changes event realization for a different seed', () => {
   expect(observe(7).events).not.toEqual(observe(8).events)
 })
 it('freezes event snapshots but not the sink', () => {
   const sink = { observe: (event: M2Observation) => expect(Object.isFrozen(event)).toBe(true) }
   runM2(CELL_CONFIGS[0], [makeTestUe(1)], 'round-robin', TEST_M2_CONFIG, 1, { observationSink: sink })
   expect(Object.isFrozen(sink)).toBe(false)
 })
 it('propagates sink exceptions', () => {
   expect(() => runM2(CELL_CONFIGS[0], [makeTestUe(1)], 'round-robin', {
     ...TEST_M2_CONFIG,
     trafficClasses: [{ fiveQi: 9, arrivalRatePacketsPerSecond: 1_000_000, packetSizeBytes: 100, gbrMbps: 0 }],
   }, 1, { observationSink: { observe: () => { throw new Error('sink failure') } } })).toThrow('sink failure')
 })
})
