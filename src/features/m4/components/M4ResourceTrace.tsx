import type { ReturnTypeM4ViewModel } from '../types'
export function M4ResourceTrace({ view }: { view: ReturnTypeM4ViewModel }) {
 return <section className="panel"><h2>Bounded resource trace</h2>{view.trace.length === 0
   ? <p className="m4-no-data">Resource trace kaydedilmedi. Trace limitini artırarak yeniden çalıştırın.</p>
   : <div className="m4-table-scroll"><table><thead><tr><th>Slot</th><th>eMBB A/U</th><th>URLLC A/U</th> <th>mMTC A/U</th><th>Cell-unallocated</th><th>Korunum</th></tr></thead><tbody>{view.trace.map((row) => <tr key={row.slotIndex}><td>{row.slotIndex}</td>{row.slices.map((slice) => <td key={slice.id}>{slice.allocated}/{slice.used} </td>)}<td>{row.unallocated}</td><td>{row.conservation ? 'Sağlandı' : 'İhlal'}</td></tr>)}</tbody></table></div>} </section>
}
