import { describe, expect, it } from 'vitest'
import {
 DROPPED_PACKETS_LABEL,
 summarizePacketAccounting,
 UNDELIVERED_PACKET_NOTE_EN,
 UNDELIVERED_PACKET_NOTE_TR,
} from './packetAccounting'
describe('packet accounting semantics (F-TRAFFIC-01)', () => {
 it('keeps undelivered separate and marks dropped as not modelled', () => {
   const accounting = summarizePacketAccounting(100, 80, 20)
   expect(accounting.undeliveredPackets).toBe(20)
   expect(accounting.droppedModelled).toBe(false)
   expect(accounting.droppedPackets).toBeNull()
 })
 it('does not label undelivered packets as packet loss', () => {
   expect(UNDELIVERED_PACKET_NOTE_EN.toLowerCase()).not.toContain('packet loss')
   expect(UNDELIVERED_PACKET_NOTE_EN).toContain('not finite-buffer drop events')
   expect(UNDELIVERED_PACKET_NOTE_TR).toContain('drop')
 })
 it('shows dropped packets as N/A (not modelled)', () => {
   expect(DROPPED_PACKETS_LABEL).toContain('N/A')
 })
 it('rejects negative or non-integer counts', () => {
   expect(() => summarizePacketAccounting(-1, 0, 0)).toThrow()
   expect(() => summarizePacketAccounting(10, 1.5, 0)).toThrow()
 })
})
