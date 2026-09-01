# UI/UX Gereksinimleri
Bu belge, ana bilimsel dokümana (`Scheduler_Alg_Sim.docx`, SHA-256 `cdcacc87…e0620`) eklenen yeni ürün (UX)
gereksinimlerini tanımlar. Bilimsel model, slot bazlı motor ve workload limitleri değişmez.
## UX-001 — Yatay slot kaydırması kaldırılır
Slot zaman çizelgesinde yatay scroll KULLANILMAZ. Uygulama: `NrTimeOverview.css` `.nr-time-overview { overflow-
x: hidden }`; eski `SlotTimeline` (yatay şerit) kaldırıldı.
## UX-002 — Tüm zaman aralığı tek genel görünümde
Tüm slotlar aynı panelde responsive grid olarak gösterilir; grid aşağı doğru uzar. Uygulama: `NrTimeOverview`
responsive CSS Grid.
## UX-003 — Frame–subframe–slot hiyerarşisi
Slotlar frame ve subframe grupları altında gösterilir. Türetme: `src/time/nrTimeIndex.ts` (`slotsPerSubframe = 2^μ`; 15
kHz→1, 30 kHz→2). UI katmanıdır; fingerprint'e girmez.
## UX-004 — Hover bilgisi
Slot hücresi üzerine gelince temel bilimsel değerler gösterilir (`aria-label`/`title` = tooltip satırları). Kaynak: view-model
`tooltipRows`.
## UX-005 — Tıklanabilir ayrıntı görünümü
Slot/hücreye tıklanınca ayrıntılı panel açılır. Uygulama: `SlotDetailPanel` (`role="dialog"`, `aria-labelledby`, Escape ile
kapanır, açılışta başlığa focus, kapanışta seçili hücreye focus).
## UX-006 — Grafik tooltip standardı
Tüm grafik noktalarında değer + birim + seri + zaman. Uygulama: `chartStandard.ts` `buildHoverTemplate`/`
hoverTemplateLine`; birim zorunlu.
## UX-007 — Etiket çakışması yasağı
Desteklenen genişliklerde eksen/veri yazıları üst üste binmez. Uygulama: `withChartStandard` → `automargin: true`;
`tickSettings` → viewport'a göre `nticks`/`tickangle`.
## UX-008 — Mobil ve klavye erişimi
Hover gerektiren bilgi tıklama ve klavye odağıyla da erişilebilir. Slotlar `<button>` (Enter/Space seçer), detay paneli
Escape ile kapanır.
## UX-009 — Bilimsel terminoloji
RB başına throughput hesaplanmadığından tooltip'te "RB throughput" uydurulmaz; M1'de UE'nin ulaşılabilir slot hızı
("Slot rate") gösterilir. Eksik değer `N/A`; sıfır ile "unavailable" ayrımı korunur.
## UX-010 — Responsive kontrol matrisi
1440 / 1024 / 768 / 390 px doğrulanır. Otomasyon (browser) mevcut olmadığından görsel doğrulama iddia edilmez;
bkz. `MANUAL_UI_VALIDATION.md`. Kaynak + DOM (renderToStaticMarkup) testleri ayrımı belirtilir.
## Uygulama izlenebilirliği
| Gereksinim | Kaynak dosya | Test |
|---|---|---|
| UX-001/002/003 | `NrTimeOverview.tsx/.css`, `nrTimeIndex.ts` | `NrTimeOverview.test.tsx`, `nrTimeIndex.test.ts` |
| UX-004/005/008 | `SlotDetailPanel.tsx`, `timeAllocationViewModel.ts` | `SlotDetailPanel.test.tsx`,
`timeAllocationViewModel.test.ts` |
| UX-006/007 | `chartStandard.ts`, `PlotlyChart.tsx` | `chartStandard.test.ts` |
| UX-009 | view-model `tooltipRows` (null→N/A) | `timeAllocationViewModel.test.ts` |
