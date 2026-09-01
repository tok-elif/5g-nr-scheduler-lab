import { M2_SCHEDULERS } from '../m2Schedulers'
import { M3_SCHEDULERS } from '../m3Schedulers'
import type { M2Scheduler } from './m2Types'
import {
 M4_SCHEDULER_KINDS,
 type M4SchedulerKind,
} from './m4Types'
export function createM4SchedulerRegistry(
 schedulers: readonly M2Scheduler[],
): ReadonlyMap<M4SchedulerKind, M2Scheduler> {
 const registry = new Map<M4SchedulerKind, M2Scheduler>()
 for (const scheduler of schedulers) {
   if (!M4_SCHEDULER_KINDS.some((kind) => kind === scheduler.kind)) {
     throw new Error(`Bilinmeyen M4 scheduler kind: ${scheduler.kind}`)
   }
   const kind = scheduler.kind as M4SchedulerKind
   if (registry.has(kind)) throw new Error(`Duplicate M4 scheduler kind: ${kind}`)
   registry.set(kind, scheduler)
 }
 const missing = M4_SCHEDULER_KINDS.filter((kind) => !registry.has(kind))
 if (missing.length > 0) throw new Error(`Eksik M4 scheduler kind: ${missing.join(', ')}`)
 return registry
}
const QDF_PF = M3_SCHEDULERS.find((scheduler) => scheduler.kind === 'qdf-pf')
if (!QDF_PF) throw new Error('QDF-PF M3 registry içinde bulunamadı.')
export const M4_SCHEDULER_REGISTRY = createM4SchedulerRegistry([
 ...M2_SCHEDULERS,
 QDF_PF,
])
export function resolveM4Scheduler(kind: M4SchedulerKind | string): M2Scheduler {
 if (!M4_SCHEDULER_KINDS.some((candidate) => candidate === kind)) {
   throw new Error(`Bilinmeyen M4 scheduler: ${kind}`)
 }
 const scheduler = M4_SCHEDULER_REGISTRY.get(kind as M4SchedulerKind)
 if (!scheduler) throw new Error(`Eksik M4 scheduler: ${kind}`)
 return scheduler
}
