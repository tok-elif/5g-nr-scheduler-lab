import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadText } from './download'
describe('text download integration', () => {
 afterEach(() => vi.unstubAllGlobals())
 it('clicks a deterministic filename and always revokes the object URL', () => {
   const click = vi.fn()
   const remove = vi.fn()
   const append = vi.fn()
   const anchor = { href: '', download: '', click, remove }
   const createObjectURL = vi.fn(() => 'blob:r5')
   const revokeObjectURL = vi.fn()
   vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
   vi.stubGlobal('document', { createElement: () => anchor, body: { append } })
   downloadText('{"schemaVersion":1}', 'm4-result-M4-safe.json', 'application/json')
   expect(anchor.download).toBe('m4-result-M4-safe.json')
   expect(click).toHaveBeenCalledOnce()
   expect(remove).toHaveBeenCalledOnce()
   expect(revokeObjectURL).toHaveBeenCalledWith('blob:r5')
 })
})
