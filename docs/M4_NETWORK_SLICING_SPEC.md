# M4 Network Slicing Specification
## Amaç ve kapsam
M4, hücre kaynaklarını önce mantıksal dilimler arasında paylaştırır ve her
dilimin bağımsız scheduler session'ını kendi RB bütçesiyle çalıştırır. R2;
config/runtime validation, deterministik UE–slice mapping, statik weighted
inter-slice allocation, scheduler resolver, RB demand, composite orchestration
ve temel `runM4()` akışını kapsar.
R3 packet observation, slice/cell performans KPI'ları, serialization/parser,
M4 workload guard ve worker altyapısını ekler. R4/R5, React hook, worker
lifecycle/cancellation ve frontend'i ekler (`src/features/m4/`). Multi-seed
deney ve dynamic inter-slice policy hâlâ bulunmaz.
## Canonical slice modeli
Canonical sıra değişmez:
1. eMBB (`embb`)
2. URLLC (`urllc`)
3. mMTC (`mmtc`)
eMBB, geniş bant ve yüksek veri hızı kullanımını temsil eder. URLLC, 5QI 1 ve
2 üzerinden gecikmeye duyarlı QoS sınıfları için bir proxy'dir.
mMTC, 5QI 9 tabanlı Non-GBR mMTC proxy. Ayrı düşük packet-size veya düşük
arrival-rate parametresi bu baseline’da tanımlı değildir.
Metadata, renk, varsayılan ağırlık, minimum pay, scheduler ve izin verilen 5QI
listeleri `src/config/m4.json` dosyasından gelir. Bilimsel varsayımlar
TypeScript kodunda ikinci bir kopya olarak tutulmaz.
## Deterministik UE–slice mapping
UE indexleri `0 ... totalUeCount - 1` aralığındadır. İlk `embb` sayısı kadar
UE eMBB'ye, sonraki `urllc` sayısı kadar UE URLLC'ye, kalan `mmtc` sayısı kadar
UE mMTC'ye atanır. Shuffle, RNG veya gizli seed kullanılmaz. Her UE tam bir
slice'a aittir; zero-UE slice boş listeyle korunur.
## Static-weighted inter-slice policy
Allocator saf, integer ve deterministiktir. Her slot üç ayrı havuzla işlenir.
### 1. Minimum guarantee quota
Her enabled slice için `minimumShare × totalResourceBlocks` exact kotası
hesaplanır. Integer kota largest-remainder yöntemiyle elde edilir. Eşit
remainder durumunda öncelik `slotIndex` ile canonical sıra üzerinde döner;
böylece tek slice kalıcı tie avantajı elde etmez. Rounded kota toplamı hücre
RB sayısını aşamaz.
Bir slice'ın garanti kullanımı:
```text
guaranteed = min(rounded quota, demand)
unused guarantee = rounded quota - guaranteed
```
### 2. Ordinary shared pool
```text
ordinary shared pool = total RB - sum(rounded guarantee quotas)
```
Bu havuz redistribution ayarından bağımsız olarak her zaman unmet demand
bulunan enabled slice'lara ağırlıklı ve integer biçimde dağıtılır. Demand
üstüne çıkılmaz. Ordinary shared RB'ler borrowed, lent veya transfer değildir
ve transfer telemetrisi üretmez.
### 3. Unused guarantee redistribution
```text
unused guarantee pool = sum(unused guarantee)
```
`redistributionEnabled=true` olduğunda bu havuz unmet demand bulunan
slice'lara ağırlıklı dağıtılır. Yalnız bu aşamadaki RB'ler redistributed,
borrowed ve lent sayılır. Donor–receiver transfer kayıtları yalnız bu havuzu
temsil eder.
`redistributionEnabled=false` olduğunda kullanılmayan garanti RB'leri
unallocated kalır. Ordinary shared pool yine normal biçimde dağıtılır.
Zorunlu transfer eşitliği:
```text
sum(redistributed) = sum(borrowed) = sum(lent) = sum(transfers)
```
## Conservation invariants
Her sonuç aşağıdaki eşitlikleri açık alanlarla raporlar:
```text
totalAllocated + totalUnallocated = totalResourceBlocks
ordinarySharedAllocated + ordinarySharedUnallocated = ordinarySharedPool
redistributed + unusedRedistributionRemainder = unusedGuaranteePool
allocated(slice) = guaranteed + ordinaryShared + redistributed
allocated(slice) <= requested(slice)
```
`conservationSatisfied`, ancak bütün bu eşitlikler ve transfer denklikleri
gerçekten sağlanıyorsa `true` olur. Invariant ihlali gizlenmez.
## Validation ve immutability
Config, runtime config, mapping ve allocator girdileri runtime'da doğrulanır.
Canonical olmayan, eksik, duplicate veya unknown slice; geçersiz scheduler;
negatif/kesirli RB ve UE; non-finite ağırlık; aşırı minimum pay ve
desteklenmeyen policy reddedilir.
Factory ve allocator caller girdilerini değiştirmez. Dönen snapshot'ların
nesne ve koleksiyon katmanları dondurulur.
## R2 scheduler ve trafik orchestration
Round Robin, Max-C/I, PF, M-LWDF ve EXP-PF M2 registry'sinden; QDF-PF M3
registry'sinden çözülür. Scheduler algoritmaları M4 içinde kopyalanmaz.
Enabled ve non-empty her slice ayrı session taşır. Queue'lar slice içinde local
indexlerle sunulur ve tahsisler global UE indexlerine geri çevrilir.
Trafik sınıfı ataması runtime metadata'daki `allowedFiveQis` üzerinden slice
içinde deterministic round-robin yapılır. RNG veya shuffle kullanılmaz.
Trafik parametreleri mevcut M2 traffic class snapshot'ından gelir.
RB talebi ortak `requiredResourceBlocksForQueue()` matematiğini kullanır.
Full-band kapasite semantiği, local UE hızını slice bütçesi / hücre toplam RB
oranıyla ölçekleyerek korunur.
## Resource telemetry
Allocator tarafından verilen RB, scheduler'ın kullandığı RB, scheduler-unused
RB ve cell-unallocated RB ayrı alanlardır. Scheduler-unused bütçe aynı slotta
başka slice'a ikinci kez dağıtılmaz.
Resource trace yalnız ilk yapılandırılmış N slotu tutar. Streaming totals bütün
slotları içerir. Slot ve toplam seviyesinde allocation, usage, unallocated,
borrowed, lent ve redistributed conservation eşitlikleri doğrulanır; ihlal
açık hata üretir.
M4 reproducibility fingerprint bilimsel config, mapping, trafik ataması, seed
ve M2 realization fingerprint'lerini kapsar. Trace limiti ile browser workload
guard limitleri fingerprint kapsamı dışındadır.
## R3 metrics ve worker
Packet observation yalnız gerçek arrival, tamamlanan delivery ve slot-sonu UE
queue snapshot'larını yayınlar. Kısmi servis delivery sayılmaz. Streaming
accumulator bütün packet event'lerini result içinde saklamaz; exact delay
histogramı ve streaming toplamlar kullanır.
Slice ve cell seviyesinde offered/delivered load, throughput, final queue,
packet delivery, packet-weighted P50/P95/P99, delay violation, GBR meeting,
Jain fairness ve resource utilization raporlanır. Paydası olmayan oranlar
`null` değerini kullanır.
M4 JSON serializer deterministiktir; parser schema ve bilimsel/resource
bütünlüğünü runtime'da doğrular. M4 worker saf handler üzerinden çalışır.
Tek composite M4 maliyeti UE × RB × slot olarak hesaplanır ve ortak
100.000.000 browser-safe limitini kullanır.
