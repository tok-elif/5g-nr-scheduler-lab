import { describe, expect, it } from 'vitest'
import {
 buildM1TimeAllocationView,
 buildM2TimeAllocationView,
 densityForSlotCount,
} from './timeAllocationViewModel'
import type { CellConfig } from '../simulation/types'
const CELL: CellConfig = {
 id: '3500-100', bandMHz: 3500, bandwidthMHz: 100, resourceBlocks: 273, scsKHz: 30, slotDurationMs: 0.5, }
const rates = new Map([
 [1, { sinrDb: 17.6, achievableRateMbps: 812.4 }],
 [2, { sinrDb: 4.2, achievableRateMbps: 120 }],
])
describe('densityForSlotCount', () => {
 it('selects label / compact / color by slot count', () => {
   expect(densityForSlotCount(10)).toBe('label')
   expect(densityForSlotCount(24)).toBe('label')
   expect(densityForSlotCount(80)).toBe('compact')
   expect(densityForSlotCount(500)).toBe('color')
 })
})
describe('buildM1TimeAllocationView', () => {
 const view = buildM1TimeAllocationView({
   schedulerLabel: 'Round Robin',
   slotTrace: [1, 2, 1, 2],
   cell: CELL,
   ueRates: rates,
 })
 it('maps each slot to a frame/subframe/slot cell', () => {
   expect(view.cells).toHaveLength(4)
   expect(view.cells[0].time).toMatchObject({ frameIndex: 0, subframeInFrame: 0, slotInSubframe: 0 })
   // 30 kHz -> 2 slots per subframe; slot index 3 -> subframe 1, slot 1
   expect(view.cells[3].time).toMatchObject({ subframeInFrame: 1, slotInSubframe: 1, slotsPerSubframe: 2 })
 })
 it('exposes real UE rate and full-RB allocation, never fabricated fields', () => {
   expect(view.cells[0]).toMatchObject({
     ueId: 1, label: 'U1', allocatedRb: 273, sinrDb: 17.6, slotRateMbps: 812.4, scheduler: 'Round Robin',
   })
   // M1 does not model these -> null (not fake 0 / "undefined")
   expect(view.cells[0].fiveQi).toBeNull()
   expect(view.cells[0].sliceId).toBeNull()
   expect(view.cells[0].queuedMbits).toBeNull()
   expect(view.cells[0].holDelayMs).toBeNull()
 })
 it('builds tooltip rows without null/undefined fields and with units', () => {
   const rows = view.cells[0].tooltipRows
   const asMap = Object.fromEntries(rows.map((row) => [row.label, row.value]))
   expect(asMap['Frame']).toBe('0')
   expect(asMap['Slot']).toBe('1')
   expect(asMap['Subframe içi slot']).toBe('1')
   expect(asMap['UE']).toBe('U1')
   expect(asMap['RB']).toBe('273')
   expect(asMap['UE wideband SINR']).toBe('17.6 dB')
   expect(asMap['Achievable / slot rate']).toBe('812.40 Mbps')
   // no 5QI / Slice rows because those are null for M1
   expect(asMap['5QI']).toBeUndefined()
   expect(asMap['Slice']).toBeUndefined()
   // no row value is the literal string "undefined" or "null"
   expect(rows.every((row) => row.value !== 'undefined' && row.value !== 'null')).toBe(true)
 })
 it('produces a legend covering every UE plus the selection marker', () => {
   expect(view.legend.map((entry) => entry.key)).toEqual(['U1', 'U2', 'selected'])
 })
 it('selects an appropriate density for the slot count', () => {
   expect(view.density).toBe('label')
 })
})
describe('buildM2TimeAllocationView', () => {
 const ueResults = [
   { ueId: 1, fiveQi: 9, achievableRateMbps: 100 },
   { ueId: 2, fiveQi: 1, achievableRateMbps: 40 },
   { ueId: 3, fiveQi: 6, achievableRateMbps: 70 },
 ]
 const slotTrace = [
   { slotIndex: 0, allocations: [{ ueIndex: 0, resourceBlocks: 200 }, { ueIndex: 1, resourceBlocks: 73 }] },
   { slotIndex: 1, allocations: [{ ueIndex: 2, resourceBlocks: 273 }] },
   { slotIndex: 2, allocations: [] },
 ]
 const view = buildM2TimeAllocationView({ schedulerLabel: 'M-LWDF', slotTrace, cell: CELL, ueResults })
 it('maps real per-slot allocations with a primary UE and total used RB', () => {
   expect(view.cells[0]).toMatchObject({ ueId: 1, allocatedRb: 273, status: 'allocated', fiveQi: 9 })
   expect(view.cells[1]).toMatchObject({ ueId: 3, allocatedRb: 273, fiveQi: 6 })
 })
 it('marks an unallocated slot as empty', () => {
   expect(view.cells[2].status).toBe('empty')
   expect(view.cells[2].ueId).toBeNull()
 })
 it('does not fabricate per-slot SINR or throughput (null)', () => {
   expect(view.cells[0].sinrDb).toBeNull()
   expect(view.cells[0].slotRateMbps).toBeNull()
 })
 it('reports the real UE count and used RB in the tooltip', () => {
   const rows = Object.fromEntries(view.cells[0].tooltipRows.map((row) => [row.label, row.value]))
   expect(rows['Tahsis edilen UE']).toBe('2')
   expect(rows['Kullanılan RB']).toBe('273 / 273')
   expect(rows['Birincil UE']).toBe('U1')
   expect(rows['Slot']).toBe('1')
   expect(rows['Subframe içi slot']).toBe('1')
 })
})
