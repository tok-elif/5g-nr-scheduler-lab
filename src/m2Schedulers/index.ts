import type { M2Scheduler } from '../simulation/m2Types'
const schedulerModules = import.meta.glob<M2Scheduler>('./*.scheduler.ts', {
 eager: true,
 import: 'default',
})
const discovered = Object.entries(schedulerModules).map(([path, scheduler]) => {
 if (!scheduler || typeof scheduler.kind !== 'string' || scheduler.kind.trim() === '') {
   throw new Error(`Geçersiz M2 scheduler kind alanı: ${path}`)
 }
 if (typeof scheduler.label !== 'string' || typeof scheduler.shortLabel !== 'string') {
   throw new Error(`Geçersiz M2 scheduler etiketi: ${path}`)
 }
 if (!/^#[0-9a-f]{6}$/i.test(scheduler.color) || typeof scheduler.createSession !== 'function') {
   throw new Error(`Geçersiz M2 scheduler metadata'sı: ${path}`)
 }
 return { path, scheduler }
})
const kinds = new Set<string>()
for (const { path, scheduler } of discovered) {
 if (kinds.has(scheduler.kind)) throw new Error(`Tekrarlanan M2 scheduler kind '${scheduler.kind}': ${path}`)
 kinds.add(scheduler.kind)
}
export const M2_SCHEDULERS: readonly M2Scheduler[] = Object.freeze(
 discovered
   .sort((left, right) => (left.scheduler.order ?? 1_000) - (right.scheduler.order ?? 1_000)
     || left.path.localeCompare(right.path))
   .map(({ scheduler }) => Object.freeze(scheduler)),
)
export function getM2Scheduler(kind: string): M2Scheduler {
 const scheduler = M2_SCHEDULERS.find((item) => item.kind === kind)
 if (!scheduler) throw new Error(`Bilinmeyen M2 scheduler: ${kind}`)
 return scheduler
}
