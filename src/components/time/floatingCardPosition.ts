export interface FloatingCardPosition { readonly left: number; readonly top: number; readonly above: boolean }
export function positionFloatingCard(target: HTMLElement, estimatedHeight = 260): FloatingCardPosition {
 const rect = target.getBoundingClientRect()
 const cardWidth = Math.min(320, window.innerWidth - 24)
 const left = Math.max(12, Math.min(rect.left + rect.width / 2 - cardWidth / 2, window.innerWidth - cardWidth - 12))
 const above = rect.bottom + estimatedHeight + 12 > window.innerHeight && rect.top > estimatedHeight + 12
 return { left, top: above ? rect.top - 10 : rect.bottom + 10, above }
}
