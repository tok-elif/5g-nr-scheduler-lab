import { validateM4RuntimeConfig } from '../config/m4Config'
import { validateM2Config } from '../simulation/m2'
import type { M4Result, M4RunInput } from '../simulation/m4Types'
import { validateCellConfig, validateUes } from '../simulation/validation'
export interface M4WorkerRequest {
 readonly kind: 'run-m4'
 readonly requestId: string
 readonly input: M4RunInput
}
export interface M4WorkerSuccessResponse {
 readonly kind: 'm4-result'
 readonly requestId: string
 readonly ok: true
 readonly result: M4Result
}
export interface M4WorkerErrorResponse {
 readonly kind: 'm4-error'
 readonly requestId: string
 readonly ok: false
 readonly error: string
}
export type M4WorkerResponse = M4WorkerSuccessResponse | M4WorkerErrorResponse
const record = (value: unknown): value is Record<string, unknown> =>
 typeof value === 'object' && value !== null && !Array.isArray(value)
export function requestIdFromUnknown(value: unknown): string {
 if (record(value) && typeof value.requestId === 'string' && value.requestId.trim() !== '') return value.requestId
 return 'invalid-request'
}
export function validateM4WorkerRequest(value: unknown): M4WorkerRequest {
 if (!record(value) || value.kind !== 'run-m4') throw new Error('Desteklenmeyen M4 worker request kind.')
 if (typeof value.requestId !== 'string' || value.requestId.trim() === '') throw new Error('M4 requestId boş olamaz.')
 if (!record(value.input)) throw new Error('M4 worker input nesne olmalıdır.')
 const input = structuredClone(value.input) as unknown as M4RunInput
 validateCellConfig(input.cell)
 validateUes(input.ues)
 validateM2Config(input.m2Config)
 validateM4RuntimeConfig(input.m4Config)
 if (!Number.isSafeInteger(input.baseSeed)) throw new Error('M4 base seed geçersiz.')
 if (!Number.isSafeInteger(input.resourceTraceSlotLimit) || input.resourceTraceSlotLimit < 0) {
   throw new Error('M4 resource trace limiti geçersiz.')
 }
 return { kind: 'run-m4', requestId: value.requestId, input }
}
