import { getM2Scheduler } from '../m2Schedulers'
import type { M2Scheduler } from '../simulation/m2Types'
import qdfPfScheduler from './qdfPf.scheduler'
export const M3_SCHEDULERS: readonly M2Scheduler[] = Object.freeze([
 getM2Scheduler('m-lwdf'),
 getM2Scheduler('exp-pf'),
 qdfPfScheduler,
])
const kinds = new Set<string>()
for (const scheduler of M3_SCHEDULERS) {
 if (kinds.has(scheduler.kind)) throw new Error(`Tekrarlanan M3 scheduler kind: ${scheduler.kind}`)
 kinds.add(scheduler.kind)
}
export function getM3Scheduler(kind: string): M2Scheduler {
 const scheduler = M3_SCHEDULERS.find((item) => item.kind === kind)
 if (!scheduler) throw new Error(`Bilinmeyen M3 scheduler: ${kind}`)
 return scheduler
}
