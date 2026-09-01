function triggerDownload(blob: Blob, filename: string): void {
 const url = URL.createObjectURL(blob)
 const anchor = document.createElement('a')
 anchor.href = url
 anchor.download = filename
 document.body.append(anchor)
 anchor.click()
 anchor.remove()
 URL.revokeObjectURL(url)
}
export function downloadText(content: string, filename: string, mimeType: string): void {
 const prefix = mimeType.includes('csv') ? '\uFEFF' : ''
 triggerDownload(new Blob([prefix, content], { type: `${mimeType};charset=utf-8` }), filename)
}
export function downloadSvgAsPng(svgId: string, filename: string, scale = 3): Promise<void> {
 return new Promise((resolve, reject) => {
   const svg = document.getElementById(svgId)
   if (!(svg instanceof SVGSVGElement)) {
     reject(new Error(`SVG bulunamadı: ${svgId}`))
     return
   }
   const clone = svg.cloneNode(true) as SVGSVGElement
   clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
   const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
   style.textContent = `
     text { fill:#5f6f85; font-family:Inter,Arial,sans-serif; }
     text:not([font-size]) { font-size:11px; }
     .axis-title { fill:#334155; font-size:12px; font-weight:700; }
     .grid-line { stroke:#e7edf4; stroke-width:1; }
     .axis { stroke:#aebaca; stroke-width:1; }
     .fairness-chart circle { fill:#94a3b8; stroke:#ffffff; stroke-width:2; }
     .fairness-chart .selected-point circle { fill:#315d9b; stroke:#203f6c; stroke-width:3; }
     .fairness-chart .selected-point text { fill:#294f85; font-weight:700; }
     .matrix-background { fill:#ffffff; }
     .matrix-card > rect { fill:#ffffff; stroke:#dbe2ec; }
     .matrix-card-title { fill:#17233c; font-size:12px; font-weight:700; }
     .matrix-card-subtitle,.matrix-tick { fill:#64748b; font-size:9px; }
     .matrix-axis-title { fill:#475569; font-size:9px; font-weight:700; }
     .matrix-point .error-bar { stroke:currentColor; stroke-width:1.2; opacity:.68; }
     .matrix-point circle,.matrix-legend circle { fill:currentColor; stroke:#ffffff; stroke-width:1.5; }
     .matrix-point-label { fill:currentColor; font-size:8px; font-weight:700; paint-order:stroke; stroke:#ffffff; stroke-width:3px; }
     .matrix-legend text { fill:#475569; font-size:10px; font-weight:700; }
   `
   clone.prepend(style)
   const serialized = new XMLSerializer().serializeToString(clone)
   const svgUrl = URL.createObjectURL(new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }))
   const image = new Image()
   image.onload = () => {
     const viewBox = svg.viewBox.baseVal
     const width = Math.max(viewBox.width, svg.clientWidth)
     const height = Math.max(viewBox.height, svg.clientHeight)
     const canvas = document.createElement('canvas')
     canvas.width = Math.round(width * scale)
     canvas.height = Math.round(height * scale)
     const context = canvas.getContext('2d')
     if (!context) {
       URL.revokeObjectURL(svgUrl)
       reject(new Error('PNG tuvali oluşturulamadı.'))
       return
     }
     context.scale(scale, scale)
     context.fillStyle = '#ffffff'
     context.fillRect(0, 0, width, height)
     context.drawImage(image, 0, 0, width, height)
     URL.revokeObjectURL(svgUrl)
     canvas.toBlob((blob) => {
       if (!blob) {
         reject(new Error('PNG çıktısı oluşturulamadı.'))
         return
       }
       triggerDownload(blob, filename)
       resolve()
     }, 'image/png')
   }
   image.onerror = () => {
     URL.revokeObjectURL(svgUrl)
     reject(new Error('SVG görüntüsü PNG için yüklenemedi.'))
   }
   image.src = svgUrl
 })
}
