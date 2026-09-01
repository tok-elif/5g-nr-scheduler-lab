import simulationConfig from '../config/simulation.json'
import { M2_SCHEDULERS } from '../m2Schedulers'
export interface M2WorkloadInput {
 readonly ueCount: number
 readonly resourceBlockCount: number
 readonly slotCount: number
}
const assertPositiveSafeInteger = (value: number, field: string): void => {
 if (!Number.isSafeInteger(value) || value <= 0) {
   throw new Error(`${field} pozitif bir güvenli tam sayı olmalıdır.`)
 }
}
export function calculateM2WorkUnits(input: M2WorkloadInput): number {
 assertPositiveSafeInteger(input.ueCount, 'UE sayısı')
 assertPositiveSafeInteger(input.resourceBlockCount, 'RB sayısı')
 assertPositiveSafeInteger(input.slotCount, 'Slot sayısı')
 const factors = [
   M2_SCHEDULERS.length,
   input.ueCount,
   input.resourceBlockCount,
   input.slotCount,
 ]
 let workUnits = 1
 for (const factor of factors) {
   if (workUnits > Number.MAX_SAFE_INTEGER / factor) {
     throw new Error('M2 deney yükü güvenli tam sayı sınırını aşıyor.')
   }
   workUnits *= factor
 }
 return workUnits
}
export function assertM2WorkloadAllowed(input: M2WorkloadInput): void {
 const workUnits = calculateM2WorkUnits(input)
 assertM2WorkUnitsAllowed(workUnits)
}
export function assertM2WorkUnitsAllowed(workUnits: number): void {
 if (!Number.isSafeInteger(workUnits) || workUnits <= 0) {
   throw new Error('M2 deney yükü pozitif bir güvenli tam sayı olmalıdır.')
 }
 const limit = simulationConfig.experiments.m2MaxWorkUnits
 if (workUnits > limit) {
   throw new Error(
     `M2 deney yükü ${workUnits.toLocaleString('tr-TR')} UE-RB-slot birimi; `
     + `güvenli sınır ${limit.toLocaleString('tr-TR')}. UE veya slot sayısını azaltın.`,
   )
 }
}
