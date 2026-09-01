# 5G NR Scheduler Lab
5G NR downlink paket zamanlama algoritmalarını sistem seviyesinde karşılaştırmak
için geliştirilen React + TypeScript simülatörü.
Sürüm bazlı teknik değişiklikler `CHANGELOG.md` dosyasında tutulur.
## Mevcut durum: M0 + M1 + M2 + M3 + M4 (opsiyonel slicing)
Scheduler'lar: Round Robin, Max-C/I, Proportional Fair, M-LWDF, EXP-PF ve önerilen
QDF-PF. Workload güvenlik limitleri: **M2 = 300.000.000**, **M3 = 200.000.000**,
**M4 = 100.000.000** UE-RB-slot (bilimsel değil, fingerprint dışı).
### UI/UX (denetim remediation)
- **Frame–subframe–slot genel görünümü:** yatay kaydırma yoktur; tüm slotlar tek panelde responsive grid
(`NrTimeOverview`).
- **Tıklanabilir slot ayrıntı paneli:** klavye ile seçim, Escape ile kapanış, `aria-labelledby` (`SlotDetailPanel`).
- **Hover tooltip'leri:** frame/subframe/slot + UE + RB + SINR + slot rate; eksik alan `N/A` (uydurma "RB throughput"
yok).
- **Grafik standardı:** `automargin`, responsive, birimli `hovertemplate`, tick seyrekleştirme; farklı birimler tek eksende
gösterilmez.
- **M4 sonuç render'ı** korunur (form-bound submit, Strict-Mode güvenli, `static-weighted` read-only).
- **Kanonik deterministik M3 JSON export'u** (aynı bilimsel girdi → aynı byte).
- **Jain adalet indeksi** sıfır-UE/tüm-sıfırda **N/A** (null), "adil 0" ile karıştırılmaz.
- **Undelivered** paketler "packet loss" değildir; sonlu ufuk sonu kuyruk kalıntısıdır. Dropped modeli yoktur (N/A).
Ayrıntı: `docs/UI_UX_REQUIREMENTS.md`, `docs/MANUAL_UI_VALIDATION.md`.
## Bilimsel çekirdek
- Belgedeki beş hücre konfigürasyonu
- Seed'li ve tekrar üretilebilir UE/SINR popülasyonu
- Normal dağılımlı, sınırlandırılmış wideband statik SINR
- `SINR → CQI → MCS → spektral verimlilik → hız` zinciri
- UE sonuç tablosu ve ulaşılabilir hız grafiği
- Örneklenen popülasyondaki en iyi UE'nin tam-bant hızından oluşan M0 üst sınırı
- M0 çekirdeği için birim testleri
- M2'ye genişletilebilir, UE ve RB sayısı içeren tahsis listesi döndüren ortak
 scheduler arayüzü
- `*.scheduler.ts` dosyalarını otomatik keşfeden scheduler kayıt sistemi; yeni
 algoritma tek dosya eklenerek sisteme katılır
- Round Robin, Max C/I ve Proportional Fair
- Full-buffer, slot başına tek UE ve tam-bant kaynak modeli
- Hücre/UE throughput, slot seçimi, airtime ve Jain adalet indeksi
- Aynı koşullarda otomatik scheduler karşılaştırması
- Throughput–fairness ve UE dağılım ekranları
- Teknik simülasyon dashboard'u ve ortak senaryo kontrol paneli
- M0 SINR–hız saçılımı, CQI dağılımı ve link-adaptation zinciri
- M0 fiziksel kaynak/RB bütçesi görünümü
- Beş hücre için ortak UE/SINR popülasyonuyla M0 kapasite özeti ve UE × hücre
 ulaşılabilir hız matrisi
- M0 tüm-hücre sonuçları için satır-bazlı CSV ve tam deney JSON dışa aktarımı
- M1 scheduler slot zaman çizelgesi ve incelenebilir slot seçici
- Seçilen slot için hücredeki gerçek RB sayısı kadar tahsis kutusu
- Okunabilir akademik dashboard ve azaltılmış bilgi yoğunluğu
- Seed, SINR sınırları ve PF penceresi için açılır gelişmiş ayarlar
- Gerektiğinde açılan UE ayrıntı tabloları
- Daha kısa ve kolay incelenebilir M1 slot zaman çizelgesi
- UE etiketli slot kutuları, renk açıklama lejantı ve numaralandırılmış RB'ler
- Ortak seed listesiyle tekrarlı M1 deneyleri
- Scheduler başına ortalama, örnek standart sapması ve Student-t tabanlı %95
 güven aralığı
- Aynı seed'lerden hesaplanan algoritma çiftleri için eşleştirilmiş throughput ve
 Jain farkları ile Student-t %95 güven aralığı
- Arayüzü kalabalıklaştırmayan açılır çoklu-seed analiz paneli
- M0, seçili M1 ve çoklu-seed sonuçları için UTF-8 CSV dışa aktarımı
- Hücre, senaryo, M0/M1 ve çoklu-seed sonuçlarını içeren tam deney JSON'u
- M0 SINR–hız ve M1 throughput–fairness grafikleri için 3× PNG dışa aktarımı
- M1 tek-seed ve çoklu-seed hesapları için modül tipinde Web Worker
- Parametre değişiminde eski hesabı iptal eden worker yaşam döngüsü
- Hesaplanıyor/hazır/hata durum göstergeleri ve worker çalışma süresi
- Hücre, link-adaptation ve varsayılan deney parametreleri için harici JSON
 konfigürasyonları
- Beş hücre profili × otomatik kayıtlı scheduler sayısı için aynı seed listesiyle
 dinamik M1 deney matrisi
- Hücre matrisi için açılır karşılaştırma tablosu ile CSV ve tam deney JSON
 dışa aktarımı
- Beş hücre için küçük-çoklu throughput–fairness figürü, %95 güven aralığı hata
 çubukları ve 3× PNG dışa aktarımı
- Hücre başına en yüksek ortalama throughput/fairness liderleri ve Pareto-optimal
 scheduler kümesini gösteren karar özeti
- Hücre, seed, UE/SINR, M1 ve çoklu-seed ayarlarını sürümlü ve doğrulanan JSON
 deney profili olarak kaydetme/yükleme
- Görünür `v1.7.5-m3.5` model sürümü ve simülasyon parametrelerinden deterministik
 üretilen `RUN-XXXXXXXX` deney kimliği
- Tam deney JSON'unda uygulama/model metadata'sı ve deney kimliği
- Her çalıştırmada ortak popülasyon, M0 kapasite tanımı, scheduler kapsamı,
 slot/throughput korunumu, Jain sınırları, ortak seed protokolü, deney matrisi
 CQI/MCS eşleşmesi, Max C/I eşitlik politikası ve istatistiksel çıktı için
 görünür 11 maddelik model bütünlük doğrulaması
- M0 ekranında M1 worker'ını durduran çalışma yaşam döngüsü, hücre değişiminde
 tüm-hücre matrisini yeniden kullanan önbellek ve konfigüre edilebilir deney
 iş-yükü sınırı
- Çekirdek katmanda sonluluk, aralık, tam sayı, UE hızı ve M1 tahsis doğrulamaları
- TypeScript `strict` modu
- Harici JSON konfigürasyonlu 5QI 1/2/6/9 QoS profilleri
- Aynı seed altında tekrarlanabilir Poisson paket gelişleri ve UE başına FIFO kuyruklar
- Slot içinde birden fazla UE'ye metrik sırasıyla greedy RB paylaşımı
- M2 için Round Robin, Max C/I, PF, M-LWDF ve EXP/PF karşılaştırması
- UE ve 5QI sınıfı bazında GBR karşılama ile P50/P95/P99 paket gecikmeleri
- M2 Web Worker, iş-yükü koruması, çok renkli RB tahsisi ve CSV/JSON çıktısı
## Kurulum
```bash
npm install
npm run dev
```
Üretim derlemesi ve kontroller:
```bash
npm test
npm run lint
npm run build
```
## M0 model varsayımları
- Kanal, UE başına tek wideband ve statik SINR değeriyle temsil edilir.
- Scheduler henüz yoktur; her UE'nin tüm RB'lere erişebildiği varsayılır.
- Hız hesabındaki spektral verimlilik seçilen MCS kaydından alınır.
- Hız hesabında RB başına 12 alt taşıyıcı, slot başına 14 OFDM sembolü,
 tek katman ve varsayılan `%14` overhead kullanılır.
- M0 çıktısındaki `sampledFullBandUpperBoundMbps`, yalnızca örneklenen UE
 popülasyonundaki en yüksek tam-bant UE hızıdır. Genel veya bilgi-kuramsal
 teorik hücre kapasitesi değildir; geriye dönük uyumluluk için eski
 `theoreticalCellCapacityMbps` alanı aynı değerin takma adı olarak korunur.
## Link-adaptation kaynağı ve kapsamı
- CQI modülasyon, kod oranı ve spektral verimlilik değerleri 3GPP TS 38.214
 Table 5.2.2.1-2'den alınır.
- PDSCH MCS Table 1 değerleri 3GPP TS 38.214 Table 5.1.3.1-1'den alınır.
- CQI 1'in `0.1523` verimi PDSCH MCS Table 1'in en düşük değerinden küçüktür.
 Bu nedenle CQI 1, aynı kod oranı ve verime sahip 3GPP TS 38.214 Table
 5.1.3.1-3 MCS 4 düşük-SE kaydıyla eşlenir; MCS tablosu CSV/JSON çıktısında
 ayrıca belirtilir.
- CQI Table 1 için hedef transport-block hata olasılığı `0.1` olarak tutulur.
- 3GPP sabit bir genel `SINR → CQI` eşik tablosu tanımlamaz. Projedeki eşikler
 sistem-seviyesi simülasyon varsayımıdır ve `src/config/link-adaptation.json`
 içinden değiştirilebilir.
- CQI doğrudan tek bir MCS indeksini zorunlu kılmaz. CQI 2–15 için model, CQI
 spektral verimliliğini aşmayan en yüksek PDSCH MCS Table 1 kaydını seçer.
- BLER örneklemesi, HARQ, gerçek transport-block boyutu ve yeniden iletimler
 simüle edilmez. `0.1` değeri CQI tablosunun hedef hata olasılığı metadata'sıdır.
- `%14` overhead, bu soyut modelde DM-RS/kontrol/koruma gibi fiziksel kayıpları
 tek bir toplu oranla temsil eder.
Konfigürasyon dosyaları:
```text
src/config/cells.json
src/config/link-adaptation.json
src/config/simulation.json
src/config/qos-profiles.json
src/config/m2.json
src/config/m3.json
```
## M1 model varsayımları
- Her UE'nin her anda gönderilecek verisi vardır (full-buffer).
- Her slotta bütün RB'ler yalnızca bir UE'ye verilir.
- Arayüzdeki RB görünümü bu nedenle seçilen slotta tek UE rengiyle gösterilir.
- Round Robin UE'leri sırayla seçer.
- Max C/I doğrudan sürekli SINR yerine CQI/MCS ile kuantize edilmiş ulaşılabilir
 hızı karşılaştırır; eşit en iyi UE'ler slot indeksine göre Round Robin seçilir.
- PF metriği `ulaşılabilir hız / üstel ortalama throughput` biçimindedir.
- Aynı seed bütün algoritmalar için aynı UE ve SINR popülasyonunu üretir.
- Çoklu deneyde `baseSeed, baseSeed+1, ...` listesi bütün scheduler'larda aynıdır.
- Hücre deney matrisi aynı seed listesini beş hücre profili ve kayıtlı
 scheduler'ların tamamında kullanır; koşul sayısı dinamik hesaplanır.
- Standart sapma örnek standart sapmasıdır (`n-1` paydası).
- %95 güven aralığı, 30 serbestlik derecesine kadar Student-t kritik değer
 tablosunu; daha büyük değerlerde Student-t için yüksek doğruluklu
 Cornish–Fisher açılımını kullanır.
- Algoritma farkları aynı seed'e ait sonuçlar çıkarılarak eşleştirilmiş biçimde
 hesaplanır; fark, `karşılaştırılan − referans` yönündedir.
## M2 model varsayımları
- Paket gelişleri, her UE için sabit ortalama hızlı ve birbirinden bağımsız
 Poisson süreçleriyle üretilir.
- Paketler UE başına FIFO kuyrukta tutulur; bir paket birden fazla slotta kısmi
 hizmet alabilir.
- M2 scheduler'ı kuyrukta verisi olan UE'leri metriklerine göre sıralar ve RB'leri
 greedy biçimde doldurur; bir slotta birden fazla UE hizmet alabilir.
- Aynı kanal seed'i ve trafik seed'i bütün algoritmalarda aynıdır.
- 5QI resource type, priority, PDB ve PER değerleri 3GPP TS 23.501 Table 5.7.4-1
 özellikleridir. Trafik geliş oranları, paket boyları, GBR hedefleri ve gecikme
 ihlal olasılığı bu projenin ayrı konfigüre edilen simülasyon parametreleridir.
- BLER/HARQ ve çekirdek ağ gecikmesi simüle edilmez. P50/P95/P99 yalnızca
 teslim edilmiş paket örneklerinden hesaplanır ve paket gelişinden radyo
 tarafındaki hizmetin tamamlanmasına kadar geçen süreyi ifade eder. Simülasyon
 sonunda kuyrukta kalan paketler yüzdeliklere dahil değildir; teslim oranı ve
 kuyrukta kalan paket sayısı bu nedenle birlikte raporlanır.
- Simülasyon davranışını belirleyen sayısal başlangıç/tolerans ve varsayılan trace
 parametreleri `src/config/simulation.json` içindeki `model` bölümünde tutulur.
 Doğrulama aralıkları ise güvenlik sınırı olarak kod seviyesinde kalır.
## M3 — QDF-PF ve Bilimsel Karşılaştırma
M3, M2 trafik ve FIFO kuyruk motorunu yeniden kullanır. M2'nin beş algoritmalı
baseline registry'si değiştirilmez; M3 registry'si yalnız M-LWDF, EXP/PF ve
QDF-PF algoritmalarını içerir.
QDF-PF bu projede tanımlanan gecikme-duyarlı PF genişletmesidir. Kesin metrik:
```text
base_i = a_i × W_i × R_i / max(T_i, epsilonThroughput)
gbrDeficit_i = clamp((GBR_i - T_i) / max(GBR_i, epsilonGbr), 0, 1)
priorityWeight_i = 1 / max(priorityLevel_i, 1)
QDF-PF_i = base_i × (1 + beta × gbrDeficit_i) × (1 + gamma × priorityWeight_i)
```
Zaman, throughput ve GBR epsilon değerleri fiziksel birimleri karıştırmamak için
ayrı tutulur. Parametreler `src/config/m3.json` dosyasındadır.
M3 ekranı iki katmandır:
1. Seçili hücre ve tek seed için hızlı inceleme.
2. SC-1 aynı QoS ve SC-2 farklı QoS altında beş hücre, üç scheduler ve ortak
  çoklu-seed listesiyle bilimsel deney matrisi.
Bilimsel matris örnek standart sapması, Student-t %95 güven aralığı,
QDF-PF − M-LWDF ve QDF-PF − EXP/PF eşleştirilmiş farkları, SINR/trafik
fingerprint kontrolleri, özet CSV, eşleştirilmiş fark CSV, ham koşu CSV,
tam JSON ve PNG grafiği üretir.
QDF-PF adı ve kesin birleşik metriği proje önerisidir; M-LWDF ve EXP/PF
gecikme-duyarlı baseline kavramlarından yararlanır. Rapor, bu ayrımı açıkça
belirtmeli ve algoritmayı yayımlanmış bir yöntemin birebir kopyası olarak
sunmamalıdır.
Eşleştirilmiş fark grafiği KPI, senaryo ve baseline'a göre filtrelenebilir;
varsayılan görünüm tek KPI/tek koşul göstererek kalabalığı azaltır. Formül
kartı (`M3MetricFigure`), gecikme/kanal-PF/GBR açığı/5QI önceliği
bileşenlerini ayrı ayrı açıklar. Ham satırlar CSV/JSON dışa aktarımında
tam olarak korunur; yalnız grafik sunumu sadeleştirilmiştir.
## M2 SC-1 / SC-2 Beş Hücre Deney Matrisi
- Ana panelin altında yer alan deney katmanı, SC-1 aynı-QoS ve SC-2 farklı-QoS presetlerini konfigürasyon
dosyasından yükler. Ana dokümandaki resmi SC-1 mevcut M1 full-buffer matrisidir; M2 panelindeki SC-1 seçeneği
kontrollü aynı-QoS karşılaştırmasıdır.
- Beş hücrenin tamamı ve keşfedilen tüm M2 scheduler'ları ortak SINR popülasyonu, temel seed ve efektif trafik seed'i
altında çalıştırılır.
- 15/30 kHz numerolojiler arasında adil karşılaştırma için slot sayısı değil duvar-saati simülasyon süresi eşitlenir; 0,5
ms hücrelerde slot sayısı iki katına çıkar.
- Matris toplam throughput, Jain adaleti, teslim oranı, GBR karşılama oranı, en kötü 5QI P99 ve kuyrukta kalan
paketleri CSV/JSON olarak dışa aktarır.
- SINR popülasyonu ortaklığı her satırdaki aynı `sinrPopulationFingerprint` ile doğrulanır.
### M2 Matris Arayüzü ve Seed Kontrolü
- SC-1/SC-2 beş hücre paneli uygulamanın açık görsel temasıyla aynı beyaz yüzey, açık kart ve koyu metin düzenini
kullanır.
- Temel seed kullanıcı tarafından düzenlenebilir, `Yeni seed üret` düğmesiyle değiştirilebilir veya her çalıştırmada
otomatik yenilenebilir.
- Otomatik yenileme yalnız farklı matris çalıştırmaları arasında seed değiştirir; aynı matris içindeki bütün hücre ve
scheduler'lar ortak seed, ortak SINR popülasyonu ve ortak trafik seed'iyle karşılaştırılmaya devam eder.
- Tekrar üretilebilirlik için otomatik seed yenileme kapatılarak sonuçta kaydedilen temel seed yeniden kullanılabilir.
## M2 Çoklu-Seed ve Yük Deneyleri
- M2 deney paneli yalnız M2 görünümü içinde, mevcut M2 sonuçlarının hemen altında gösterilir; M0 ve M1
görünümünde render edilmez.
- Trafik yükü harici JSON konfigürasyonundaki hafif (0,5×), orta (1×) ve yoğun (2×) paket geliş hızı presetleriyle seçilir.
Paket boyutu ve GBR hedefi yük değişiminde sabit tutulur.
- Beş hücre ve keşfedilen tüm M2 scheduler'ları ortak seed listesiyle Web Worker içinde çalıştırılır.
- Her scheduler/hücre metriği için örneklem ortalaması, örneklem standart sapması ve Student-t tabanlı %95 güven
aralığı hesaplanır.
- Scheduler çiftleri aynı seed üzerinden eşleştirilir ve A−B farkının ortalaması, standart sapması ve %95 güven aralığı
raporlanır.
- Throughput–fairness ve seçilen QoS KPI grafikleri React içinden yüklenen resmî Plotly.js basic tarayıcı bundle’ı ile
%95 güven aralığı hata çubukları kullanılarak çizilir; Plotly mod çubuğundan PNG alınabilir. NPM üzerinden Plotly
kurulumu yapılmaz.
- Çoklu-seed özet CSV, eşleştirilmiş fark CSV ve ham koşuları da içeren tam JSON çıktısı sağlanır.
## Final M2 Deney Preseti
- Ana dokümandaki SC-1 aynı QoS ve SC-2 farklı QoS senaryoları tek düğmeyle çalıştırılır.
- Her senaryo orta yükte, 1000 ms, 10 UE ve ortak 20 seed listesiyle beş hücre ve keşfedilen tüm M2
scheduler'larında çalışır.
- Final preset toplam koşu sayısını scheduler kayıt sayısından dinamik hesaplar.
- Manifest CSV, birleşik özet CSV, eşleştirilmiş fark CSV ve tam JSON dışa aktarılır.
- Throughput–fairness ve seçilen QoS KPI grafikleri Plotly üzerinden %95 güven aralıklarıyla gösterilir.
- Bütünlük kontrolleri ortak seed listesi, hücre sayısı, scheduler sayısı, iki senaryo kapsamı ve toplam koşu sayısını
doğrular.
## M3 Dinamik Sonuç Liderliği
QDF-PF, M3 kapsamında araştırılan aday yöntemdir; arayüzde sabit biçimde
önerilen veya kazanan olarak etiketlenmez. Throughput, Jain adaleti, paket
teslimi, GBR karşılama, P99 gecikme, PDB ihlali ve son kuyruk için liderler
ayrı ayrı deney sonuçlarından hesaplanır. Sayısal tolerans içinde eşit olan
scheduler'lar ortak lider olarak gösterilir.
Eşleştirilmiş fark yönü QDF-PF eksi baseline olarak korunur. Throughput,
Jain, teslim ve GBR için pozitif fark; P99, PDB ihlali ve kuyruk için negatif
fark QDF-PF lehinedir. Güven aralığının sıfırı içermesi belirgin fark olmadığı
şeklinde yorumlanır.
## M3 Görsel Karar Akışı ve Filtreli Fark Grafiği
QDF-PF karar metriği artık gecikme aciliyeti, kanal/PF fırsatı, GBR açığı ve
5QI önceliğini tek puanda birleştiren açıklayıcı bir SVG akış şekliyle
gösterilir. Bilimsel eşleştirilmiş fark grafiği aynı anda yalnız bir senaryo,
bir baseline ve bir KPI gösterir; her satır bir hücredir. Güven aralığı sıfırı
içerdiğinde arayüz belirgin üstünlük sonucu vermez.
M3 bilimsel SC-1 ve SC-2 trafik sınıfları doğrudan belgelenmiş senaryo
konfigürasyonundan alınır. SC-1, 5QI 9 Non-GBR; SC-2 ise 5QI 1, 2, 6 ve 9
karışımını kullanır.
