# M0–M2 Bilimsel Audit
Bu belge `Scheduler_Alg_Sim.docx` gereksinimlerini v1.7.4-m3.4 tabanındaki uygulama ve otomatik testlerle eşler.
Durumlar: `PASS`, `FAIL`, `PARTIAL`, `NOT_APPLICABLE`, `NEEDS_SPECIFICATION`.
## Kapsam ve kanıt zinciri
Her madde `requirement → implementation → test → evidence` zinciriyle değerlendirilir. Ana dokümanda bulunmayan
kapasite-normalize yük seviyeleri deneysel genişletmedir. Statik wideband SINR proje varsayımıdır; hızlı fading veya
frekans-seçici scheduling sonucu olarak yorumlanamaz.
## Bulgular
### REQ-M2-TRAFFIC-001 — Ortak trafik realizasyonu
- Durum: `PASS`
- Gereksinim: Aynı seed/senaryoda bütün scheduler'lar aynı paket gelişlerini görmelidir.
- Kaynak: `src/simulation/m2.ts`, `src/simulation/m3Experiment.ts`
- Mevcut davranış: RNG her `runM2` çağrısında effective traffic seed ile yeniden kurulur. Slot/UE geliş sayıları
scheduler'dan bağımsız FNV fingerprint'e eklenir.
- Risk: Eski fingerprint yalnız UE toplam paket sayılarını kullanıyordu ve farklı zaman dizilerini ayırt etmiyordu.
- Düzeltme: `trafficFingerprint` slot/UE/geliş dizisinden üretiliyor.
- Test: `src/simulation/m2.test.ts`, `src/simulation/m3Experiment.test.ts`
- Kanıt: Aynı koşuldaki scheduler fingerprint kümelerinin boyutu 1.
### REQ-M2-TRAFFIC-002 — Poisson gelişleri
- Durum: `PASS`
- Gereksinim: Paket gelişleri yapılandırılmış λ ile Poisson sürecinden örneklenmelidir.
- Kaynak: `src/simulation/random.ts`, `src/simulation/m2.ts`
- Mevcut davranış: Slot başına `Poisson(λΔt)` örneklenir.
- Risk: Model, slot içine geliş zamanı dağıtmaz; aynı slottaki paketler slot başlangıç zaman damgasını paylaşır.
- Düzeltme: Yok; mevcut ayrık-zaman varsayımı belgeye işlendi.
- Test: Aynı seed eşit dizi ve uzun örneklem ortalaması.
- Kanıt: `src/simulation/m2.test.ts`.
### REQ-M2-TRAFFIC-003 — Scheduler sırasından bağımsızlık
- Durum: `PASS`
- Gereksinim: Registry sırası trafik RNG state'ini değiştirmemelidir.
- Kaynak: `src/simulation/m2.ts`
- Mevcut davranış: Her scheduler koşusu kendi seeded RNG örneğini kurar.
- Risk: Scheduler session içine ortak RNG geçirilirse bu garanti bozulabilir.
- Düzeltme: Trafik RNG'si scheduler API'sinden ayrı tutuldu.
- Test: Karşılaştırılan tüm scheduler'larda fingerprint eşitliği.
- Kanıt: M2 ve M3 integrity testleri.
### REQ-M2-FIFO-001 — FIFO ve paket yaşam döngüsü
- Durum: `PASS`
- Gereksinim: Paketler geliş sırasıyla, kısmi servis korunarak ve bir kez teslim edilmelidir.
- Kaynak: `src/simulation/m2.ts`
- Mevcut davranış: Servis yalnız `queue[0]` üzerinde ilerler; kalan Mbit paket nesnesinde tutulur; tamamlanınca
`shift()` ile tek kez çıkarılır.
- Risk: Çok büyük kuyruklarda `shift()` O(n) maliyetlidir; bilimsel doğruluğu etkilemez fakat performans riski taşır.
- Düzeltme: Bu görevde veri yapısı değiştirilmedi.
- Test: Paket korunumu ve deterministik koşu testleri.
- Kanıt: `generated = delivered + queued`.
### REQ-M2-EVENT-001 — Slot olay sırası
- Durum: `PASS`
- Gereksinim: Geliş → FIFO ekleme → HOL/backlog → metrik → RB → servis → kayıt → state güncelleme sırası açık
olmalıdır.
- Kaynak: `src/simulation/m2.ts`
- Mevcut davranış: Kod bu sırayı uygular; teslim zamanı slot sonudur.
- Risk: Slot başında gelen paket aynı slotta servis edilebilir; bu ayrık-zaman model varsayımıdır.
- Düzeltme: Varsayım belgelendi.
- Test: Deterministik tek/çok slot testleri.
- Kanıt: `src/simulation/m2ScienceHardening.test.ts`.
### REQ-M2-PAIR-001 — UE/SINR eşitliği
- Durum: `PASS`
- Gereksinim: Eşleştirilmiş scheduler koşuları aynı UE, SINR, CQI/MCS/rate ve hücreyi kullanmalıdır.
- Kaynak: `src/simulation/m0.ts`, `src/simulation/m3Experiment.ts`
- Mevcut davranış: M0 sonucu aynı koşuldaki tüm scheduler'lara değişmeden verilir; `ueSinrFingerprint` kaydedilir.
- Risk: Worker request'lerinde farklı M0 üretimi yapılmamalıdır.
- Düzeltme: M2 sonucuna UE/SINR fingerprint eklendi.
- Test: Integrity ortak-realization kontrolü.
- Kanıt: Fingerprint kümesi boyutu 1.
### REQ-M2-CAP-001 — Kapasite referansı adlandırması
- Durum: `PARTIAL`
- Gereksinim: En iyi örneklenmiş UE tam-bant hızı teorik/Shannon kapasitesi olarak sunulmamalıdır.
- Kaynak: `src/simulation/m0.ts`, `src/simulation/m2Matrix.ts`
- Mevcut davranış: M0 geriye dönük `theoreticalCellCapacityMbps` alanını tutuyor; ayrıca doğru `
sampledFullBandUpperBoundMbps` ve deneylerde `capacityReferenceMbps` kullanılıyor.
- Risk: Eski UI/CSV alanı yanlış bilimsel yorum doğurabilir.
- Düzeltme: Yeni bilimsel model ve M3 UI yalnız `capacityReferenceMbps` kullanır; eski alan deprecated geçiş
alanıdır.
- Test: `normalizedOfferedLoad = offeredLoad / capacityReference`.
- Kanıt: `src/simulation/m2CapacityLoad.test.ts`.
### REQ-M2-RB-001 — RB ve bit korunumu
- Durum: `PASS`
- Gereksinim: RB bütçesi aşılmamalı; boş kuyruğa tahsis ve negatif kuyruk olmamalıdır.
- Kaynak: `src/m2Schedulers/allocation.ts`, `src/simulation/m2.ts`
- Mevcut davranış: Allocation doğrulaması pozitif tam RB, benzersiz UE tahsisi, schedulable backlog ve toplam bütçe
kontrolü yapar. Servis kapasitesi RB payı × rate × slot süresiyle sınırlıdır.
- Risk: Kayan nokta toleransı küçük artıklar bırakabilir.
- Düzeltme: Ortak `hasSchedulableBacklog` kullanıldı.
- Test: Çoklu UE RB bütçesi ve boş-kuyruk testleri.
- Kanıt: M2 testleri.
### REQ-M2-PF-001 — PF state protokolü
- Durum: `PASS`
- Gereksinim: PF tabanlı scheduler'lar ortak throughput state protokolü kullanmalıdır.
- Kaynak: `src/simulation/m2.ts`
- Mevcut davranış: Metrik slot başı state ile hesaplanır; bütün UE EWMA değerleri slot sonunda güncellenir; servis
almayan UE için `servedRate=0`; `alpha=1/pfWindowSlots`.
- Başlangıç: `simulation.json/model.initialAverageThroughputMbps`.
- Risk: M1 ve M2 başlangıç/state davranışları ayrı motorlardadır.
- Düzeltme: Mevcut M2 davranışı değiştirilmedi; scheduler metadata'ya işlendi.
- Test: Regression ve scheduler metrik testleri.
- Kanıt: Baseline testleri.
### REQ-M2-EXP-001 — EXP/PF uygun UE kümesi
- Durum: `PASS` (düzeltildi)
- Gereksinim: Mean urgency ve tahsis aynı schedulable backlog kümesini kullanmalıdır.
- Kaynak: `src/m2Schedulers/allocation.ts`, `src/m2Schedulers/expPf.scheduler.ts`
- Eski davranış: Mean filtresi `queuedMbits > 0`, tahsis filtresi `queuedMbits > EPSILON && rate > 0` idi.
- Risk: Sayısal artık kuyruk mean urgency'yi etkileyip tahsise katılamıyordu.
- Düzeltme: Ortak `hasSchedulableBacklog` yardımcısı.
- Test: `src/m2Schedulers/expPf.scheduler.test.ts`.
- Kanıt: Eşik altı kuyruk mean urgency'yi değiştirmiyor.
### REQ-M2-PCTL-001 — P99 örnek yeterliliği
- Durum: `PASS` (düzeltildi)
- Gereksinim: Boş/yetersiz örnek P99 güvenilir değer gibi sunulmamalıdır.
- Kaynak: `src/metrics/percentiles.ts`, `src/config/statistics.json`
- Eski davranış: Boş örnekte 0 ve tek örnekte normal P99.
- Risk: Teslim edilmeyen paketleri çok olan scheduler yapay biçimde iyi görünür.
- Düzeltme: `PercentileEstimate` ve `empty/insufficient/sufficient`; P99 proje eşiği 100.
- Test: `src/metrics/percentiles.test.ts`.
- Kanıt: Üç durum ayrı doğrulanır.
### REQ-M2-ROBUST-001 — Büyük kuyruk maksimumu
- Durum: `PASS` (düzeltildi)
- Gereksinim: Büyük diziler spread argümanıyla runtime hatası üretmemelidir.
- Kaynak: `src/metrics/percentiles.ts`, `src/simulation/m2.ts`
- Eski davranış: `Math.max(0, ...queuedAgesMs)`.
- Düzeltme: Streaming `maximumFinite`.
- Test: 250.000 değerli robustness testi.
- Kanıt: Test hata vermeden doğru maksimumu döndürür.
### REQ-M2-GBR-001 — GBR olmayan koşul semantiği
- Durum: `PASS` (düzeltildi)
- Gereksinim: GBR UE yoksa sonuç `%100` değil `null/N/A` olmalıdır.
- Kaynak: `src/simulation/m2.ts`, `src/simulation/m3Experiment.ts`
- Eski davranış: M2 `null`, M3 `1`.
- Düzeltme: M3 ve aggregation null değerleri korur; pairwise fark yalnız iki değer de mevcutsa hesaplanır.
- Test: Null aggregation ve UI testleri.
- Kanıt: SC-1 Non-GBR koşulu `N/A`.
### REQ-M2-GBR-002 — Açık GBR KPI'ları
- Durum: `PASS` (tanım kilitlendi)
- Gereksinim: UE meeting, ortalama fulfillment ve aggregate service ayrılmalıdır.
- Kaynak: `src/simulation/m2.ts`, `src/simulation/m2Types.ts`
- Tanım: Talep-sınırlı hedef `min(nominal GBR, yapılandırılmış offered rate)`; olmayan trafiği teslim etme beklentisi
yaratılmaz.
- Risk: Gerçekleşen kısa koşu talebi yapılandırılmış offered rate'den sapabilir; manifest bu tanımı açıkça taşır.
- Düzeltme: Üç ayrı nullable KPI; eski alan deprecated alias.
- Test: GBR ve Non-GBR sonuç testleri.
- Kanıt: Tür ve serialize katmanı.
## Açık sınırlamalar
- PDB ihlal oranı teslim edilen paketler üzerinde hesaplanır; overdue/undelivered göstergeleriyle birlikte
raporlanmalıdır.
- Slot içindeki paket geliş zamanları ayrıştırılmaz.
- Statik wideband SINR hızlı fading kazancını ölçmez.
- Geriye dönük `theoreticalCellCapacityMbps` alanı M0 şemasında hâlâ bulunmaktadır.
- Yeni LOG Rule, adapted QoS-PF ve NQ-PF bu görev kapsamında uygulanmamıştır.
# M2 istemci kaynak güvenliği
M2 browser-safe hard workload limit: **300.000.000 UE-RB-slot**.
Mevcut gerçek maliyet modeli, karşılaştırılan M2 scheduler sayısı × UE × RB × slot
çarpımıdır. Bu sınır bilimsel konfigürasyonun parçası değildir, fingerprint'e
girmez ve yalnız istemci tarafındaki kaynak kullanımını güvenli tutar. M3 ve M4
iş yükleri için kullanılan ortak 100.000.000 sınırı değiştirilmemiştir.
