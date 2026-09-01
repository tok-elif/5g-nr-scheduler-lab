## UI grafik ve deney iyileştirmesi — 2026-07-23 (sürüm bump yok)
- M1 RB hover/focus ayrıntılarına SINR, achievable rate, UE, scheduler ve global zaman bilgisi eklendi.
- M1/M2/M3 throughput–fairness grafiklerinde çakışan scheduler'lar renk, sembol, boyut, etiket ve çizgi stiliyle ayrıştırıldı.
- M2 5QI sınıf sonuçları KPI ve gecikme/PDB profili olarak yeniden tasarlandı.
- M3 bilimsel deney UE sayısı 1–100 aralığına açıldı; 10 yalnız başlangıç değeridir.
- M3 forest grafiğine güven aralığı uç hover değerleri eklendi.
- M4 üç slice toplamı için 100 UE üst sınırı ve dinamik giriş maksimumları eklendi; toplam 100 geçerlidir.
- Model bütünlük kontrol paneli arayüzden kaldırıldı; bilimsel doğrulama testleri korunur.

## UI düzeltmesi — global slot numarası
- Zaman matrisi kutuları ve hover kartı artık subframe-içi slot yerine 1 tabanlı global slot numarasını gösterir.
- 30 kHz ve üzeri numerolojilerde subframe-içi slot ayrıca ayrı satırda gösterilir.
- 15 kHz koşullarında her kutuda `Slot 0` tekrarlanmasına yol açan gösterim hatası giderildi.

# Değişiklik Günlüğü
## Görselleştirme iyileştirmesi — M3 formül kartı ve M4 etkileşimli grafikler (sürüm bump yok)
- M4 kaynak kullanımı ve kaynak kompozisyonu CSS çubukları Plotly tabanlı yığılmış grafiklere dönüştürüldü.
- M4 latency ve slot bazlı resource trend grafikleri Plotly ile yeniden yazıldı.
- Bütün yeni M4 grafiklerinde scroll zoom, pan, reset/autosize, hover tooltip ve PNG dışa aktarma etkinleştirildi.
- Yeni slice throughput ve servis kalitesi karşılaştırma grafikleri eklendi.
- M3 seçili scheduler kartı formül-merkezli bilimsel düzene geçirildi.
- PF, M-LWDF, EXP/PF ve QDF-PF formülleri MathJax ile LaTeX olarak render edilir.
- Formül sembolleri, literatür rolü, model uyarlamaları, parametreler ve geçerlilik sınırları ayrı bölümlere ayrıldı.

## Denetim remediation (UX) — sürüm 1.7.5-m3.5 üzerinde (sürüm bump yok)
Bilimsel model, slot bazlı motor, RR/Max-C/I/PF/M-LWDF/EXP-PF/QDF-PF scheduler'ları,
SC-1/SC-2 senaryoları ve workload limitleri (M2 = 300.000.000, M3 = 200.000.000,
M4 = 100.000.000) korunmuştur. Başlangıç 433 test korunmuş, yeni testlerle
toplam test sayısı artmıştır.
- Frame–subframe–slot zaman türetme yardımcısı (`src/time/nrTimeIndex.ts`); UI-katmanı, fingerprint dışı.
- Yatay kaydırmasız `NrTimeOverview` genel görünümü; eski yatay `SlotTimeline` kaldırıldı (M1).
- Tıklanabilir `SlotDetailPanel` ayrıntı paneli (klavye/Escape/focus, `aria-labelledby`).
- Ortak zaman-tahsis view-model'i (`src/viewModels/timeAllocationViewModel.ts`); eksik alanlar `null` (sahte
0/"undefined" yok).
- Ortak grafik standardı (`chartStandard.ts`): `automargin`, responsive, birimli `hovertemplate`, tick yoğunluğu, çift-
eksen uyarısı — `PlotlyChart`'a merkezî uygulandı.
- F-REPRO-01: M3 için byte-deterministik kanonik JSON export (`serializeM3ExperimentCanonical`); `generatedAt`
dışarıda; UI ana JSON export'u kanonik.
- F-METRIC-01: Jain adalet indeksi sıfır-UE/tüm-sıfır durumunda `null` (N/A); "adil 0" ile karıştırılmaz.
- F-TRAFFIC-01: undelivered vs dropped semantiği ayrıştırıldı; "packet loss" olarak etiketlenmez; dropped = N/A
(modellenmiyor).
- F-TEST-01: M2/M3/bilimsel-M3 için ortak, test edilebilir worker yaşam döngüsü (`requestWorkerLifecycle`) + 12-
senaryo testleri; bilimsel-M3 hook'u bu döngüye taşındı.
- F-TEST-03: R7/type-7 percentile referans-vektörü testleri.
- Yeni belgeler: `docs/UI_UX_REQUIREMENTS.md`, `docs/MANUAL_UI_VALIDATION.md`.
## v1.7.5-m3.5 — 2026-07-16
- M3 bilimsel karşılaştırmada nullable KPI semantiği güçlendirildi.
- Quick M3 P99 özetinde yalnız yeterli örnekli P99 değerleri kullanılmaya başlandı.
- Sıfır paket üretilen koşullarda teslim oranı N/A/null olarak korunmaya başlandı.
- Bilimsel ısı haritası eşleştirilmiş seed farklarına bağlandı.
- Normalize yük formülü ve pozitif kapasite bütünlük kontrolü eklendi.
- SC-1 GBR N/A semantiği ve bilimsel serializer regresyon testleri genişletildi.
- React Fast Refresh uyarıları saf yardımcı modüllerle kaldırıldı.
## v1.7.4-m3.4 — 2026-07-14
M3 bilimsel arayüzü ve senaryo tutarlılığı iyileştirildi.
- QDF-PF karar metriği gerçek SVG akış şekliyle açıklanıyor.
- Eşleştirilmiş fark grafiği tek senaryo, tek baseline ve tek KPI filtresine indirildi.
- Ham geliştirici etiketleri yerine hücre ve koşul adları açık Türkçe gösteriliyor.
- Hücre sonuçları QDF-PF lehine, baseline lehine veya belirgin fark yok olarak sınıflandırılıyor.
- SC-1 artık belgelenmiş 5QI 9 Non-GBR profilini; SC-2 belgelenmiş 5QI 1/2/6/9 karışımını kullanıyor.
- M3 karar şekli ve seçili fark grafiği PNG olarak dışa aktarılabiliyor.
- Senaryo tanımları için yeni birim testleri eklendi.
## v1.7.3-m3.3 — 2026-07-14
M3 karar metriği görselleştirmesi ve filtrelenebilir eşleştirilmiş fark grafiği.
- QDF-PF karar metriğini görsel olarak açıklayan `M3MetricFigure` bileşeni eklendi (gecikme, kanal/PF, GBR açığı,
5QI önceliği bileşenleri ayrı ayrı gösteriliyor).
- M3 bilimsel panelindeki tek-KPI throughput grafiği, KPI/senaryo/baseline filtreli genel `M3PairwiseDifferenceChart`
bileşeniyle değiştirildi.
- Ham etiketler (senaryo kimliği, hücre bant/genişlik, baseline) `formatScenarioLabel`/`formatCellLabel`/`
formatComparisonLabel` yardımcılarıyla okunabilir hâle getirildi.
- Varsayılan görünüm tek KPI ve tüm senaryo/baseline gösterir; kullanıcı karşılaştırmayı daraltabilir. Özet, eşleştirilmiş
fark ve ham koşu CSV/JSON dışa aktarımları değişmeden korunur.
- PNG dışa aktarımı seçili KPI'ya göre dosya adlandırıyor.
## v1.7.2-m3.2 — 2026-07-14
M3 tarafsız sonuç sunumu ve dinamik KPI liderliği.
- QDF-PF scheduler etiketi tarafsız biçimde QDF-PF olarak değiştirildi.
- Aday yöntem rolü ile deney kazananı birbirinden ayrıldı.
- Throughput, Jain, teslim, GBR, P99, PDB ihlali ve son kuyruk için dinamik liderler eklendi.
- Eşit sonuçlarda birden fazla scheduler ortak lider olarak gösteriliyor.
- M3 başlangıç seçimi ilk baseline scheduler'a alındı.
- Dinamik liderlik için ayrı birim testleri eklendi.
## v1.7.1-m3.1 — 2026-07-14
M3 bilimsel sağlamlaştırma ve tam deney matrisi.
- QDF-PF metriğindeki throughput, GBR ve zaman epsilonları fiziksel birimlerine göre ayrıldı.
- Belgelenen `a_i × W_i × R_i / max(T_i, epsilon)` tabanı doğrudan uygulandı.
- SC-1 aynı QoS ve SC-2 farklı QoS için beş hücre × üç scheduler × çoklu-seed deney katmanı eklendi.
- Örnek standart sapması, Student-t %95 güven aralığı ve QDF-PF − baseline eşleştirilmiş farkları eklendi.
- Ortak SINR/trafik fingerprint bütünlük kontrolleri eklendi.
- Özet, eşleştirilmiş fark ve ham koşu CSV'leri ile tam JSON ve PNG figürü eklendi.
- M3 testleri registry korunumu, formül, birim ayrımı, ortak trafik ve istatistiksel kapsam için genişletildi.
- README, CHANGELOG, sürüm tarihi ve M3 açıklamaları güncellendi.
## v1.7.0-m3.0 — 2026-07-14
M3 QDF-PF QoS-öncelikli scheduler karşılaştırma modülü.
- Ayrı `m3Schedulers` kaydı ve QDF-PF scheduler dosyası eklendi; M2 scheduler kaydı ve beş scheduler'lı final
deney yerleşimi değiştirilmedi.
- QDF-PF = base × (1 + beta·gbrDeficit) × (1 + gamma·priorityWeight) metrik formülü eklendi (beta=2.0, gamma=0.5,
epsilon=1.0, delta=0.01).
- M2 trafik/kuyruk motorunu yeniden kullanan ayrı M3 simülasyon katmanı, Web Worker ve React hook'u eklendi.
- Ayrı "M3 · QDF-PF" arayüz sekmesi ve yalnız M-LWDF / EXP/PF / QDF-PF karşılaştırması eklendi.
- Aynı hücre, UE popülasyonu, SINR, trafik realizasyonu, seed listesi, süre ve yük profili altında çok-seed
karşılaştırma.
- Throughput, Jain adalet, paket teslim oranı, GBR karşılama oranı, P99 gecikme, PDB ihlal oranı ve kuyruk metrikleri
eklendi.
- Eşleştirilmiş farklar, CSV ve JSON dışa aktarma ve M3 testleri eklendi.
## v1.6.0-m2.5 — 2026-07-14
M2 final bilimsel sağlamlaştırma.
- Kapasite-normalize yük deneyleri ve final sonuç doğrulamaları güçlendirildi.
- Teslim, teslim edilememe, PDB ihlali ve kuyruk metrikleri birlikte raporlandı.
- Güven aralığı sınırları fiziksel metrik alanlarına göre sınırlandırıldı.
- Sayısal olarak ihmal edilebilir eşleştirilmiş farklar sıfıra normalize edildi.
- CSV çıktıları UTF-8 BOM ile standartlaştırıldı.
## v1.5.0-m2.4 — 2026-07-13
- Ana doküman için tek düğmeli final M2 deney preseti eklendi.
- SC-1 ve SC-2, orta yükte ortak 20 seed listesiyle beş hücre ve tüm M2 scheduler'larında birlikte çalıştırılıyor.
- Final deney Web Worker'ı, aşama bazlı ilerleme ve bütünlük doğrulamaları eklendi.
- Birleşik manifest, özet, pairwise CSV ve tam JSON çıktıları eklendi.
- Final throughput–fairness ve QoS Plotly grafikleri ile rapor tablosu eklendi.
- Final preset ve serileştirme için Vitest testleri eklendi.
## v1.4.0-m2.3 — 2026-07-13
M2 bilimsel deney katmanı, yük presetleri ve arayüz yerleşimi.
- M2 deney paneli sayfanın genel altından kaldırılarak yalnız M2 görünümüne taşındı.
- Hafif, orta ve yoğun trafik yükü presetleri konfigürasyon tabanlı olarak eklendi.
- 2–50 seed için Web Worker tabanlı beş hücre çoklu-seed batch çalıştırıcısı eklendi.
- Ortalama, örneklem standart sapması ve Student-t %95 güven aralığı hesapları eklendi.
- Ortak seed ile eşleştirilmiş scheduler A−B fark analizleri eklendi.
- NPM kurulumu gerektirmeyen Plotly.js basic tarayıcı bundle’ı ile throughput–fairness ve QoS KPI grafikleri, güven
aralığı hata çubukları ve PNG dışa aktarma eklendi.
- Çoklu-seed özet CSV, pairwise CSV ve tam JSON dışa aktarmaları eklendi.
- Senaryo, yük, batch istatistikleri, ortak seed disiplini ve serileştirme testleri genişletildi.
## v1.3.1-m2.2 — 2026-07-13
M2 matris arayüzü ve seed kullanılabilirliği düzeltmesi.
- Koyu M2 deney paneli uygulamanın açık temasıyla eşleştirildi.
- Temel seed alanı belirginleştirildi ve manuel düzenleme korundu.
- Yeni seed üretme düğmesi ve her çalıştırmada seed yenileme seçeneği eklendi.
- Bir matris içindeki ortak seed/SINR/trafik karşılaştırma disiplini korunurken ayrı koşuların seed'i değiştirilebilir hâle
getirildi.
- Kullanılan temel seed sonuç özetinde görünür hâle getirildi.
- Farklı seçilmiş seed'lerin sonuç metadata'sına ve SINR fingerprint'ine yansıdığını doğrulayan test eklendi.
## v1.3.0-m2.2 — 2026-07-13
M2 deney presetleri ve beş hücre karşılaştırma matrisi.
- SC-1 aynı QoS ve SC-2 farklı QoS presetleri harici JSON konfigürasyonuna eklendi.
- Tüm beş hücre ve keşfedilen tüm M2 scheduler'ları için worker tabanlı matris çalıştırıcısı eklendi.
- Hücreler arasında aynı duvar-saati süresi korunarak 0,5 ms ve 1 ms slot yapıları adil karşılaştırıldı.
- Ortak seed, trafik seed'i ve SINR fingerprint bütünlük metadata'sı eklendi.
- Throughput–fairness grafiği, QoS KPI tablosu ve CSV/JSON matris çıktıları eklendi.
- Senaryo, matris ve serileştirme testleri eklendi.
## v1.2.1-m2.1 — 2026-07-13
Ana proje dokümanıyla terminoloji ve ölçüm kapsamı uyumlaştırması.
- M0 kapasite çıktısı `sampledFullBandUpperBoundMbps` olarak açıkça adlandırıldı; eski alan geriye dönük
uyumluluk için korundu.
- M2 sonuçlarına temel seed, trafik seed ofseti ve efektif trafik seed metadata'sı eklendi.
- P50/P95/P99 değerlerinin yalnız teslim edilen paketlerin gelişten hizmet tamamlanmasına gecikmesi olduğu sonuç,
CSV ve arayüzde açıklandı.
- Gecikme örnek sayısı UE, 5QI ve deney düzeyinde raporlandı.
- M2 algoritma kartındaki teslim oranı çubuğu Jain yerine gerçek teslim oranına bağlandı.
- Simülasyon davranışını belirleyen epsilon, PF başlangıcı ve varsayılan trace değerleri harici konfigürasyona taşındı.
## v1.2.0-m2.1 — 2026-07-13
M2 QoS ve trafik çekirdeğinin ilk çalışan sürümü.
- 3GPP TS 23.501 Table 5.7.4-1 kaynaklı, harici JSON'da tutulan 5QI 1/2/6/9 profilleri eklendi.
- Seed'li Poisson paket gelişleri ve UE başına FIFO paket kuyrukları eklendi.
- Slot içinde metrik sırasıyla birden fazla UE'ye greedy RB tahsisi eklendi.
- M2 için Round Robin, Max C/I, PF, M-LWDF ve EXP/PF ortak otomatik kayda bağlandı.
- UE ve 5QI sınıfı bazında GBR karşılama, P50/P95/P99 gecikme ve kuyruk sonuçları üretildi.
- M2 hesaplaması ayrı Web Worker'a taşındı ve aşırı deney yükü sınırlandı.
- M2 sekmesi, çok renkli gerçek RB tahsisi, QoS kartları ve CSV/JSON dışa aktarımı eklendi.
- M2 konfigürasyonu deterministik deney kimliğine bağlandı.
## v1.1.0-m1 — 2026-07-13
Bilimsel doğruluk ve M2 öncesi mimari sağlamlaştırma sürümü.
- CQI 1, 3GPP PDSCH MCS Table 3 MCS 4 düşük-SE kaydıyla tutarlı eşlendi.
- Max C/I eşit en iyi UE'leri deterministik Round Robin ile paylaştırıyor.
- Scheduler API'si tek UE indeksi yerine RB tahsis listesi döndürüyor.
- Scheduler etiketi, kısa etiketi ve rengi scheduler dosyasında merkezîleştirildi.
- M0/M1 çekirdeğine sonluluk, aralık, tam sayı, UE hızı ve tahsis doğrulamaları eklendi.
- TypeScript strict modu etkinleştirildi.
- RR ve Max C/I için gereksiz ortalama-throughput güncellemeleri kaldırıldı;
 Max C/I en iyi UE kümesini çalışma başında bir kez hesaplıyor.
- M0 ekranında M1 worker çalışması durduruldu; hücre değişiminde tüm-hücre
 matrisi önbellekten yeniden kullanılıyor.
- Aşırı büyük deneyleri başlamadan durduran konfigüre edilebilir iş-yükü sınırı eklendi.
- 30 serbestlik derecesi üzerindeki Student-t kritik değeri düzeltildi.
- Aynı seed'ler için eşleştirilmiş throughput ve Jain fark analizi eklendi.
- Model bütünlük paneli CQI/MCS ve Max C/I eşitlik kontrolleriyle 11 maddeye çıkarıldı.
- MCS tablosu ve eşleştirilmiş farklar CSV/JSON dışa aktarımına eklendi.
## v1.0.0-m1 — 2026-07-13
- M0 link adaptation ve beş hücre sonuç matrisi.
- M1 Round Robin, Max C/I ve Proportional Fair scheduler'ları.
- Çoklu-seed güven aralıkları, tüm-hücre matrisi ve dışa aktarımlar.
- Otomatik scheduler keşfi, deney profilleri ve deterministik deney kimliği.
