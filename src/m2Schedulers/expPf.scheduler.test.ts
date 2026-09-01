import { describe, expect, it } from 'vitest'
import type { M2QueueState } from '../simulation/m2Types'
import { hasSchedulableBacklog } from './allocation'
import { expPfMeanUrgency } from './expPf.scheduler'
function queue(queuedMbits: number, headOfLineDelayMs = 50): M2QueueState {
 return {
   ueIndex: 0,
   ue: { id: 1, achievableRateMbps: 10 } as M2QueueState['ue'],
   qos: {
     fiveQi: 1,
     label: 'GBR test',
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
     gbrMbps: 0.2,
   },
   queuedMbits,
   headOfLineDelayMs,
   averageThroughputMbps: 1,
 }
}
describe('EXP/PF schedulable queue set', () => {
 it('uses the same backlog predicate for mean urgency and allocation eligibility', () => {
   const schedulable = queue(1, 100)
   const belowNumericalThreshold = queue(Number.EPSILON, 10_000)
   expect(hasSchedulableBacklog(schedulable)).toBe(true)
   expect(hasSchedulableBacklog(belowNumericalThreshold)).toBe(false)
   expect(expPfMeanUrgency([schedulable, belowNumericalThreshold]))
     .toBeCloseTo(expPfMeanUrgency([schedulable]), 12)
 })
})
