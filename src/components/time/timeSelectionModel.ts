export interface TimeSelectionState {
 readonly slotIndex: number
 readonly detailOpen: boolean
 readonly selectedRbIndex: number | null
}
export const INITIAL_TIME_SELECTION: TimeSelectionState = { slotIndex: 0, detailOpen: false, selectedRbIndex: null }
export function selectTimeSlot(current: TimeSelectionState, slotIndex: number): TimeSelectionState {
 return { ...current, slotIndex, detailOpen: true, selectedRbIndex: null }
}
export function closeTimeDetail(current: TimeSelectionState): TimeSelectionState {
 return { ...current, detailOpen: false }
}
export function selectResourceBlock(current: TimeSelectionState, selectedRbIndex: number): TimeSelectionState {
 return { ...current, detailOpen: true, selectedRbIndex }
}
