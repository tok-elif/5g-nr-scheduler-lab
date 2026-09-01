import simulationConfig from '../config/simulation.json'
export interface M3WorkloadInput {
 readonly ueCount: number
 readonly resourceBlockCount: number
 readonly slotCount: number
 readonly schedulerCount: number
 readonly seedCount?: number
}
function assertPositiveSafeInteger(value: number, label: string): void {
 if (!Number.isSafeInteger(value) || value <= 0) {
   throw new Error(`${label} pozitif bir güvenli tam sayı olmalıdır.`)
 }
}
export function calculateM3WorkUnits(input: M3WorkloadInput): number {
 assertPositiveSafeInteger(input.ueCount, 'UE sayısı')
 assertPositiveSafeInteger(input.resourceBlockCount, 'RB sayısı')
 assertPositiveSafeInteger(input.slotCount, 'Slot sayısı')
 assertPositiveSafeInteger(input.schedulerCount, 'Scheduler sayısı')
 if (input.seedCount !== undefined) assertPositiveSafeInteger(input.seedCount, 'Seed sayısı')
 const factors = [
   input.schedulerCount,
   input.seedCount ?? 1,
   input.slotCount,
   input.ueCount,
   input.resourceBlockCount,
 ]
 let workUnits = 1
 for (const factor of factors) {
   if (workUnits > Number.MAX_SAFE_INTEGER / factor) {
     throw new Error('M3 deney yükü güvenli tam sayı sınırını aşıyor.')
   }
   workUnits *= factor
 }
 return workUnits
}
export function assertM3WorkloadAllowed(input: M3WorkloadInput): void {
 assertM3WorkUnitsAllowed(calculateM3WorkUnits(input))
}
export function assertM3WorkUnitsAllowed(workUnits: number): void {
 if (!Number.isSafeInteger(workUnits) || workUnits <= 0) {
   throw new Error('M3 deney yükü pozitif bir güvenli tam sayı olmalıdır.')
 }
 const limit = simulationConfig.experiments.m3MaxWorkUnits
 if (workUnits > limit) {
   throw new Error(
     `M3 deney yükü ${workUnits.toLocaleString('tr-TR')} UE-RB-slot birimi; `
     + `güvenli sınır ${limit.toLocaleString('tr-TR')}. UE veya slot sayısını azaltın.`,
   )
 }
}
export function assertM3ScientificWorkUnitsAllowed(workUnits: number): void {
 if (!Number.isSafeInteger(workUnits) || workUnits <= 0) {
   throw new Error('M3 bilimsel deney yükü pozitif bir güvenli tam sayı olmalıdır.')
 }
 const limit = simulationConfig.experiments.m3MaxWorkUnits
 if (workUnits > limit) {
   throw new Error(
     `M3 bilimsel deney yükü ${workUnits.toLocaleString('tr-TR')} UE-slot-koşul birimi; `
     + `güvenli sınır ${limit.toLocaleString('tr-TR')}. Seed, UE veya slot sayısını azaltın.`,
   )
 }
}
