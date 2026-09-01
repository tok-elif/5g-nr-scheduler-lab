import { describe, expect, it } from 'vitest'
import { runM4 } from '../simulation/m4'
import { makeM4TestInput } from '../testing/m4Fixture'
import { parseM4Result, serializeM4Result } from './m4Serialize'
const serializedResult = () => {
 const result = runM4(makeM4TestInput())
 return { result, serialized: serializeM4Result(result) }
}
describe('M4 JSON serialization and parser', () => {
 it('is deterministic and round-trips exactly', () => {
   const { result, serialized } = serializedResult()
   expect(serializeM4Result(result)).toBe(serialized)
   expect(parseM4Result(serialized)).toEqual(result)
 })
 it('preserves fingerprint, metrics, totals and trace-zero results', () => {
   const result = runM4(makeM4TestInput(0))
   const parsed = parseM4Result(serializeM4Result(result))
   expect(parsed.reproducibilityFingerprint).toBe(result.reproducibilityFingerprint)
   expect(parsed.metrics).toEqual(result.metrics)
   expect(parsed.cellResourceTotals).toEqual(result.cellResourceTotals)
   expect(parsed.resourceTrace).toEqual([])
 })
 it('does not add timestamp or request ID', () => {
   const { serialized } = serializedResult()
   expect(serialized).not.toContain('generatedAt')
   expect(serialized).not.toContain('requestId')
 })
 it.each([
   ['unknown schema', (value: any) => { value.schemaVersion = 2 }],
   ['missing metrics', (value: any) => { delete value.metrics }],
   ['invalid fingerprint', (value: any) => { value.reproducibilityFingerprint = 'bad' }],
   ['slice order', (value: any) => { value.metrics.slices.reverse() }],
   ['UE count', (value: any) => { value.mapping.entries.pop() }],
   ['assignment', (value: any) => { value.trafficAssignment[0].fiveQi = 9 }],
   ['conservation', (value: any) => { value.cellResourceTotals.totalAllocatedResourceBlocks += 1 }],
   ['ratio', (value: any) => { value.metrics.slices[0].packetDeliveryRatio = 2 }],
   ['percentiles', (value: any) => {
     value.metrics.slices[0].p50PacketDelayMs = 10
     value.metrics.slices[0].p95PacketDelayMs = 1
   }],
 ])('rejects %s corruption', (_, mutate) => {
   const value = JSON.parse(serializedResult().serialized)
   mutate(value)
   expect(() => parseM4Result(JSON.stringify(value))).toThrow()
 })
 it('rejects non-finite values before serialization', () => {
   const input = makeM4TestInput()
   const result = structuredClone(runM4(input))
   const mutableCell = result.metrics.cell as unknown as { aggregateThroughputMbps: number }
   mutableCell.aggregateThroughputMbps = Number.NaN
   expect(() => serializeM4Result(result)).toThrow('non-finite')
 })
 it('does not mutate/freeze caller result and deeply freezes parsed snapshots', () => {
   const mutable = structuredClone(runM4(makeM4TestInput()))
   const before = structuredClone(mutable)
   const serialized = serializeM4Result(mutable)
   expect(mutable).toEqual(before)
   expect(Object.isFrozen(mutable)).toBe(false)
   const parsed = parseM4Result(serialized)
   expect(Object.isFrozen(parsed)).toBe(true)
   expect(Object.isFrozen(parsed.metrics.slices[0])).toBe(true)
 })
})
