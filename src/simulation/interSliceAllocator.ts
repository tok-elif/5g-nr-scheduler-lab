import {
 M4_SLICE_IDS,
 type IntegerGuaranteeDecision,
 type InterSliceAllocationResult,
 type InterSliceAllocatorInput,
 type InterSliceSliceAllocation,
 type InterSliceSliceDemand,
 type InterSliceTransfer,
 type SliceId,
} from './m4Types'
const EPSILON = 1e-12
function canonicalIndex(sliceId: SliceId): number {
 return M4_SLICE_IDS.indexOf(sliceId)
}
function rotatedRank(sliceId: SliceId, slotIndex: number): number {
 return (canonicalIndex(sliceId) - (slotIndex % M4_SLICE_IDS.length) + M4_SLICE_IDS.length)
   % M4_SLICE_IDS.length
}
function assertNonNegativeInteger(value: number, label: string): void {
 if (!Number.isSafeInteger(value) || value < 0) {
   throw new Error(`${label} güvenli, negatif olmayan tam sayı olmalıdır.`)
 }
}
function validateInput(input: InterSliceAllocatorInput): readonly InterSliceSliceDemand[] {
 if (!Number.isSafeInteger(input.totalResourceBlocks) || input.totalResourceBlocks <= 0) {
   throw new Error('totalResourceBlocks pozitif güvenli tam sayı olmalıdır.')
 }
 assertNonNegativeInteger(input.slotIndex, 'slotIndex')
 if (input.policy !== 'static-weighted') throw new Error(`Desteklenmeyen inter-slice policy: ${input.policy}`)
 if (typeof input.redistributionEnabled !== 'boolean') throw new Error('redistributionEnabled boolean olmalıdır.')
 if (!Array.isArray(input.slices) || input.slices.length !== M4_SLICE_IDS.length) {
   throw new Error('Allocator tam olarak üç canonical slice gerektirir.')
 }
 const ids = new Set<string>()
 input.slices.forEach((slice, index) => {
   if (slice.sliceId !== M4_SLICE_IDS[index]) {
     throw new Error(`Allocator slice sırası canonical olmalıdır: ${M4_SLICE_IDS.join(', ')}`)
   }
   if (ids.has(slice.sliceId)) throw new Error(`Duplicate allocator slice: ${slice.sliceId}`)
   ids.add(slice.sliceId)
   if (typeof slice.enabled !== 'boolean') throw new Error(`${slice.sliceId} enabled boolean olmalıdır.`)
   if (!Number.isFinite(slice.weight) || slice.weight < 0) {
     throw new Error(`${slice.sliceId} ağırlığı sonlu ve negatif olmayan sayı olmalıdır.`)
   }
   if (!Number.isFinite(slice.minimumShare) || slice.minimumShare < 0 || slice.minimumShare > 1) {
     throw new Error(`${slice.sliceId} minimum payı 0 ile 1 arasında olmalıdır.`)
   }
   assertNonNegativeInteger(slice.demandResourceBlocks, `${slice.sliceId} talebi`)
   if (!slice.enabled && slice.demandResourceBlocks > 0) {
     throw new Error(`Disabled ${slice.sliceId} slice pozitif talep içeremez.`)
   }
 })
 const enabled = input.slices.filter((slice) => slice.enabled)
 if (enabled.length === 0) throw new Error('En az bir allocator slice enabled olmalıdır.')
 if (enabled.every((slice) => slice.weight === 0)) {
   throw new Error('Tüm enabled slice ağırlıkları aynı anda sıfır olamaz.')
 }
 if (enabled.reduce((sum, slice) => sum + slice.minimumShare, 0) > 1 + EPSILON) {
   throw new Error('Enabled slice minimum pay toplamı 1’i aşamaz.')
 }
 return input.slices
}
function calculateGuarantees(
 totalResourceBlocks: number,
 slotIndex: number,
 slices: readonly InterSliceSliceDemand[],
): readonly IntegerGuaranteeDecision[] {
 const raw = slices.map((slice) => {
   const exact = slice.enabled ? slice.minimumShare * totalResourceBlocks : 0
   const floor = Math.floor(exact + EPSILON)
   return {
     sliceId: slice.sliceId,
     exactQuotaResourceBlocks: exact,
     floorQuotaResourceBlocks: floor,
     remainder: exact - floor,
     roundedQuotaResourceBlocks: floor,
   }
 })
 const exactTotal = raw.reduce((sum, decision) => sum + decision.exactQuotaResourceBlocks, 0)
 const target = Math.min(totalResourceBlocks, Math.round(exactTotal))
 let extras = target - raw.reduce((sum, decision) => sum + decision.floorQuotaResourceBlocks, 0)
 const priority = [...raw].sort((left, right) =>
   right.remainder - left.remainder || rotatedRank(left.sliceId, slotIndex) - rotatedRank(right.sliceId, slotIndex))
 const rounded = new Map<SliceId, number>(raw.map((decision) => [
   decision.sliceId,
   decision.floorQuotaResourceBlocks,
 ]))
 for (const decision of priority) {
   if (extras <= 0 || decision.remainder <= EPSILON) break
   rounded.set(decision.sliceId, decision.floorQuotaResourceBlocks + 1)
   extras -= 1
 }
 return Object.freeze(raw.map((decision) => Object.freeze({
   ...decision,
   roundedQuotaResourceBlocks: rounded.get(decision.sliceId) ?? decision.floorQuotaResourceBlocks,
 })))
}
interface WeightedCandidate {
 readonly sliceId: SliceId
 readonly weight: number
 readonly capacity: number
}
function allocateWeighted(
 available: number,
 candidates: readonly WeightedCandidate[],
 slotIndex: number,
): Readonly<Record<SliceId, number>> {
 const allocation: Record<SliceId, number> = { embb: 0, urllc: 0, mmtc: 0 }
 let remaining = available
 while (remaining > 0) {
   const active = candidates.filter((candidate) => allocation[candidate.sliceId] < candidate.capacity)
   const weightTotal = active.reduce((sum, candidate) => sum + candidate.weight, 0)
   if (active.length === 0 || weightTotal <= 0) break
   const roundAvailable = remaining
   const decisions = active.map((candidate) => {
     const exact = roundAvailable * candidate.weight / weightTotal
     const capacity = candidate.capacity - allocation[candidate.sliceId]
     const floor = Math.min(capacity, Math.floor(exact))
     return { ...candidate, exact, floor, remainder: exact - Math.floor(exact) }
   })
   let progress = 0
   for (const decision of decisions) {
     allocation[decision.sliceId] += decision.floor
     remaining -= decision.floor
     progress += decision.floor
   }
   const priority = decisions
     .filter((decision) => allocation[decision.sliceId] < decision.capacity)
     .sort((left, right) =>
       right.remainder - left.remainder
       || rotatedRank(left.sliceId, slotIndex) - rotatedRank(right.sliceId, slotIndex))
   for (const decision of priority) {
     if (remaining <= 0) break
     allocation[decision.sliceId] += 1
     remaining -= 1
     progress += 1
   }
   if (progress === 0) break
 }
 return Object.freeze(allocation)
}
function createTransfers(
 slices: readonly InterSliceSliceDemand[],
 unusedGuarantees: Readonly<Record<SliceId, number>>,
 redistributed: Readonly<Record<SliceId, number>>,
 slotIndex: number,
): readonly InterSliceTransfer[] {
 const donors = slices
   .filter((slice) => unusedGuarantees[slice.sliceId] > 0)
   .map((slice) => ({ sliceId: slice.sliceId, remaining: unusedGuarantees[slice.sliceId] }))
   .sort((left, right) => rotatedRank(left.sliceId, slotIndex) - rotatedRank(right.sliceId, slotIndex))
 const receivers = slices
   .filter((slice) => redistributed[slice.sliceId] > 0)
   .map((slice) => ({ sliceId: slice.sliceId, remaining: redistributed[slice.sliceId] }))
   .sort((left, right) => rotatedRank(left.sliceId, slotIndex) - rotatedRank(right.sliceId, slotIndex))
 const transfers: InterSliceTransfer[] = []
 for (const donor of donors) {
   for (const receiver of receivers) {
     if (donor.remaining === 0) break
     if (receiver.remaining === 0) continue
     const resourceBlocks = Math.min(donor.remaining, receiver.remaining)
     transfers.push(Object.freeze({
       fromSliceId: donor.sliceId,
       toSliceId: receiver.sliceId,
       resourceBlocks,
     }))
     donor.remaining -= resourceBlocks
     receiver.remaining -= resourceBlocks
   }
 }
 return Object.freeze(transfers)
}
export function allocateInterSliceResourceBlocks(
 input: InterSliceAllocatorInput,
): InterSliceAllocationResult {
 const slices = validateInput(input)
 const guarantees = calculateGuarantees(input.totalResourceBlocks, input.slotIndex, slices)
 const quotas: Record<SliceId, number> = { embb: 0, urllc: 0, mmtc: 0 }
 const guaranteed: Record<SliceId, number> = { embb: 0, urllc: 0, mmtc: 0 }
 const unused: Record<SliceId, number> = { embb: 0, urllc: 0, mmtc: 0 }
 const unmetAfterGuarantee: Record<SliceId, number> = { embb: 0, urllc: 0, mmtc: 0 }
 for (const decision of guarantees) quotas[decision.sliceId] = decision.roundedQuotaResourceBlocks
 for (const slice of slices) {
   guaranteed[slice.sliceId] = Math.min(quotas[slice.sliceId], slice.demandResourceBlocks)
   unused[slice.sliceId] = quotas[slice.sliceId] - guaranteed[slice.sliceId]
   unmetAfterGuarantee[slice.sliceId] = slice.demandResourceBlocks - guaranteed[slice.sliceId]
 }
 const ordinaryPool = input.totalResourceBlocks
   - M4_SLICE_IDS.reduce((sum, sliceId) => sum + quotas[sliceId], 0)
 const ordinary = allocateWeighted(
   ordinaryPool,
   slices.map((slice) => ({
     sliceId: slice.sliceId,
     weight: slice.weight,
     capacity: unmetAfterGuarantee[slice.sliceId],
   })),
   input.slotIndex,
 )
 const unmetAfterOrdinary: Record<SliceId, number> = { embb: 0, urllc: 0, mmtc: 0 }
 for (const slice of slices) {
   unmetAfterOrdinary[slice.sliceId] = unmetAfterGuarantee[slice.sliceId] - ordinary[slice.sliceId]
 }
 const unusedGuaranteePool = M4_SLICE_IDS.reduce((sum, sliceId) => sum + unused[sliceId], 0)
 const redistributed = input.redistributionEnabled
   ? allocateWeighted(
       unusedGuaranteePool,
       slices.map((slice) => ({
         sliceId: slice.sliceId,
         weight: slice.weight,
         capacity: unmetAfterOrdinary[slice.sliceId],
       })),
       input.slotIndex,
     )
   : Object.freeze<Record<SliceId, number>>({ embb: 0, urllc: 0, mmtc: 0 })
 const transfers = createTransfers(slices, unused, redistributed, input.slotIndex)
 const borrowed: Record<SliceId, number> = { embb: 0, urllc: 0, mmtc: 0 }
 const lent: Record<SliceId, number> = { embb: 0, urllc: 0, mmtc: 0 }
 for (const transfer of transfers) {
   borrowed[transfer.toSliceId] += transfer.resourceBlocks
   lent[transfer.fromSliceId] += transfer.resourceBlocks
 }
 const allocations: InterSliceSliceAllocation[] = slices.map((slice) => {
   const allocated = guaranteed[slice.sliceId] + ordinary[slice.sliceId] + redistributed[slice.sliceId]
   return Object.freeze({
     sliceId: slice.sliceId,
     requestedResourceBlocks: slice.demandResourceBlocks,
     roundedGuaranteeQuotaResourceBlocks: quotas[slice.sliceId],
     guaranteedResourceBlocks: guaranteed[slice.sliceId],
     ordinarySharedResourceBlocks: ordinary[slice.sliceId],
     redistributedResourceBlocks: redistributed[slice.sliceId],
     allocatedResourceBlocks: allocated,
     unmetDemandResourceBlocks: slice.demandResourceBlocks - allocated,
     borrowedResourceBlocks: borrowed[slice.sliceId],
     lentResourceBlocks: lent[slice.sliceId],
   })
 })
 const totalRequested = allocations.reduce((sum, slice) => sum + slice.requestedResourceBlocks, 0)
 const totalAllocated = allocations.reduce((sum, slice) => sum + slice.allocatedResourceBlocks, 0)
 const ordinaryAllocated = allocations.reduce((sum, slice) => sum + slice.ordinarySharedResourceBlocks, 0)
 const redistributedTotal = allocations.reduce((sum, slice) => sum + slice.redistributedResourceBlocks, 0)
 const borrowedTotal = allocations.reduce((sum, slice) => sum + slice.borrowedResourceBlocks, 0)
 const lentTotal = allocations.reduce((sum, slice) => sum + slice.lentResourceBlocks, 0)
 const transferTotal = transfers.reduce((sum, transfer) => sum + transfer.resourceBlocks, 0)
 const totalUnallocated = input.totalResourceBlocks - totalAllocated
 const ordinaryUnallocated = ordinaryPool - ordinaryAllocated
 const redistributionRemainder = unusedGuaranteePool - redistributedTotal
 const conservationSatisfied = totalAllocated + totalUnallocated === input.totalResourceBlocks
   && ordinaryAllocated + ordinaryUnallocated === ordinaryPool
   && redistributedTotal + redistributionRemainder === unusedGuaranteePool
   && borrowedTotal === redistributedTotal
   && lentTotal === redistributedTotal
   && transferTotal === redistributedTotal
   && allocations.every((slice) =>
     slice.allocatedResourceBlocks
       === slice.guaranteedResourceBlocks
         + slice.ordinarySharedResourceBlocks
         + slice.redistributedResourceBlocks
     && slice.allocatedResourceBlocks <= slice.requestedResourceBlocks)
 return Object.freeze({
   totalResourceBlocks: input.totalResourceBlocks,
   totalRequestedResourceBlocks: totalRequested,
   totalAllocatedResourceBlocks: totalAllocated,
   totalUnallocatedResourceBlocks: totalUnallocated,
   ordinarySharedPoolResourceBlocks: ordinaryPool,
   ordinarySharedAllocatedResourceBlocks: ordinaryAllocated,
   ordinarySharedUnallocatedResourceBlocks: ordinaryUnallocated,
   unusedGuaranteePoolResourceBlocks: unusedGuaranteePool,
   redistributedGuaranteeResourceBlocks: redistributedTotal,
   unusedRedistributionRemainderResourceBlocks: redistributionRemainder,
   insufficientResources: totalAllocated < totalRequested,
   conservationSatisfied,
   guaranteeDecisions: guarantees,
   transfers,
   slices: Object.freeze(allocations),
 })
}
