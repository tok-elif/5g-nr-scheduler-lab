import { describe, expect, it } from 'vitest'
import { createM3ComparisonJson, createM3ResultCsv } from './m3Serialize'
import type { M2Result } from '../simulation/m2Types'
const result = {
 scheduler: 'qdf-pf',
 schedulerLabel: 'QDF-PF',
 baseSeed: 10,
 effectiveTrafficSeed: 20,
 generatedPackets: 0,
 deliveredPackets: 0,
 ueResults: [],
} as unknown as M2Result
describe('M3 serialization', () => {
 it('writes UTF-8 BOM CSV output', () => {
   expect(createM3ResultCsv(result).startsWith('\uFEFF')).toBe(true)
 })
 it('includes the generic M3 experiment type and scheduler metadata in JSON', () => {
   const parsed = JSON.parse(createM3ComparisonJson({
     cell: {} as never,
     config: {} as never,
     baseSeed: 10,
     results: [result],
   }))
   expect(parsed.experimentType).toBe('m3-scheduler-quick-single-seed-comparison')
   expect(parsed.schedulerMetadata[0].id).toBe('qdf-pf')
 })
})
