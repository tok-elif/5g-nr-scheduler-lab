import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { M2QosResult, PercentileEstimate } from '../simulation/m2Types'
import { QosPerformancePanel } from './QosPerformancePanel'

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

function qosResult(fiveQi: number, resourceType: 'GBR' | 'Non-GBR'): M2QosResult {
  const isGbr = resourceType === 'GBR'
  return {
    fiveQi,
    qosLabel: isGbr ? 'Conversational voice' : 'Best effort',
    resourceType,
    packetDelayBudgetMs: isGbr ? 100 : 300,
    ueCount: 5,
    gbrUeCount: isGbr ? 5 : 0,
    gbrUeMeetingRatio: isGbr ? 0.8 : null,
    gbrMeanFulfillmentRatio: isGbr ? 0.9 : null,
    aggregateGbrServiceRatio: isGbr ? 0.88 : null,
    gbrMeetingRatio: isGbr ? 0.8 : null,
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
    delayP99Ms: 130,
    delayP50Estimate: estimate(42, 0.5),
    delayP95Estimate: estimate(95, 0.95),
    delayP99Estimate: estimate(130, 0.99),
  }
}

describe('QosPerformancePanel', () => {
  it('renders separate latency, delivery and GBR charts', () => {
    const html = renderToStaticMarkup(<QosPerformancePanel result={{ qosResults: [qosResult(1, 'GBR'), qosResult(9, 'Non-GBR')] }} chartIdPrefix="test-qos" />)
    expect(html).toContain('id="test-qos-latency-chart"')
    expect(html).toContain('id="test-qos-delivery-chart"')
    expect(html).toContain('id="test-qos-gbr-chart"')
    expect(html).toContain('5QI sınıflarında yüzdelikler ve PDB hedefi')
    expect(html).toContain('class="qos-latency-grid"')
    expect(html).toContain('Etkileşimli ayrıntılı grafiği aç')
    expect(html).toContain('P99 = 1,3× PDB')
    expect(html).toContain('Teslim başarısı ve PDB uyumu')
    expect(html).toContain('Yalnız GBR sınıfları')
  })

  it('can hide the shared latency view for the M3-specific vertical chart', () => {
    const html = renderToStaticMarkup(<QosPerformancePanel
      result={{ qosResults: [qosResult(1, 'GBR'), qosResult(9, 'Non-GBR')] }}
      chartIdPrefix="m3-test-qos"
      showLatencyChart={false}
    />)
    expect(html).not.toContain('id="m3-test-qos-latency-chart"')
    expect(html).toContain('id="m3-test-qos-delivery-chart"')
    expect(html).toContain('id="m3-test-qos-gbr-chart"')
  })

  it('keeps GBR and Non-GBR classes visually distinct and preserves N/A semantics', () => {
    const html = renderToStaticMarkup(<QosPerformancePanel result={{ qosResults: [qosResult(1, 'GBR'), qosResult(9, 'Non-GBR')] }} />)
    expect(html).toContain('class="m2-qos-card is-gbr"')
    expect(html).toContain('class="m2-qos-card is-non-gbr"')
    expect(html).toContain('Non-GBR sınıfı')
    expect(html).toContain('N/A')
  })
})
