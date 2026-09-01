import { describe, expect, it } from 'vitest'
import { runM4 } from '../../simulation/m4'
import { makeM4TestInput } from '../../testing/m4Fixture'
import { createM4ViewModel, formatNumber, formatPercent } from './m4ViewModel'
const makeView = (trace = 3) => createM4ViewModel(runM4(makeM4TestInput(trace)))
describe('M4 view model', () => {
 it('formats cell summary', () => expect(makeView().cell.throughput).toContain('Mbps'))
 it('formats null as dash', () => expect(formatNumber(null)).toBe('—'))
 it('preserves zero', () => expect(formatNumber(0)).not.toBe('—'))
 it('formats percentages', () => expect(formatPercent(0.5)).toContain('50'))
 it('formats Mbps', () => expect(formatNumber(2, ' Mbps')).toContain('Mbps'))
 it('formats milliseconds', () => expect(formatNumber(2, ' ms')).toContain('ms'))
 it('keeps canonical slice order', () => expect(makeView().slices.map((x) => x.id)).toEqual(['embb', 'urllc', 'mmtc']))
 it('keeps all slices', () => expect(makeView().slices).toHaveLength(3))
 it('resolves scheduler labels', () => expect(makeView().slices.every((x) => x.scheduler.length > 0)).toBe(true))
 it('preserves resource conservation values', () => expect(makeView().slices.every((x) => x.used + x.unused === x.allocated)).toBe(true))
 it('keeps cell-unallocated separate', () => expect(makeView().cell.unallocated).toBeGreaterThanOrEqual(0))
 it('provides latency data', () => expect(makeView().slices.some((x) => x.latencyAvailable)).toBe(true))
 it('marks unavailable latency safely', () => expect(formatNumber(Number.NaN)).toBe('—'))
 it('creates trace rows', () => expect(makeView().trace.length).toBeGreaterThan(0))
 it('supports empty trace', () => expect(makeView(0).trace).toHaveLength(0))
 it('creates deterministic export filename', () => expect(makeView().exportFilename).toMatch(/^m4-result-.+\.json$/))
 it('is deterministic', () => expect(makeView()).toEqual(makeView()))
 it('does not mutate result', () => { const result = runM4(makeM4TestInput()); const before = structuredClone(result); createM4ViewModel(result); expect(result).toEqual(before) })
 it('does not render infinity', () => expect(formatPercent(Infinity)).toBe('—'))
 it('returns an immutable root', () => expect(Object.isFrozen(makeView())).toBe(true))
})
