/**
* F-TRAFFIC-01: Paket muhasebesi semantiğini netleştirir.
*
* Bu görevde bilimsel modele sonlu buffer / packet-drop EKLENMEZ. Bunun yerine
* kavramlar ayrıştırılır: üretilen, teslim edilen, ufuk sonunda teslim edilmeyen
* ve düşürülen (modellenmiyor). "Teslim edilmeyen" değeri "packet loss" olarak
* ETİKETLENMEZ.
*/
export const UNDELIVERED_PACKET_NOTE_EN =
 'Undelivered packets are packets remaining in the queue at the end of the '
 + 'finite simulation horizon; they are not finite-buffer drop events.'
export const UNDELIVERED_PACKET_NOTE_TR =
 'Teslim edilmeyen paketler, sonlu simülasyon ufkunun sonunda kuyrukta kalan '
 + 'paketlerdir; sonlu-buffer düşürme (drop) olayları değildir. Düşürme modeli '
 + 'bulunmadığından "dropped" değeri N/A gösterilir.'
export const DROPPED_PACKETS_LABEL = 'N/A (modellenmiyor)'
export interface PacketAccounting {
 readonly generatedPackets: number
 readonly deliveredPackets: number
 readonly undeliveredPackets: number
 readonly droppedModelled: false
 readonly droppedPackets: null
}
export function summarizePacketAccounting(
 generatedPackets: number,
 deliveredPackets: number,
 undeliveredPackets: number,
): PacketAccounting {
 if (![generatedPackets, deliveredPackets, undeliveredPackets].every((value) =>
   Number.isSafeInteger(value) && value >= 0)) {
   throw new Error('Paket sayıları negatif olmayan güvenli tam sayı olmalıdır.')
 }
 return {
   generatedPackets,
   deliveredPackets,
   undeliveredPackets,
   droppedModelled: false,
   droppedPackets: null,
 }
}
