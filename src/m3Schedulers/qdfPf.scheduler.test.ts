import { describe, expect, it } from 'vitest'
import { M2_SCHEDULERS } from '../m2Schedulers'
import { M3_CONFIG } from '../config/m3'
import { M3_SCHEDULERS } from '.'
import type { M2QueueState, M2SchedulerSlotContext } from '../simulation/m2Types'
import qdfPfScheduler, { qdfPfMetric } from './qdfPf.scheduler'
function queue(overrides: Partial<M2QueueState> = {}): M2QueueState {
 const base: M2QueueState = {
   ueIndex: 0,
   ue: { id: 1, achievableRateMbps: 10 } as M2QueueState['ue'],
   qos: {
     fiveQi: 1,
     label: 'voice',
     resourceType: 'GBR',
     priorityLevel: 20,
     packetDelayBudgetMs: 100,
     packetErrorRate: 0.01,
     delayViolationProbability: 0.01,
   },
   traffic: {
     fiveQi: 1,
     arrivalRatePacketsPerSecond: 100,
     packetSizeBytes: 200,
     gbrMbps: 2,
   },
   queuedMbits: 1,
   headOfLineDelayMs: 50,
   averageThroughputMbps: 2,
 }
 return {
   ...base,
   ...overrides,
   ue: { ...base.ue, ...overrides.ue },
   qos: { ...base.qos, ...overrides.qos },
   traffic: { ...base.traffic, ...overrides.traffic },
 }
}
describe('M3 QDF-PF scheduler', () => {
 it('keeps the M2 baseline registry at exactly five schedulers', () => {
   expect(M2_SCHEDULERS.map((scheduler) => scheduler.kind)).toEqual([
     'round-robin',
     'max-ci',
     'proportional-fair',
     'm-lwdf',
     'exp-pf',
   ])
   expect(M2_SCHEDULERS.some((scheduler) => scheduler.kind === 'qdf-pf')).toBe(false)
 })
 it('defines exactly the two baselines and QDF-PF in M3', () => {
   expect(M3_SCHEDULERS.map((scheduler) => scheduler.kind)).toEqual([
     'm-lwdf',
     'exp-pf',
     'qdf-pf',
   ])
 })
 it('matches the documented dimensional formula', () => {
   const item = queue()
   const p = M3_CONFIG.qdfPf
   const pdbSeconds = Math.max(item.qos.packetDelayBudgetMs / 1_000, p.epsilonTimeSeconds)
   const holSeconds = Math.max(item.headOfLineDelayMs / 1_000, p.delta * pdbSeconds)
   const a = -Math.log(item.qos.delayViolationProbability) / pdbSeconds
   const pf = item.ue.achievableRateMbps
     / Math.max(item.averageThroughputMbps, p.epsilonThroughputMbps)
   const deficit = Math.max(0, Math.min(
     1,
     (item.traffic.gbrMbps - item.averageThroughputMbps)
       / Math.max(item.traffic.gbrMbps, p.epsilonGbrMbps),
   ))
   const priority = 1 / item.qos.priorityLevel
   const expected = a * holSeconds * pf
     * (1 + p.beta * deficit)
     * (1 + p.gamma * priority)
   expect(qdfPfMetric(item)).toBeCloseTo(expected, 12)
 })
 it('isolates and increases the GBR-deficit multiplier', () => {
   const noDeficit = queue({
     averageThroughputMbps: 1,
     traffic: { ...queue().traffic, gbrMbps: 1 },
   })
   const deficit = queue({
     averageThroughputMbps: 1,
     traffic: { ...queue().traffic, gbrMbps: 4 },
   })
   expect(qdfPfMetric(deficit)).toBeGreaterThan(qdfPfMetric(noDeficit))
 })
 it('gives higher weight to a numerically higher 5QI priority', () => {
   const highPriority = queue({
     qos: { ...queue().qos, priorityLevel: 10 },
   })
   const lowPriority = queue({
     qos: { ...queue().qos, priorityLevel: 80 },
   })
   expect(qdfPfMetric(highPriority)).toBeGreaterThan(qdfPfMetric(lowPriority))
 })
 it('remains finite at zero historical throughput', () => {
   expect(Number.isFinite(qdfPfMetric(queue({ averageThroughputMbps: 0 })))).toBe(true)
 })
 it('allocates first to the highest metric and uses deterministic tie-breaking', () => {
   const high = queue({ ueIndex: 0, averageThroughputMbps: 0 })
   const low = queue({
     ueIndex: 1,
     ue: { ...queue().ue, id: 2 },
     averageThroughputMbps: 4,
   })
   const context: M2SchedulerSlotContext = {
     slotIndex: 0,
     slotDurationSeconds: 0.001,
     resourceBlocks: 10,
     queues: [high, low],
   }
   const allocations = qdfPfScheduler.createSession().selectAllocations(context)
   expect(allocations[0]?.ueIndex).toBe(0)
 })
})
