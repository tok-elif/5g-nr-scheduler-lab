export async function downloadPlotlyChartAsPng(rootId: string, filename: string): Promise<void> {
 const root = document.getElementById(rootId)
 if (!root) throw new Error(`Grafik bulunamadı: ${rootId}`)
 if (!window.Plotly) throw new Error('Etkileşimli grafik henüz yüklenmedi.')
 await window.Plotly.downloadImage(root, { format:'png', filename:filename.replace(/\.png$/i,''), scale:2 }) }
