import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { M4ConfigurationPanel } from './components/M4ConfigurationPanel'
import { createDefaultM4FormState, validateM4FormState } from './m4FormState'
const renderPanel = (running = false, valid = true) => {
 const state = valid ? createDefaultM4FormState() : { ...createDefaultM4FormState(), slotCount: 0 }
 return renderToStaticMarkup(<M4ConfigurationPanel
   state={state}
   validation={validateM4FormState(state)}
   running={running}
   onChange={vi.fn()}
   onSubmit={vi.fn()}
   onCancel={vi.fn()}
   onReset={vi.fn()}
 />)
}
const runButton = (html: string) => html.match(/<button[^>]*>M4 Simülasyonunu Çalıştır<\/button>/)?.[0] ?? ''
describe('rendered M4 form DOM', () => {
 it('renders the run button', () => expect(runButton(renderPanel())).toContain('M4 Simülasyonunu Çalıştır'))
 it('renders run as submit', () => expect(runButton(renderPanel())).toContain('type="submit"'))
 it('renders the required form id', () => expect(renderPanel()).toContain('<form id="m4-simulation-form"'))
 it('connects the submit button by nesting it in the form', () => { const html = renderPanel();
expect(html.indexOf('<form')).toBeLessThan(html.indexOf(runButton(html))); expect(html.indexOf(runButton( html))).toBeLessThan(html.indexOf('</form>')) })
 it('disables native validation blocking', () => expect(renderPanel()).toContain('noValidate=""'))
 it('enables valid default submit', () => expect(runButton(renderPanel())).not.toContain('disabled=""'))
 it('disables invalid submit', () => expect(runButton(renderPanel(false, false))).toContain('disabled=""'))
 it('disables and relabels running submit', () => { const html = renderPanel(true); expect(html).toContain('type="submit"'); expect(html).toContain('Simülasyon çalışıyor…') })
 it('uses explicit non-submit cancel and reset buttons', () => expect(renderPanel().match(/type="button"/g)).toHaveLength(2))

 it('shows the collective 100 UE limit', () => {
   const html = renderPanel()
   expect(html).toContain('Toplam etkin UE')
   expect(html).toContain('/ 100')
   expect(html).toContain('toplam sınır 100')
 })
 it('renders dynamic maximum values on slice UE inputs', () => {
   const html = renderPanel()
   expect(html).toMatch(/type="number" min="0" max="\d+"/)
 })
 it('renders static-weighted as read-only information without a policy select', () => { const html = renderPanel();
expect(html).toContain('m4-readonly-field'); expect(html).toContain('Static weighted'); expect(html).not.toContain('<option value="static-weighted"') })
})
