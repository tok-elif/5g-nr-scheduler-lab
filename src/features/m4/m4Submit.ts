import type { FormEvent } from 'react'
import type { M4RunInput } from '../../simulation/m4Types'
import { createM4RunInputFromForm, validateM4FormState, type M4FormState } from './m4FormState'
export function submitM4Form(input: {
 readonly event: Pick<FormEvent<HTMLFormElement>, 'preventDefault'>
 readonly state: M4FormState
 readonly running: boolean
 readonly run: (runInput: M4RunInput) => void
}): string | null {
 input.event.preventDefault()
 if (input.running) return 'Simülasyon başlatılamıyor: Bir M4 simülasyonu zaten çalışıyor.'
 const validation = validateM4FormState(input.state)
 if (!validation.valid) return `Simülasyon başlatılamıyor: ${validation.errors.join(' ')}`
 try {
   input.run(createM4RunInputFromForm(input.state))
   return null
 } catch (error) {
   return `Simülasyon çalıştırılamadı: ${error instanceof Error ? error.message : 'Bilinmeyen form dönüştürmehatası.'}`
 }
}
