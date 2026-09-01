import { createPortal } from 'react-dom'
import type { CSSProperties, ReactNode } from 'react'
import type { FloatingCardPosition } from './floatingCardPosition'
export function FloatingInfoCard({ id, position, title, children }: { readonly id: string; readonly position: FloatingCardPosition | null; readonly title: string; readonly children: ReactNode }) {
 if (!position || typeof document === 'undefined') return null
 const style = { left: position.left, top: position.top, '--card-shift-y': position.above ? '-100%' : '0' } as CSSProperties
 return createPortal(<div className="floating-info-card" id={id} role="tooltip" style={style}><strong>{title}</strong> {children}</div>, document.body)
}
