import simulationConfig from '../config/simulation.json'
export interface M4WorkloadInput {
 readonly ueCount: number
 readonly resourceBlockCount: number
 readonly slotCount: number
}
function validate(value: number, label: string): void {
 if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} pozitif güvenli tam sayı olmalıdır.`) }
export function calculateM4WorkUnits(input: M4WorkloadInput): number {
 validate(input.ueCount, 'UE sayısı')
 validate(input.resourceBlockCount, 'RB sayısı')
 validate(input.slotCount, 'Slot sayısı')
 let result = 1
 for (const factor of [input.ueCount, input.resourceBlockCount, input.slotCount]) {
   if (result > Number.MAX_SAFE_INTEGER / factor) throw new Error('M4 deney yükü güvenli tam sayı sınırınıaşıyor.')
   result *= factor
 }
 return result
}
export function assertM4WorkloadAllowed(input: M4WorkloadInput): void {
 assertM4WorkUnitsAllowed(calculateM4WorkUnits(input))
}
export function assertM4WorkUnitsAllowed(workUnits: number): void {
 validate(workUnits, 'M4 deney yükü')
 const limit = simulationConfig.experiments.maxWorkUnits
 if (workUnits > limit) {
   throw new Error(
     `M4 deney yükü ${workUnits.toLocaleString('tr-TR')} UE-RB-slot birimi; `
     + `güvenli sınır ${limit.toLocaleString('tr-TR')}. UE veya slot sayısını azaltın.`,
   )
 }
}
