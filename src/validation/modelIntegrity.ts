import type { M0Result, M1BatchResult, M1CellMatrixResult, M1Config, M1Result, SchedulerKind } from '../simulation/types'
export interface ModelIntegrityCheck {
 id: string
 label: string
 passed: boolean
 detail: string
}
export interface ModelIntegrityReport {
 passedCount: number
 totalCount: number
 allPassed: boolean
 checks: ModelIntegrityCheck[]
}
interface ModelIntegrityInput {
 m0CellMatrix: readonly M0Result[]
 m1Results: readonly M1Result[]
 batch: M1BatchResult
 cellMatrix: M1CellMatrixResult
 m1Config: M1Config
 expectedSchedulerKinds: readonly SchedulerKind[]
}
const approximatelyEqual = (left: number, right: number): boolean =>
 Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(left), Math.abs(right))
export function validateModelIntegrity(input: ModelIntegrityInput): ModelIntegrityReport {
 const referenceUes = input.m0CellMatrix[0]?.ues ?? []
 const samePopulation = input.m0CellMatrix.length > 0 && referenceUes.length > 0
   && input.m0CellMatrix.every((result) => result.ues.length === referenceUes.length
     && result.ues.every((ue, index) => {
       const reference = referenceUes[index]
       return ue.id === reference.id
         && ue.sinrDb === reference.sinrDb
         && ue.cqi === reference.cqi
         && ue.mcsIndex === reference.mcsIndex
         && ue.mcsTable === reference.mcsTable
     }))
 const validCapacities = input.m0CellMatrix.length > 0 && input.m0CellMatrix.every((result) =>
   approximatelyEqual(result.sampledFullBandUpperBoundMbps, Math.max(...result.ues.map((ue) => ue.achievableRateMbps))))
 const consistentLinkAdaptation = input.m0CellMatrix.length > 0 && input.m0CellMatrix.every((result) =>
   result.ues.every((ue) => ue.cqi === 0
     ? ue.mcsIndex === -1 && ue.spectralEfficiency === 0 && ue.mcsTable === '—'
     : approximatelyEqual(ue.spectralEfficiency, ue.mcsSpectralEfficiency)
       && (ue.cqi === 1
         ? ue.mcsTable === 'PDSCH Table 3' && ue.mcsIndex === 4 && ue.targetCodeRateX1024 === 78
         : ue.mcsTable === 'PDSCH Table 1')))
 const schedulerKinds = input.m1Results.map((result) => result.scheduler)
 const completeSchedulerSet = input.expectedSchedulerKinds.length > 0
   && schedulerKinds.length === input.expectedSchedulerKinds.length
   && input.expectedSchedulerKinds.every((kind) => schedulerKinds.includes(kind))
 const slotsConserved = input.m1Results.length > 0 && input.m1Results.every((result) =>
   result.ueResults.reduce((total, ue) => total + ue.selectedSlots, 0) === input.m1Config.slotCount
     && result.slotTrace.length === Math.min(input.m1Config.slotCount, input.m1Config.traceSlotLimit ?? 40))
 const throughputConserved = input.m1Results.length > 0 && input.m1Results.every((result) =>
   approximatelyEqual(
     result.ueResults.reduce((total, ue) => total + ue.throughputMbps, 0),
     result.cellThroughputMbps,
   ))
 const fairnessBounded = input.m1Results.length > 0 && input.m1Results.every((result) =>
   result.jainFairness === null
   || (Number.isFinite(result.jainFairness) && result.jainFairness >= 0 && result.jainFairness <= 1))
 const maxCiResult = input.m1Results.find((result) => result.scheduler === 'max-ci')
 const maxCiTiePolicy = maxCiResult !== undefined && maxCiResult.ueResults.length > 0 && (() => {
   const bestRate = Math.max(...maxCiResult.ueResults.map((ue) => ue.achievableRateMbps))
   const bestUes = maxCiResult.ueResults.filter((ue) => ue.achievableRateMbps === bestRate)
   const otherUes = maxCiResult.ueResults.filter((ue) => ue.achievableRateMbps !== bestRate)
   const selectedCounts = bestUes.map((ue) => ue.selectedSlots)
   return otherUes.every((ue) => ue.selectedSlots === 0)
     && Math.max(...selectedCounts) - Math.min(...selectedCounts) <= 1
 })()
 const commonSeeds = input.batch.seeds.length >= 2
   && input.batch.seeds.length === input.cellMatrix.seeds.length
   && input.batch.seeds.every((seed, index) => seed === input.cellMatrix.seeds[index])
   && input.batch.schedulerResults.every((result) => result.runCount === input.batch.seeds.length)
   && input.cellMatrix.rows.every((result) => result.runCount === input.cellMatrix.seeds.length)
 const expectedCellIds = input.m0CellMatrix.map((result) => result.cell.id)
 const completeMatrix = input.cellMatrix.rows.length === expectedCellIds.length * input.expectedSchedulerKinds.length
   && expectedCellIds.every((cellId) => input.expectedSchedulerKinds.every((scheduler) =>
     input.cellMatrix.rows.filter((row) => row.cell.id === cellId && row.scheduler === scheduler).length === 1))
 const expectedPairsPerCell = input.expectedSchedulerKinds.length * (input.expectedSchedulerKinds.length - 1) / 2
 const completePairwiseMatrix = input.batch.pairwiseComparisons.length === expectedPairsPerCell
   && input.cellMatrix.pairwiseRows.length === expectedCellIds.length * expectedPairsPerCell
 const finiteStatistics = input.cellMatrix.rows.length > 0 && input.cellMatrix.rows.every((row) => {
   const values = [
     row.throughputMbps.mean,
     row.throughputMbps.standardDeviation,
     row.throughputMbps.confidence95HalfWidth,
     row.jainFairness.mean,
     row.jainFairness.standardDeviation,
     row.jainFairness.confidence95HalfWidth,
   ]
   return values.every(Number.isFinite)
     && row.throughputMbps.standardDeviation >= 0
     && row.throughputMbps.confidence95HalfWidth >= 0
     && row.jainFairness.standardDeviation >= 0
     && row.jainFairness.confidence95HalfWidth >= 0
 }) && input.cellMatrix.pairwiseRows.every((row) => [
   row.throughputDifferenceMbps.mean,
   row.throughputDifferenceMbps.standardDeviation,
   row.throughputDifferenceMbps.confidence95HalfWidth,
   row.jainFairnessDifference.mean,
   row.jainFairnessDifference.standardDeviation,
   row.jainFairnessDifference.confidence95HalfWidth,
 ].every(Number.isFinite))
 const checks: ModelIntegrityCheck[] = [
   { id: 'population', label: 'Ortak UE/SINR popülasyonu', passed: samePopulation, detail:
`${input.m0CellMatrix.length} hücrede ${referenceUes.length} UE kimliği, SINR, CQI ve MCS eşleşmesi` },
   { id: 'capacity', label: 'M0 tam-bant üst sınırı', passed: validCapacities, detail: 'Örneklenmiş üst sınır her hücredepopülasyondaki en yüksek tam-bant UE hızına eşit' },
   { id: 'link-adaptation', label: 'CQI/MCS fiziksel tutarlılığı', passed: consistentLinkAdaptation, detail: 'Hız verimi seçilenMCS ile aynı; CQI 1 düşük-SE PDSCH Table 3 MCS 4 kullanıyor' },
   { id: 'schedulers', label: 'Scheduler kayıt bütünlüğü', passed: completeSchedulerSet, detail: `${input.expectedSchedulerKinds.length} kayıtlı algoritmanın tamamı tek-seed deneyinde mevcut` },
   { id: 'slots', label: 'Slot korunumu', passed: slotsConserved, detail: `Her algoritmada UE slot toplamı${input.m1Config.slotCount} ve trace sınırı tutarlı` },
   { id: 'throughput', label: 'Throughput korunumu', passed: throughputConserved, detail: 'UE throughput toplamı hücrethroughput değerine eşit' },
   { id: 'fairness', label: 'Jain indeksi sınırları', passed: fairnessBounded, detail: 'Bütün Jain değerleri sonlu ve [0, 1]aralığında' },
   { id: 'max-ci-ties', label: 'Max C/I eşitlik politikası', passed: maxCiTiePolicy, detail: 'Eşit en iyi UE’ler bütün slotlarıdeterministik Round Robin ile paylaşıyor' },
   { id: 'seeds', label: 'Ortak seed protokolü', passed: commonSeeds, detail: `${input.batch.seeds.length} seed seçilihücre ve tüm-hücre matrisinde aynı sırada` },
   { id: 'matrix', label: 'Deney matrisi kapsamı', passed: completeMatrix && completePairwiseMatrix, detail: `${expectedCellIds.length} hücre × ${input.expectedSchedulerKinds.length} scheduler ve eşleştirilmiş algoritma çiftlerieksiksiz` },
   { id: 'statistics', label: 'İstatistiksel çıktı geçerliliği', passed: finiteStatistics, detail: 'Ortalama, standart sapma ve %95GA değerleri sonlu; yayılım değerleri negatif değil' },
 ]
 const passedCount = checks.filter((check) => check.passed).length
 return { passedCount, totalCount: checks.length, allPassed: passedCount === checks.length, checks }
}
