import { describe, expect, it } from 'vitest'
import { getScheduler, SCHEDULERS } from '.'
describe('automatic scheduler registry', () => {
 it('discovers every built-in scheduler in declared order', () => {
   expect(SCHEDULERS.map((scheduler) => scheduler.kind)).toEqual(expect.arrayContaining([
     'round-robin',
     'max-ci',
     'proportional-fair',
   ]))
 })
 it('registers unique, executable scheduler definitions', () => {
   expect(new Set(SCHEDULERS.map((scheduler) => scheduler.kind)).size).toBe(SCHEDULERS.length)
   for (const scheduler of SCHEDULERS) {
     expect(scheduler.label.trim()).not.toBe('')
     expect(scheduler.createSession).toBeTypeOf('function')
     expect(scheduler.shortLabel.trim()).not.toBe('')
     expect(scheduler.color).toMatch(/^#[0-9a-f]{6}$/i)
     expect(getScheduler(scheduler.kind)).toBe(scheduler)
   }
 })
 it('rejects unknown scheduler identifiers', () => {
   expect(() => getScheduler('not-registered')).toThrow('Bilinmeyen scheduler')
 })
})
