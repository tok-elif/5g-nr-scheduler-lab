import { runM4 } from '../simulation/m4'
import { assertM4WorkloadAllowed } from '../simulation/m4WorkloadGuard'
import {
 requestIdFromUnknown,
 validateM4WorkerRequest,
 type M4WorkerResponse,
} from './m4Protocol'
export function handleM4WorkerRequest(request: unknown): M4WorkerResponse {
 const requestId = requestIdFromUnknown(request)
 try {
   const validated = validateM4WorkerRequest(request)
   assertM4WorkloadAllowed({
     ueCount: validated.input.ues.length,
     resourceBlockCount: validated.input.cell.resourceBlocks,
     slotCount: validated.input.m2Config.slotCount,
   })
   return {
     kind: 'm4-result',
     requestId: validated.requestId,
     ok: true,
     result: runM4(validated.input),
   }
 } catch (error) {
   return {
     kind: 'm4-error',
     requestId,
     ok: false,
     error: error instanceof Error ? error.message : 'Bilinmeyen M4 simülasyon hatası.',
   }
 }
}
