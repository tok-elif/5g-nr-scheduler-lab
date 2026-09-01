import { describe, expect, it } from 'vitest'
import { createM4RuntimeConfig, validateM4RuntimeConfig } from '../config/m4Config'
import type { M2QueueState, M2Scheduler } from './m2Types'
import { createM4SchedulerOrchestrator } from './m4SchedulerOrchestrator'
import { M4_SCHEDULER_KINDS } from './m4Types'
import { createUeSliceMapping } from './sliceMapping'
import type { ResourceAllocation } from './types'
const queue = (ueIndex: number, queuedMbits = 1): M2QueueState => ({
 ueIndex,
 ue: {
   id: ueIndex + 1, sinrDb: 10, cqi: 10, cqiSpectralEfficiency: 2,
   mcsIndex: 10, mcs: 'MCS', mcsTable: 'PDSCH Table 1', modulation: 'QPSK',
   targetCodeRateX1024: 100, mcsSpectralEfficiency: 2, spectralEfficiency: 2,
   achievableRateMbps: 10,
 },
 qos: {
   fiveQi: 9, label: 'BE', resourceType: 'Non-GBR', priorityLevel: 90,
   packetDelayBudgetMs: 300, packetErrorRate: 1e-6, delayViolationProbability: 0.01,
 },
 traffic: { fiveQi: 9, arrivalRatePacketsPerSecond: 80, packetSizeBytes: 1500, gbrMbps: 0 },
 queuedMbits,
 headOfLineDelayMs: 1,
 averageThroughputMbps: 1,
})
const make = (traceLimit = 2) => {
 const config = createM4RuntimeConfig(3, { embb: 1, urllc: 1, mmtc: 1 })
 const mapping = createUeSliceMapping(3, { embb: 1, urllc: 1, mmtc: 1 })
 return createM4SchedulerOrchestrator({
   config, mapping, cellTotalResourceBlocks: 15, resourceTraceSlotLimit: traceLimit,
 })
}
const orchestratorWithOutput = (allocations: readonly ResourceAllocation[]) => {
 const config = createM4RuntimeConfig(1, { embb: 1, urllc: 0, mmtc: 0 })
 const mapping = createUeSliceMapping(1, { embb: 1, urllc: 0, mmtc: 0 })
 const fake: M2Scheduler = {
   kind: 'fake',
   label: 'Fake',
   shortLabel: 'Fake',
   color: '#000000',
   createSession: () => ({ selectAllocations: () => allocations }),
 }
 const orchestrator = createM4SchedulerOrchestrator({
   config,
   mapping,
   cellTotalResourceBlocks: 15,
   resourceTraceSlotLimit: 1,
   resolveScheduler: () => fake,
 })
 return () => orchestrator.createSession().schedulerSession.selectAllocations({
   slotIndex: 0,
   slotDurationSeconds: 0.001,
   resourceBlocks: 15,
   queues: [queue(0)],
 })
}
describe('M4 composite scheduler orchestrator', () => {
 it('combines local allocations back to global UE indices', () => {
   const orchestrator = make()
   const allocations = orchestrator.createSession().schedulerSession.selectAllocations({
     slotIndex: 0, slotDurationSeconds: 0.001, resourceBlocks: 15,
     queues: [queue(0), queue(1), queue(2)],
   })
   expect(allocations.map((item) => item.ueIndex).sort()).toEqual([0, 1, 2])
   expect(allocations.reduce((sum, item) => sum + item.resourceBlocks, 0)).toBeLessThanOrEqual(15)
 })
 it('preserves sessions across slots and isolates sessions from the same orchestrator', () => {
   const orchestrator = make()
   const first = orchestrator.createSession()
   const second = orchestrator.createSession()
   const context = {
     slotIndex: 0, slotDurationSeconds: 0.001, resourceBlocks: 15,
     queues: [queue(0), queue(1), queue(2)],
   }
   expect(first.getResourceTrace()).toHaveLength(0)
   expect(second.getResourceTrace()).toHaveLength(0)
   expect(first.getResourceTotals().cell.processedSlotCount).toBe(0)
   expect(second.getResourceTotals().cell.processedSlotCount).toBe(0)
   first.schedulerSession.selectAllocations(context)
   const firstTrace = first.getResourceTrace()
   const firstTotals = first.getResourceTotals()
   expect(firstTrace).toHaveLength(1)
   expect(firstTotals.cell.processedSlotCount).toBe(1)
   expect(second.getResourceTrace()).toHaveLength(0)
   expect(second.getResourceTotals().cell.processedSlotCount).toBe(0)
   second.schedulerSession.selectAllocations({ ...context, slotIndex: 1 })
   expect(second.getResourceTrace()).toHaveLength(1)
   expect(second.getResourceTotals().cell.processedSlotCount).toBe(1)
   expect(first.getResourceTrace()).toEqual(firstTrace)
   expect(first.getResourceTotals()).toEqual(firstTotals)
   expect(Object.isFrozen(firstTrace)).toBe(true)
   expect(Object.isFrozen(firstTotals.slices[0])).toBe(true)
 })
 it('creates independent subordinate scheduler state per composite session', () => {
   const config = createM4RuntimeConfig(1, { embb: 1, urllc: 0, mmtc: 0 })
   const mapping = createUeSliceMapping(1, { embb: 1, urllc: 0, mmtc: 0 })
   let createdSessions = 0
   const fake: M2Scheduler = {
     kind: 'fake', label: 'Fake', shortLabel: 'Fake', color: '#000000',
     createSession: () => {
       createdSessions += 1
       let callCount = 0
       return {
         selectAllocations: () => {
           callCount += 1
           return [{ ueIndex: 0, resourceBlocks: callCount }]
         },
       }
     },
   }
   const orchestrator = createM4SchedulerOrchestrator({
     config,
     mapping,
     cellTotalResourceBlocks: 15,
     resourceTraceSlotLimit: 3,
     resolveScheduler: () => fake,
   })
   const first = orchestrator.createSession()
   const second = orchestrator.createSession()
   const context = {
     slotIndex: 0, slotDurationSeconds: 0.001, resourceBlocks: 15, queues: [queue(0)],
   }
   expect(first.schedulerSession.selectAllocations(context)[0].resourceBlocks).toBe(1)
   expect(first.schedulerSession.selectAllocations({ ...context, slotIndex: 1 })[0].resourceBlocks).toBe(2)
   expect(second.schedulerSession.selectAllocations(context)[0].resourceBlocks).toBe(1)
   expect(createdSessions).toBe(2)
 })
 it('does not create work for zero-UE slices', () => {
   const config = createM4RuntimeConfig(1, { embb: 1, urllc: 0, mmtc: 0 })
   const mapping = createUeSliceMapping(1, { embb: 1, urllc: 0, mmtc: 0 })
   const orchestrator = createM4SchedulerOrchestrator({
     config, mapping, cellTotalResourceBlocks: 15, resourceTraceSlotLimit: 1,
   })
   expect(() => orchestrator.createSession().schedulerSession.selectAllocations({
     slotIndex: 0, slotDurationSeconds: 0.001, resourceBlocks: 15, queues: [queue(0)],
   })).not.toThrow()
 })
 it('distinguishes allocated, used and unused RB', () => {
   const orchestrator = make()
   const session = orchestrator.createSession()
   session.schedulerSession.selectAllocations({
     slotIndex: 0, slotDurationSeconds: 0.001, resourceBlocks: 15,
     queues: [queue(0, 0), queue(1, 0), queue(2, 0)],
   })
   const slot = session.getResourceTrace()[0]
   expect(slot.totalSchedulerUsedResourceBlocks + slot.totalSchedulerUnusedResourceBlocks)
     .toBe(slot.totalAllocatedResourceBlocks)
 })
 it('bounds trace while streaming all slot totals', () => {
   const orchestrator = make(1)
   const session = orchestrator.createSession()
   for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
     session.schedulerSession.selectAllocations({
       slotIndex, slotDurationSeconds: 0.001, resourceBlocks: 15,
       queues: [queue(0), queue(1), queue(2)],
     })
   }
   expect(session.getResourceTrace()).toHaveLength(1)
   expect(session.getResourceTotals().cell.processedSlotCount).toBe(3)
 })
 it('supports trace limit zero', () => {
   const orchestrator = make(0)
   const session = orchestrator.createSession()
   session.schedulerSession.selectAllocations({
     slotIndex: 0, slotDurationSeconds: 0.001, resourceBlocks: 15,
     queues: [queue(0), queue(1), queue(2)],
   })
   expect(session.getResourceTrace()).toHaveLength(0)
 })
 it('preserves physical RB capacity under slice budget scaling', () => {
   const orchestrator = make()
   const session = orchestrator.createSession()
   session.schedulerSession.selectAllocations({
     slotIndex: 0, slotDurationSeconds: 0.001, resourceBlocks: 15,
     queues: [queue(0, 0.01), queue(1, 0.01), queue(2, 0.01)],
   })
   expect(session.getResourceTrace()[0].slices.every(
     (slice) => slice.schedulerUsedResourceBlocks <= slice.allocatedResourceBlocks,
   )).toBe(true)
 })
 it('smoke-tests all six real schedulers', () => {
   for (const scheduler of M4_SCHEDULER_KINDS) {
     const base = createM4RuntimeConfig(1, { embb: 1, urllc: 0, mmtc: 0 })
     const config = validateM4RuntimeConfig({
       ...base,
       slices: base.slices.map((slice) => ({ ...slice, scheduler: slice.id === 'embb' ? scheduler : slice.scheduler })),
     })
     const mapping = createUeSliceMapping(1, { embb: 1, urllc: 0, mmtc: 0 })
     const orchestrator = createM4SchedulerOrchestrator({
       config, mapping, cellTotalResourceBlocks: 15, resourceTraceSlotLimit: 1,
     })
     expect(() => orchestrator.createSession().schedulerSession.selectAllocations({
       slotIndex: 0, slotDurationSeconds: 0.001, resourceBlocks: 15, queues: [queue(0)],
     })).not.toThrow()
   }
 })
 it('keeps caller queues and UEs mutable and output immutable', () => {
   const queues = [queue(0), queue(1), queue(2)]
   const before = structuredClone(queues)
   const orchestrator = make()
   const session = orchestrator.createSession()
   session.schedulerSession.selectAllocations({
     slotIndex: 0, slotDurationSeconds: 0.001, resourceBlocks: 15, queues,
   })
   expect(queues).toEqual(before)
   expect(Object.isFrozen(queues[0])).toBe(false)
   expect(Object.isFrozen(session.getResourceTrace())).toBe(true)
   expect(Object.isFrozen(session.getResourceTotals().slices[0])).toBe(true)
 })
 it('rejects mismatched cell budgets and invalid trace limits', () => {
   expect(() => make().createSession().schedulerSession.selectAllocations({
     slotIndex: 0, slotDurationSeconds: 0.001, resourceBlocks: 10,
     queues: [queue(0), queue(1), queue(2)],
   })).toThrow('RB bağlamı')
   expect(() => createM4SchedulerOrchestrator({
     config: createM4RuntimeConfig(1, { embb: 1, urllc: 0, mmtc: 0 }),
     mapping: createUeSliceMapping(1, { embb: 1, urllc: 0, mmtc: 0 }),
     cellTotalResourceBlocks: 15,
     resourceTraceSlotLimit: -1,
   })).toThrow()
 })
 it('rejects duplicate local allocations from an injected scheduler', () => {
   expect(orchestratorWithOutput([
     { ueIndex: 0, resourceBlocks: 1 },
     { ueIndex: 0, resourceBlocks: 1 },
   ])).toThrow('duplicate local')
 })
 it.each([-1, 1, 0.5, Number.NaN, Number.POSITIVE_INFINITY])(
   'rejects invalid local UE index %s',
   (ueIndex) => {
     expect(orchestratorWithOutput([{ ueIndex, resourceBlocks: 1 }])).toThrow('local UE index')
   },
 )
 it.each([-1, 0, 0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
   'rejects invalid resource block output %s',
   (resourceBlocks) => {
     expect(orchestratorWithOutput([{ ueIndex: 0, resourceBlocks }])).toThrow('pozitif güvenli tam sayı')
   },
 )
 it('rejects slice and therefore cell budget excess', () => {
   expect(orchestratorWithOutput([{ ueIndex: 0, resourceBlocks: 16 }])).toThrow('slice bütçesini')
 })
 it('rejects duplicate global UE adaptation across slices', () => {
   const config = createM4RuntimeConfig(2, { embb: 1, urllc: 1, mmtc: 0 })
   const valid = createUeSliceMapping(2, { embb: 1, urllc: 1, mmtc: 0 })
   const duplicateMapping = {
     ...valid,
     ueIndicesBySlice: { ...valid.ueIndicesBySlice, urllc: [0] },
   }
   const fake: M2Scheduler = {
     kind: 'fake', label: 'Fake', shortLabel: 'Fake', color: '#000000',
     createSession: () => ({
       selectAllocations: () => [{ ueIndex: 0, resourceBlocks: 1 }],
     }),
   }
   const orchestrator = createM4SchedulerOrchestrator({
     config,
     mapping: duplicateMapping,
     cellTotalResourceBlocks: 15,
     resourceTraceSlotLimit: 1,
     resolveScheduler: () => fake,
   })
   expect(() => orchestrator.createSession().schedulerSession.selectAllocations({
     slotIndex: 0,
     slotDurationSeconds: 0.001,
     resourceBlocks: 15,
     queues: [queue(0), queue(1)],
   })).toThrow('Duplicate global')
 })
})
