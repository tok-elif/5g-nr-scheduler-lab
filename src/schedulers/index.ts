import type { Scheduler, SchedulerKind } from '../simulation/types'
const schedulerModules = import.meta.glob<Scheduler>('./*.scheduler.ts', {
 eager: true,
 import: 'default',
})
const discoveredSchedulers = Object.entries(schedulerModules).map(([path, scheduler]) => {
 if (!scheduler || typeof scheduler.kind !== 'string' || scheduler.kind.trim() === '') {
   throw new Error(`Geçersiz scheduler kind alanı: ${path}`)
 }
 if (typeof scheduler.label !== 'string' || scheduler.label.trim() === '') {
   throw new Error(`Geçersiz scheduler label alanı: ${path}`)
 }
 if (typeof scheduler.shortLabel !== 'string' || scheduler.shortLabel.trim() === '') {
   throw new Error(`Geçersiz scheduler shortLabel alanı: ${path}`)
 }
 if (!/^#[0-9a-f]{6}$/i.test(scheduler.color)) {
   throw new Error(`Geçersiz scheduler color alanı: ${path}`)
 }
 if (typeof scheduler.createSession !== 'function') {
   throw new Error(`Geçersiz scheduler createSession fonksiyonu: ${path}`)
 }
 return { path, scheduler }
})
const registeredKinds = new Set<string>()
for (const { path, scheduler } of discoveredSchedulers) {
 if (registeredKinds.has(scheduler.kind)) {
   throw new Error(`Tekrarlanan scheduler kind '${scheduler.kind}': ${path}`)
 }
 registeredKinds.add(scheduler.kind)
}
export const SCHEDULERS: readonly Scheduler[] = Object.freeze(
 discoveredSchedulers
   .sort((left, right) => (left.scheduler.order ?? 1_000) - (right.scheduler.order ?? 1_000)
     || left.path.localeCompare(right.path))
   .map(({ scheduler }) => Object.freeze(scheduler)),
)
export function getScheduler(kind: SchedulerKind): Scheduler {
 const scheduler = SCHEDULERS.find((item) => item.kind === kind)
 if (!scheduler) throw new Error(`Bilinmeyen scheduler: ${kind}`)
 return scheduler
}
