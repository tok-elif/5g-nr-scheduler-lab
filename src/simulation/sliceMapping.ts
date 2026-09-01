import { M4_SLICE_IDS, type SliceId, type UeSliceMapping, type UeSliceMappingEntry } from './m4Types'
function validateCount(value: number, label: string): void {
 if (!Number.isSafeInteger(value) || value < 0) {
   throw new Error(`${label} güvenli, negatif olmayan tam sayı olmalıdır.`)
 }
}
export function createUeSliceMapping(
 totalUeCount: number,
 counts: Readonly<Record<SliceId, number>>,
): UeSliceMapping {
 if (!Number.isSafeInteger(totalUeCount) || totalUeCount <= 0) {
   throw new Error('Toplam UE sayısı pozitif güvenli tam sayı olmalıdır.')
 }
 for (const sliceId of M4_SLICE_IDS) validateCount(counts[sliceId], `${sliceId} UE sayısı`)
 if (M4_SLICE_IDS.reduce((sum, sliceId) => sum + counts[sliceId], 0) !== totalUeCount) {
   throw new Error('Slice UE sayıları toplam UE sayısıyla eşleşmelidir.')
 }
 const entries: UeSliceMappingEntry[] = []
 const sliceByUeIndex: SliceId[] = []
 const mutableIndices: Record<SliceId, number[]> = { embb: [], urllc: [], mmtc: [] }
 let ueIndex = 0
 for (const sliceId of M4_SLICE_IDS) {
   for (let offset = 0; offset < counts[sliceId]; offset += 1) {
     entries.push(Object.freeze({ ueIndex, sliceId }))
     sliceByUeIndex.push(sliceId)
     mutableIndices[sliceId].push(ueIndex)
     ueIndex += 1
   }
 }
 return Object.freeze({
   entries: Object.freeze(entries),
   sliceByUeIndex: Object.freeze(sliceByUeIndex),
   ueIndicesBySlice: Object.freeze({
     embb: Object.freeze(mutableIndices.embb),
     urllc: Object.freeze(mutableIndices.urllc),
     mmtc: Object.freeze(mutableIndices.mmtc),
   }),
 })
}
