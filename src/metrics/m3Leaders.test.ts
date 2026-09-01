import { describe, expect, it } from 'vitest'
import type { M2Result } from '../simulation/m2Types'
import { getM3MetricLeaderGroups } from './m3Leaders'
function result(input: {
 scheduler: string
 throughput: number
 fairness: number
 delivered: number
 generated: number
 gbrSatisfied: boolean
 p99: number
 pdb: number
 queue: number
}): M2Result {
 return {
   scheduler: input.scheduler,
   schedulerLabel: input.scheduler,
   cellThroughputMbps: input.throughput,
   jainFairness: input.fairness,
   deliveredPackets: input.delivered,
   generatedPackets: input.generated,
   pdbViolationRatio: input.pdb,
   queuedPackets: input.queue,
   ueResults: [{
     resourceType: 'GBR',
     gbrSatisfied: input.gbrSatisfied,
   }],
   qosResults: [{
     delayP99Ms: input.p99,
   }],
 } as unknown as M2Result
}
describe('M3 dynamic metric leaders', () => {
 it('selects leaders according to each metric direction', () => {
   const a = result({
     scheduler: 'a',
     throughput: 20,
     fairness: 0.9,
     delivered: 90,
     generated: 100,
     gbrSatisfied: true,
     p99: 40,
     pdb: 0.05,
     queue: 10,
   })
   const b = result({
     scheduler: 'b',
     throughput: 30,
     fairness: 0.8,
     delivered: 95,
     generated: 100,
     gbrSatisfied: false,
     p99: 70,
     pdb: 0.1,
     queue: 20,
   })
   const groups = getM3MetricLeaderGroups([a, b])
   const leader = (metric: string) =>
     groups.find((group) => group.metric === metric)?.leaders.map((item) => item.scheduler)
   expect(leader('throughput')).toEqual(['b'])
   expect(leader('fairness')).toEqual(['a'])
   expect(leader('delivery')).toEqual(['b'])
   expect(leader('gbr')).toEqual(['a'])
   expect(leader('p99')).toEqual(['a'])
   expect(leader('pdb')).toEqual(['a'])
   expect(leader('queue')).toEqual(['a'])
 })
 it('keeps numerically tied schedulers as joint leaders', () => {
   const a = result({
     scheduler: 'a',
     throughput: 10,
     fairness: 0.8,
     delivered: 10,
     generated: 10,
     gbrSatisfied: true,
     p99: 20,
     pdb: 0,
     queue: 0,
   })
   const b = result({
     scheduler: 'b',
     throughput: 10 + 1e-12,
     fairness: 0.8,
     delivered: 10,
     generated: 10,
     gbrSatisfied: true,
     p99: 20,
     pdb: 0,
     queue: 0,
   })
   const throughput = getM3MetricLeaderGroups([a, b])
     .find((group) => group.metric === 'throughput')
   expect(throughput?.leaders.map((item) => item.scheduler)).toEqual(['a', 'b'])
 })
})
