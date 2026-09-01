import type { ReturnTypeM4ViewModel } from '../types'
export function M4CellSummary({ view }: { view: ReturnTypeM4ViewModel }) {
 const items = [
   ['Toplam throughput', view.cell.throughput],
   ['Paket teslim oranı', view.cell.delivery],
   ['P95 packet delay', view.cell.p95],
   ['Jain fairness', view.cell.fairness],
   ['Scheduler kullanımı', view.cell.utilization],
   ['Final queue', view.cell.queue],
 ]
 return <section className="m4-cell-summary" aria-label="M4 hücre özeti">{items.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
}
