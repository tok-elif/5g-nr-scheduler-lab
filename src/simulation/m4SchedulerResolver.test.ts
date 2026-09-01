import { describe, expect, it } from 'vitest'
import { M2_SCHEDULERS } from '../m2Schedulers'
import { M3_SCHEDULERS } from '../m3Schedulers'
import type { M2Scheduler } from './m2Types'
import {
 createM4SchedulerRegistry,
 M4_SCHEDULER_REGISTRY,
 resolveM4Scheduler,
} from './m4SchedulerResolver'
import { M4_SCHEDULER_KINDS } from './m4Types'
describe('M4 scheduler resolver', () => {
 it('resolves all six canonical scheduler kinds', () => {
   expect(M4_SCHEDULER_KINDS.map((kind) => resolveM4Scheduler(kind).kind))
     .toEqual(M4_SCHEDULER_KINDS)
 })
 it('returns stable registry objects', () => {
   expect(resolveM4Scheduler('round-robin')).toBe(resolveM4Scheduler('round-robin'))
 })
 it('gets QDF-PF from the M3 registry', () => {
   expect(resolveM4Scheduler('qdf-pf')).toBe(M3_SCHEDULERS.find((item) => item.kind === 'qdf-pf'))
 })
 it('rejects unknown kinds', () => {
   expect(() => resolveM4Scheduler('unknown')).toThrow('Bilinmeyen')
 })
 it('rejects duplicate kinds', () => {
   const qdf = resolveM4Scheduler('qdf-pf')
   expect(() => createM4SchedulerRegistry([...M2_SCHEDULERS, qdf, qdf])).toThrow('Duplicate')
 })
 it('rejects incomplete registries', () => {
   expect(() => createM4SchedulerRegistry(M2_SCHEDULERS)).toThrow('Eksik')
 })
 it('does not mutate scheduler metadata', () => {
   const scheduler = resolveM4Scheduler('max-ci')
   const snapshot = { ...scheduler }
   expect(M4_SCHEDULER_REGISTRY.get('max-ci')).toBe(scheduler)
   expect(scheduler).toEqual(snapshot)
   expect(Object.isFrozen(scheduler)).toBe(true)
 })
 it('rejects non-M4 scheduler kinds', () => {
   const invalid: M2Scheduler = { ...resolveM4Scheduler('max-ci'), kind: 'invalid' }
   expect(() => createM4SchedulerRegistry([...M2_SCHEDULERS, invalid])).toThrow('Bilinmeyen')
 })
})
