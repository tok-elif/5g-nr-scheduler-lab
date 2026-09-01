# Manuel Tarayıcı Doğrulama Matrisi
> ⚠️ Bu projede gerçek browser automation (Playwright/jsdom) **kurulu değildir** ve bu görevde yeni bağımlılık
eklenmemiştir. Aşağıdaki kontroller **manuel** yapılmalıdır. Otomatik kanıt yalnız: kaynak inceleme,
`renderToStaticMarkup` DOM testleri ve `vite build`. Görsel render iddiası yapılmamıştır.
## Test edilen genişlikler
`1440 px`, `1024 px`, `768 px`, `390 px`.
## Kontrol listesi (her genişlik için)
| # | Kontrol | Nasıl | 1440 | 1024 | 768 | 390 |
|---|---|---|---|---|---|---|
| 1 | Yatay slot scroll YOK | M1 "Frame·Subframe·Slot" paneli | ☐ | ☐ | ☐ | ☐ |
| 2 | Bütün slotlar aynı panelde | grid aşağı uzuyor | ☐ | ☐ | ☐ | ☐ |
| 3 | Etiket çakışması yok | grafik eksenleri | ☐ | ☐ | ☐ | ☐ |
| 4 | Grafik tooltip çalışıyor | noktaya hover | ☐ | ☐ | ☐ | ☐ |
| 5 | Tooltip kesilmiyor | panel kenarında hover | ☐ | ☐ | ☐ | ☐ |
| 6 | Detail panel açılıyor | slota tıkla | ☐ | ☐ | ☐ | ☐ |
| 7 | Mobil detail okunur | 390 px | — | — | ☐ | ☐ |
| 8 | Klavye ile seçim | slota Tab + Enter/Space | ☐ | ☐ | ☐ | ☐ |
| 9 | Escape paneli kapatır | detail açıkken Esc | ☐ | ☐ | ☐ | ☐ |
| 10 | Tablolar kontrolsüz taşmıyor | veri tabloları | ☐ | ☐ | ☐ | ☐ |
| 11 | status/error erişilebilir | `role="status"`/`role="alert"` | ☐ | ☐ | ☐ | ☐ |
| 12 | Legend görünür, renk tek bilgi değil | overview legend | ☐ | ☐ | ☐ | ☐ |
## Otomatik olarak doğrulananlar (kanıt)
- Yatay scroll yok: `NrTimeOverview.test.tsx` (markup'ta `overflow-x: scroll/auto` yok).
- Frame/subframe başlıkları, `aria-selected`, legend, dense-mode: `NrTimeOverview.test.tsx`.
- Detail panel `role="dialog"`, `aria-labelledby`, N/A alanları, RB mini-map, kapatma butonu: `SlotDetailPanel.test.tsx`.
- Grafik standardı (automargin, tick yoğunluğu, çift-eksen uyarısı, hovertemplate): `chartStandard.test.ts`.
- Zaman türetme (15/30 kHz, frame sınırı, geçersiz slot süresi/numeroloji çakışması): `nrTimeIndex.test.ts`.
## Manuel doğrulama gerektirenler (otomasyon yok)
- Gerçek hover tooltip render'ı ve clipping.
- Gerçek klavye odak sırası ve focus-return.
- Mobil bottom-sheet görünümü.
- Plotly grafiklerinin gerçek ekranda okunabilirliği.
