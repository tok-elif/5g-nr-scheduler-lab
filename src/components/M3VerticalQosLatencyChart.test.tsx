import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { M2QosResult, PercentileEstimate } from '../simulation/m2Types'
import { M3VerticalQosLatencyChart } from './M3VerticalQosLatencyChart'

function estimate(value: number, percentile: number): PercentileEstimate {
  return {
    value,
    sampleCount: 150,
    status: 'sufficient',
    method: 'hyndman-fan-r7-linear-interpolation',
    percentile,
    minimumRequiredSampleCount: percentile === 0.99 ? 100 : 1,
  }
}

function qosResult(fiveQi: number, pdb: number, p99: number): M2QosResult {
  return {
    fiveQi,
    qosLabel: fiveQi === 1 ? 'Conversational voice' : 'Best effort',
    resourceType: fiveQi === 1 ? 'GBR' : 'Non-GBR',
    packetDelayBudgetMs: pdb,
    ueCount: 5,
    gbrUeCount: fiveQi === 1 ? 5 : 0,
    gbrUeMeetingRatio: fiveQi === 1 ? 0.8 : null,
    gbrMeanFulfillmentRatio: fiveQi === 1 ? 0.9 : null,
    aggregateGbrServiceRatio: fiveQi === 1 ? 0.88 : null,
    gbrMeetingRatio: fiveQi === 1 ? 0.8 : null,
    generatedPackets: 200,
    deliveredPackets: 180,
    queuedPackets: 20,
    queuedBytes: 24000,
    undeliveredRatio: 0.1,
    latencySamplePackets: 180,
    pdbViolationPackets: 18,
    pdbViolationRatio: 0.1,
    overdueQueuedPackets: 4,
    oldestQueuedPacketAgeMs: 450,
    delayP50Ms: 42,
    delayP95Ms: 95,
    delayP99Ms: p99,
    delayP50Estimate: estimate(42, 0.5),
    delayP95Estimate: estimate(95, 0.95),
    delayP99Estimate: estimate(p99, 0.99),
  }
}

describe('M3VerticalQosLatencyChart', () => {
  it('renders the M3-only vertical latency chart and status strip', () => {
    const html = renderToStaticMarkup(<M3VerticalQosLatencyChart rows={[
      qosResult(1, 100, 130),
      qosResult(9, 300, 220),
    ]} />)

    expect(html).toContain('id="m3-qos-latency-vertical-chart"')
    expect(html).toContain('5QI sınıflarında P50, P95, P99 ve PDB hedefi')
    expect(html).toContain('P99 hedefi aşıyor')
    expect(html).toContain('P99 hedef içinde')
  })
})
