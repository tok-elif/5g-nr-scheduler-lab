interface PlotlyStatic {
 react(
   root: HTMLElement,
   data: ReadonlyArray<Record<string, unknown>>,
   layout?: Record<string, unknown>,
   config?: Record<string, unknown>,
 ): Promise<void>
 purge(root: HTMLElement): void
 downloadImage(root: HTMLElement, options: Record<string, unknown>): Promise<string> }
interface Window {
 Plotly?: PlotlyStatic
}
