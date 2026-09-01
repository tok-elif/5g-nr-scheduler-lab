import { describe, expect, it } from 'vitest'
import { INITIAL_TIME_SELECTION, closeTimeDetail, selectResourceBlock, selectTimeSlot } from './timeSelectionModel'
describe('time selection model', () => {
 it.each(['M1', 'M2'])('%s slot click selects the slot and opens its detail analysis', () => {
   expect(selectTimeSlot(INITIAL_TIME_SELECTION, 7)).toEqual({ slotIndex: 7, detailOpen: true, selectedRbIndex: null })
 })
 it('closing the panel preserves both slot and RB selection', () => {
   const selected = selectResourceBlock(selectTimeSlot(INITIAL_TIME_SELECTION, 5), 12)
   expect(closeTimeDetail(selected)).toEqual({ slotIndex: 5, detailOpen: false, selectedRbIndex: 12 })
 })
})
