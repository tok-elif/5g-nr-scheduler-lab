export interface M2PacketArrivalObservation {
 readonly kind: 'packet-arrival'
 readonly slotIndex: number
 readonly ueIndex: number
 readonly fiveQi: number
 readonly packetSizeMbits: number
}
export interface M2PacketDeliveryObservation {
 readonly kind: 'packet-delivery'
 readonly slotIndex: number
 readonly ueIndex: number
 readonly fiveQi: number
 readonly packetSizeMbits: number
 readonly delaySlots: number
 readonly delayMs: number
}
export interface M2UeSlotObservation {
 readonly kind: 'ue-slot-end'
 readonly slotIndex: number
 readonly ueIndex: number
 readonly fiveQi: number
 readonly queuedMbits: number
 readonly headOfLineDelayMs: number
}
export type M2Observation =
 | M2PacketArrivalObservation
 | M2PacketDeliveryObservation
 | M2UeSlotObservation
export interface M2ObservationSink {
 observe(observation: M2Observation): void
}
