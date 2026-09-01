import type { CellConfig, M1CellMatrixResult, M1CellMatrixRow } from '../simulation/types'
export interface M1CellTradeoffSummary {
 cell: CellConfig
 throughputLeaders: M1CellMatrixRow[]
 fairnessLeaders: M1CellMatrixRow[]
 paretoRows: M1CellMatrixRow[]
}
const EPSILON = 1e-9
const approximatelyEqual = (left: number, right: number): boolean =>
 Math.abs(left - right) <= EPSILON * Math.max(1, Math.abs(left), Math.abs(right))
const dominates = (candidate: M1CellMatrixRow, target: M1CellMatrixRow): boolean => {
 const throughputAtLeastAsGood = candidate.throughputMbps.mean >= target.throughputMbps.mean
 const fairnessAtLeastAsGood = candidate.jainFairness.mean >= target.jainFairness.mean
 const strictlyBetter = candidate.throughputMbps.mean > target.throughputMbps.mean
   || candidate.jainFairness.mean > target.jainFairness.mean
 return throughputAtLeastAsGood && fairnessAtLeastAsGood && strictlyBetter
}
export function summarizeM1CellTradeoffs(result: M1CellMatrixResult): M1CellTradeoffSummary[] {
 const grouped = new Map<string, M1CellMatrixRow[]>()
 for (const row of result.rows) {
   const rows = grouped.get(row.cell.id) ?? []
   rows.push(row)
   grouped.set(row.cell.id, rows)
 }
 return [...grouped.values()].map((rows) => {
   const maxThroughput = Math.max(...rows.map((row) => row.throughputMbps.mean))
   const maxFairness = Math.max(...rows.map((row) => row.jainFairness.mean))
   return {
     cell: rows[0].cell,
     throughputLeaders: rows.filter((row) => approximatelyEqual(row.throughputMbps.mean, maxThroughput)),
     fairnessLeaders: rows.filter((row) => approximatelyEqual(row.jainFairness.mean, maxFairness)),
     paretoRows: rows.filter((target) => !rows.some((candidate) => candidate !== target && dominates(candidate, target))),
   }
 })
}
