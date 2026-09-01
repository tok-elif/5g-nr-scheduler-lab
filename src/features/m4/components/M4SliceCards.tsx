import type { M4StatusBadge } from '../m4ViewModel'
import type { ReturnTypeM4ViewModel } from '../types'
const STATUS_LABEL: Record<M4StatusBadge, string> = { ok: 'Sağlandı', warn: 'İhlal var', none: 'Veri yok' }
function StatusDot({ status }: { status: M4StatusBadge }) {
 return <i className={`m4-status-dot m4-status-${status}`} title={STATUS_LABEL[status]} /> }
export function M4SliceCards({ view }: { view: ReturnTypeM4ViewModel }) {
 return <section className="m4-slice-cards" aria-label="Slice sonuç kartları">{view.slices.map((slice) => <article key={slice.id} style={{ borderTopColor: slice.color }}>
   <header><div><i style={{ background: slice.color }} /><h3>{slice.label}</h3></div><span>{slice.ueCount} UE · {slice.scheduler}</span></header>
   {slice.ueCount === 0 && <p className="m4-no-data">Bu slice için UE atanmadı.</p>}
   <dl><div><dt>Throughput</dt><dd>{slice.throughput}</dd></div><div><dt>Teslim</dt><dd>{slice.delivery}</dd> </div><div><dt>P95</dt><dd>{slice.p95}</dd></div><div><dt>Delay ihlali</dt><dd><StatusDot status= {slice.violationStatus} />{slice.violation}</dd></div><div><dt>GBR</dt><dd><StatusDot status={slice.gbrStatus} /> {slice.gbr}</dd></div><div><dt>Fairness</dt><dd>{slice.fairness}</dd></div><div><dt>RB payı</dt><dd>{slice.resourceShare}</dd></div><div><dt>Kullanım</dt><dd>{slice.utilization}</dd></div><div><dt>Final queue</dt><dd> {slice.queue}</dd></div></dl>
 </article>)}</section>
}
