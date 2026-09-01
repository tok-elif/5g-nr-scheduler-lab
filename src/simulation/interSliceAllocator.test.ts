import { describe, expect, it } from 'vitest'
import { allocateInterSliceResourceBlocks } from './interSliceAllocator'
import type { InterSliceAllocatorInput, InterSliceSliceDemand } from './m4Types'
const DEFAULT_SLICES: readonly InterSliceSliceDemand[] = [
 { sliceId: 'embb', enabled: true, weight: 0.5, minimumShare: 0.3, demandResourceBlocks: 100 },
 { sliceId: 'urllc', enabled: true, weight: 0.3, minimumShare: 0.3, demandResourceBlocks: 100 },
 { sliceId: 'mmtc', enabled: true, weight: 0.2, minimumShare: 0.1, demandResourceBlocks: 100 }, ]
function input(overrides: Partial<InterSliceAllocatorInput> = {}): InterSliceAllocatorInput {
 return {
   totalResourceBlocks: 20,
   slotIndex: 0,
   policy: 'static-weighted',
   redistributionEnabled: true,
   slices: DEFAULT_SLICES.map((slice) => ({ ...slice })),
   ...overrides,
 }
}
function assertCoreInvariants(request: InterSliceAllocatorInput): void {
 const result = allocateInterSliceResourceBlocks(request)
 expect(result.totalAllocatedResourceBlocks + result.totalUnallocatedResourceBlocks)
   .toBe(result.totalResourceBlocks)
 expect(result.ordinarySharedAllocatedResourceBlocks + result.ordinarySharedUnallocatedResourceBlocks)
   .toBe(result.ordinarySharedPoolResourceBlocks)
 expect(result.redistributedGuaranteeResourceBlocks
   + result.unusedRedistributionRemainderResourceBlocks)
   .toBe(result.unusedGuaranteePoolResourceBlocks)
 expect(result.conservationSatisfied).toBe(true)
 const borrowed = result.slices.reduce((sum, slice) => sum + slice.borrowedResourceBlocks, 0)
 const lent = result.slices.reduce((sum, slice) => sum + slice.lentResourceBlocks, 0)
 const transfers = result.transfers.reduce((sum, transfer) => sum + transfer.resourceBlocks, 0)
 expect(borrowed).toBe(lent)
 expect(borrowed).toBe(transfers)
 expect(transfers).toBe(result.redistributedGuaranteeResourceBlocks)
 for (const slice of result.slices) {
   expect(slice.allocatedResourceBlocks).toBe(
     slice.guaranteedResourceBlocks
       + slice.ordinarySharedResourceBlocks
       + slice.redistributedResourceBlocks,
   )
   expect(slice.allocatedResourceBlocks).toBeLessThanOrEqual(slice.requestedResourceBlocks)
   for (const value of Object.values(slice).filter((item) => typeof item === 'number')) {
     expect(Number.isInteger(value)).toBe(true)
     expect(value).toBeGreaterThanOrEqual(0)
   }
 }
}
describe('static weighted inter-slice allocator', () => {
 it('allocates normal three-slice demand with integer demand caps', () => {
   const result = allocateInterSliceResourceBlocks(input())
   expect(result.slices.map((slice) => slice.sliceId)).toEqual(['embb', 'urllc', 'mmtc'])
   expect(result.totalAllocatedResourceBlocks).toBe(20)
   expect(result.insufficientResources).toBe(true)
   assertCoreInvariants(input())
 })
 it('handles zero demand and low total demand without over-allocation', () => {
   const slices = DEFAULT_SLICES.map((slice, index) => ({
     ...slice,
     demandResourceBlocks: [0, 2, 1][index],
   }))
   const result = allocateInterSliceResourceBlocks(input({ slices }))
   expect(result.totalAllocatedResourceBlocks).toBe(3)
   expect(result.totalUnallocatedResourceBlocks).toBe(17)
   expect(result.insufficientResources).toBe(false)
   assertCoreInvariants(input({ slices }))
 })
 it('supports one enabled slice and disabled zero-demand slices', () => {
   const slices: readonly InterSliceSliceDemand[] = [
     { ...DEFAULT_SLICES[0], demandResourceBlocks: 50 },
     { ...DEFAULT_SLICES[1], enabled: false, weight: 0, minimumShare: 0, demandResourceBlocks: 0 },
     { ...DEFAULT_SLICES[2], enabled: false, weight: 0, minimumShare: 0, demandResourceBlocks: 0 },
   ]
   const result = allocateInterSliceResourceBlocks(input({ slices }))
   expect(result.slices[0].allocatedResourceBlocks).toBe(20)
   expect(result.slices.slice(1).every((slice) => slice.allocatedResourceBlocks === 0)).toBe(true)
 })
 it('handles the one-RB scarce case deterministically', () => {
   const request = input({ totalResourceBlocks: 1 })
   const first = allocateInterSliceResourceBlocks(request)
   expect(first.totalAllocatedResourceBlocks).toBe(1)
   expect(first).toEqual(allocateInterSliceResourceBlocks(request))
   assertCoreInvariants(request)
 })
 it('distributes the ordinary shared pool even when redistribution is disabled', () => {
   const slices = DEFAULT_SLICES.map((slice) => ({ ...slice, minimumShare: 0.1 }))
   const result = allocateInterSliceResourceBlocks(input({ slices, redistributionEnabled: false }))
   expect(result.ordinarySharedPoolResourceBlocks).toBe(14)
   expect(result.ordinarySharedAllocatedResourceBlocks).toBe(14)
   expect(result.redistributedGuaranteeResourceBlocks).toBe(0)
 })
 it('does not report ordinary shared allocation as borrowed, lent or transfer', () => {
   const slices = DEFAULT_SLICES.map((slice) => ({ ...slice, minimumShare: 0 }))
   const result = allocateInterSliceResourceBlocks(input({ slices }))
   expect(result.ordinarySharedAllocatedResourceBlocks).toBe(20)
   expect(result.transfers).toEqual([])
   expect(result.slices.every((slice) =>
     slice.borrowedResourceBlocks === 0
     && slice.lentResourceBlocks === 0
     && slice.redistributedResourceBlocks === 0)).toBe(true)
 })
 it('leaves unused guarantees unallocated when redistribution is disabled', () => {
   const slices = DEFAULT_SLICES.map((slice, index) => ({
     ...slice,
     demandResourceBlocks: index === 0 ? 0 : 100,
   }))
   const result = allocateInterSliceResourceBlocks(input({ slices, redistributionEnabled: false }))
   expect(result.unusedGuaranteePoolResourceBlocks).toBeGreaterThan(0)
   expect(result.redistributedGuaranteeResourceBlocks).toBe(0)
   expect(result.unusedRedistributionRemainderResourceBlocks)
     .toBe(result.unusedGuaranteePoolResourceBlocks)
   expect(result.transfers).toEqual([])
 })
 it('redistributes only unused guarantees and balances transfer telemetry', () => {
   const slices = DEFAULT_SLICES.map((slice, index) => ({
     ...slice,
     demandResourceBlocks: index === 0 ? 0 : 100,
   }))
   const result = allocateInterSliceResourceBlocks(input({ slices, redistributionEnabled: true }))
   const borrowed = result.slices.reduce((sum, slice) => sum + slice.borrowedResourceBlocks, 0)
   const lent = result.slices.reduce((sum, slice) => sum + slice.lentResourceBlocks, 0)
   const transferred = result.transfers.reduce((sum, transfer) => sum + transfer.resourceBlocks, 0)
   expect(result.redistributedGuaranteeResourceBlocks).toBeGreaterThan(0)
   expect(borrowed).toBe(result.redistributedGuaranteeResourceBlocks)
   expect(lent).toBe(borrowed)
   expect(transferred).toBe(borrowed)
   expect(result.transfers.filter((transfer) => transfer.fromSliceId === 'embb')
     .reduce((sum, transfer) => sum + transfer.resourceBlocks, 0))
     .toBeLessThanOrEqual(result.slices[0].roundedGuaranteeQuotaResourceBlocks)
 })
 it('produces identical allocations on/off when every guarantee is used', () => {
   const enabled = allocateInterSliceResourceBlocks(input({ redistributionEnabled: true }))
   const disabled = allocateInterSliceResourceBlocks(input({ redistributionEnabled: false }))
   expect(enabled.slices).toEqual(disabled.slices)
   expect(enabled.transfers).toEqual(disabled.transfers)
 })
 it('limits on/off differences to unused guarantee redistribution', () => {
   const slices = DEFAULT_SLICES.map((slice, index) => ({
     ...slice,
     demandResourceBlocks: index === 2 ? 0 : 100,
   }))
   const on = allocateInterSliceResourceBlocks(input({ slices, redistributionEnabled: true }))
   const off = allocateInterSliceResourceBlocks(input({ slices, redistributionEnabled: false }))
   expect(on.ordinarySharedAllocatedResourceBlocks).toBe(off.ordinarySharedAllocatedResourceBlocks)
   expect(on.slices.map((slice) => slice.guaranteedResourceBlocks))
     .toEqual(off.slices.map((slice) => slice.guaranteedResourceBlocks))
   expect(on.totalAllocatedResourceBlocks - off.totalAllocatedResourceBlocks)
     .toBe(on.redistributedGuaranteeResourceBlocks)
 })
 it('rounds fractional guarantees without exceeding cell RBs', () => {
   const result = allocateInterSliceResourceBlocks(input({ totalResourceBlocks: 7 }))
   const quota = result.guaranteeDecisions
     .reduce((sum, decision) => sum + decision.roundedQuotaResourceBlocks, 0)
   expect(quota).toBeLessThanOrEqual(7)
   expect(result.guaranteeDecisions.every((decision) =>
     Number.isInteger(decision.roundedQuotaResourceBlocks))).toBe(true)
 })
 it('rotates equal-remainder tie priority by slot and preserves canonical output order', () => {
   const slices = DEFAULT_SLICES.map((slice) => ({ ...slice, minimumShare: 1 / 3 }))
   const slot0 = allocateInterSliceResourceBlocks(input({ totalResourceBlocks: 2, slotIndex: 0, slices }))
   const slot1 = allocateInterSliceResourceBlocks(input({ totalResourceBlocks: 2, slotIndex: 1, slices }))
   expect(slot0.guaranteeDecisions.map((item) => item.roundedQuotaResourceBlocks)).toEqual([1, 1, 0])
   expect(slot1.guaranteeDecisions.map((item) => item.roundedQuotaResourceBlocks)).toEqual([0, 1, 1])
   expect(slot0.slices.map((slice) => slice.sliceId)).toEqual(['embb', 'urllc', 'mmtc'])
   expect(slot1).toEqual(allocateInterSliceResourceBlocks(input({
     totalResourceBlocks: 2,
     slotIndex: 1,
     slices,
   })))
 })
 it('does not mutate caller input and returns immutable results', () => {
   const request = input()
   const snapshot = structuredClone(request)
   const result = allocateInterSliceResourceBlocks(request)
   expect(request).toEqual(snapshot)
   expect(Object.isFrozen(result)).toBe(true)
   expect(Object.isFrozen(result.slices)).toBe(true)
   expect(result.slices.every(Object.isFrozen)).toBe(true)
   expect(Object.isFrozen(result.transfers)).toBe(true)
   expect(Object.isFrozen(result.guaranteeDecisions)).toBe(true)
 })
 it('rejects invalid cell, slot and policy fields', () => {
   expect(() => allocateInterSliceResourceBlocks(input({ totalResourceBlocks: 0 }))).toThrow(/pozitif/)
   expect(() => allocateInterSliceResourceBlocks(input({ totalResourceBlocks: 1.5 }))).toThrow(/tam sayı/)
   expect(() => allocateInterSliceResourceBlocks(input({ slotIndex: -1 }))).toThrow(/slotIndex/)
   const invalidPolicy = input()
   Reflect.set(invalidPolicy, 'policy', 'dynamic')
   expect(() => allocateInterSliceResourceBlocks(invalidPolicy)).toThrow(/policy/)
 })
 it('rejects invalid demand, weight and minimum share', () => {
   const negativeDemand = DEFAULT_SLICES.map((slice) => ({ ...slice }))
   negativeDemand[0].demandResourceBlocks = -1
   expect(() => allocateInterSliceResourceBlocks(input({ slices: negativeDemand }))).toThrow(/talebi/)
   negativeDemand[0].demandResourceBlocks = 1.5
   expect(() => allocateInterSliceResourceBlocks(input({ slices: negativeDemand }))).toThrow(/talebi/)
   const weight = DEFAULT_SLICES.map((slice) => ({ ...slice }))
   weight[0].weight = Number.POSITIVE_INFINITY
   expect(() => allocateInterSliceResourceBlocks(input({ slices: weight }))).toThrow(/ağırlığı/)
   weight[0].weight = -1
   expect(() => allocateInterSliceResourceBlocks(input({ slices: weight }))).toThrow(/ağırlığı/)
   const share = DEFAULT_SLICES.map((slice) => ({ ...slice }))
   share[0].minimumShare = 1.1
   expect(() => allocateInterSliceResourceBlocks(input({ slices: share }))).toThrow(/minimum payı/)
 })
 it('rejects malformed slice composition and disabled positive demand', () => {
   expect(() => allocateInterSliceResourceBlocks(input({ slices: DEFAULT_SLICES.slice(0, 2) })))
     .toThrow(/tam olarak üç/)
   const duplicate = DEFAULT_SLICES.map((slice) => ({ ...slice }))
   duplicate[1].sliceId = 'embb'
   expect(() => allocateInterSliceResourceBlocks(input({ slices: duplicate }))).toThrow(/canonical|Duplicate/)
   const reordered = [DEFAULT_SLICES[1], DEFAULT_SLICES[0], DEFAULT_SLICES[2]]
   expect(() => allocateInterSliceResourceBlocks(input({ slices: reordered }))).toThrow(/canonical/)
   const disabled = DEFAULT_SLICES.map((slice) => ({ ...slice }))
   disabled[0].enabled = false
   expect(() => allocateInterSliceResourceBlocks(input({ slices: disabled }))).toThrow(/Disabled/)
 })
 it('rejects zero enabled weights and excessive enabled minimum shares', () => {
   const weights = DEFAULT_SLICES.map((slice) => ({ ...slice, weight: 0 }))
   expect(() => allocateInterSliceResourceBlocks(input({ slices: weights }))).toThrow(/ağırlıkları/)
   const shares = DEFAULT_SLICES.map((slice) => ({ ...slice, minimumShare: 0.4 }))
   expect(() => allocateInterSliceResourceBlocks(input({ slices: shares }))).toThrow(/toplamı/)
 })
 it('satisfies conservation over a demand, RB, redistribution and slot matrix', () => {
   for (const totalResourceBlocks of [1, 2, 5, 20]) {
     for (const embb of [0, 1, 7, 25]) {
       for (const urllc of [0, 2, 9]) {
         for (const mmtc of [0, 3, 11]) {
           for (const redistributionEnabled of [false, true]) {
             for (const slotIndex of [0, 1, 2, 7]) {
               const demands = [embb, urllc, mmtc]
               if (demands.every((demand) => demand === 0)) continue
               const slices = DEFAULT_SLICES.map((slice, index) => ({
                 ...slice,
                 demandResourceBlocks: demands[index],
               }))
               assertCoreInvariants(input({
                 totalResourceBlocks,
                 slotIndex,
                 redistributionEnabled,
                 slices,
               }))
             }
           }
         }
       }
     }
   }
 })
})
