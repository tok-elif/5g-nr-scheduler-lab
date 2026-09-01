import { describe, expect, it } from 'vitest'
import {
 formatNrTimeLabel,
 resolveSlotsPerSubframe,
 toNrTimeIndex,
} from './nrTimeIndex'
describe('resolveSlotsPerSubframe', () => {
 it('maps 15 kHz to 1 slot per subframe', () => {
   expect(resolveSlotsPerSubframe({ scsKHz: 15 })).toBe(1)
   expect(resolveSlotsPerSubframe({ slotDurationMs: 1 })).toBe(1)
   expect(resolveSlotsPerSubframe({ numerology: 0 })).toBe(1)
 })
 it('maps 30 kHz to 2 slots per subframe', () => {
   expect(resolveSlotsPerSubframe({ scsKHz: 30 })).toBe(2)
   expect(resolveSlotsPerSubframe({ slotDurationMs: 0.5 })).toBe(2)
   expect(resolveSlotsPerSubframe({ numerology: 1 })).toBe(2)
 })
 it('accepts consistent multi-source input', () => {
   expect(resolveSlotsPerSubframe({ numerology: 1, scsKHz: 30, slotDurationMs: 0.5 })).toBe(2)
 })
 it('throws when numerology and slot duration conflict', () => {
   expect(() => resolveSlotsPerSubframe({ numerology: 0, slotDurationMs: 0.5 })).toThrow(/çelişiyor/)
 })
 it('throws when scs and slot duration conflict', () => {
   expect(() => resolveSlotsPerSubframe({ scsKHz: 15, slotDurationMs: 0.5 })).toThrow(/çelişiyor/)
 })
 it('throws on an invalid (non-dividing) slot duration', () => {
   expect(() => resolveSlotsPerSubframe({ slotDurationMs: 0.3 })).toThrow(/subframe/)
 })
 it('throws on an invalid scs that is not 15·2^μ', () => {
   expect(() => resolveSlotsPerSubframe({ scsKHz: 20 })).toThrow(/Geçersiz SCS/)
 })
 it('throws when no timing source is provided', () => {
   expect(() => resolveSlotsPerSubframe({})).toThrow(/verilmelidir/)
 })
})
describe('toNrTimeIndex', () => {
 it('maps slot 0 to frame 0 / subframe 0 / slot 0', () => {
   expect(toNrTimeIndex(0, { slotDurationMs: 1 })).toMatchObject({
     globalSlotIndex: 0,
     frameIndex: 0,
     subframeIndex: 0,
     subframeInFrame: 0,
     slotInSubframe: 0,
     slotsPerSubframe: 1,
   })
 })
 it('maps a frame boundary correctly at 15 kHz (1 slot/subframe)', () => {
   // 10 subframes/frame * 1 slot/subframe = 10 slots per frame
   expect(toNrTimeIndex(10, { slotDurationMs: 1 })).toMatchObject({
     frameIndex: 1,
     subframeIndex: 10,
     subframeInFrame: 0,
     slotInSubframe: 0,
   })
   expect(toNrTimeIndex(9, { slotDurationMs: 1 })).toMatchObject({
     frameIndex: 0,
     subframeInFrame: 9,
     slotInSubframe: 0,
   })
 })
 it('maps a frame boundary correctly at 30 kHz (2 slots/subframe)', () => {
   // 10 subframes/frame * 2 slots/subframe = 20 slots per frame
   expect(toNrTimeIndex(20, { scsKHz: 30 })).toMatchObject({
     frameIndex: 1,
     subframeIndex: 10,
     subframeInFrame: 0,
     slotInSubframe: 0,
   })
   expect(toNrTimeIndex(3, { scsKHz: 30 })).toMatchObject({
     frameIndex: 0,
     subframeIndex: 1,
     subframeInFrame: 1,
     slotInSubframe: 1,
   })
 })
 it('rejects a negative or non-integer slot index', () => {
   expect(() => toNrTimeIndex(-1, { slotDurationMs: 1 })).toThrow()
   expect(() => toNrTimeIndex(1.5, { slotDurationMs: 1 })).toThrow()
 })
 it('formats a human readable label', () => {
   expect(formatNrTimeLabel(toNrTimeIndex(23, { scsKHz: 30 }))).toBe('Frame 1 / Subframe 1 / Slot 24 / Subframe içi 2')
 })
})
