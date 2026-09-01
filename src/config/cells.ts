import cells from './cells.json'
import type { CellConfig } from '../simulation/types'
const configuredCells = cells satisfies CellConfig[]
function validateCells(configs: readonly CellConfig[]): void {
 const ids = new Set<string>()
 for (const cell of configs) {
   if (ids.has(cell.id)) throw new Error(`Tekrarlanan hücre kimliği: ${cell.id}`)
   if (cell.resourceBlocks < 1 || cell.bandwidthMHz <= 0 || cell.scsKHz <= 0 || cell.slotDurationMs <= 0) {
     throw new Error(`Geçersiz hücre konfigürasyonu: ${cell.id}`)
   }
   ids.add(cell.id)
 }
}
validateCells(configuredCells)
export const CELL_CONFIGS = configuredCells
