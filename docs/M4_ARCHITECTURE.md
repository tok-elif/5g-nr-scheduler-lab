# M4 Architecture
## R2 scheduler orchestration
Uygulanan veri akışı:
```text
src/config/m4.json
 → src/config/m4Config.ts
 → src/simulation/sliceMapping.ts
 → src/simulation/interSliceAllocator.ts
 → src/simulation/m4SchedulerResolver.ts
 → src/simulation/m4Demand.ts
 → src/simulation/m4SchedulerOrchestrator.ts
 → src/simulation/m4.ts
```
`m4.json`, üç canonical slice'ın bilimsel metadata ve varsayılanlarını
tanımlar. `m4Config.ts`, JSON'u derin runtime validation ile yükler ve
immutable runtime config snapshot'ı üretir. `sliceMapping.ts`, UE indexlerini
deterministik ve contiguous biçimde slice'lara eşler.
`interSliceAllocator.ts`, minimum guarantee, ordinary shared ve unused
guarantee redistribution havuzlarını birbirinden ayıran statik weighted RB
allocation sonucunu üretir.
R2, altı gerçek scheduler'ı M2/M3 registry'lerinden çözer. Her enabled ve
non-empty slice bağımsız scheduler session kullanır. Local UE indexleri
scheduler çağrısından sonra global UE indexlerine çevrilir. Slice bütçesine
göre ölçeklenen full-band UE hızı, RB başına fiziksel kapasitenin hücre
genelindeki anlamını korur.
Composite session telemetry state'i session-scoped'dur. Aynı orchestrator
factory'sinden oluşturulan iki composite session; alt slice scheduler
session'larını, bounded trace'i, slice accumulator'larını, cell
accumulator'larını ve processed-slot sayacını paylaşmaz. Trace ve streaming
totals tamamen ilgili session'a aittir. `runM4()` açıkça tek bir bağımsız
orchestrator session oluşturur, M2'yi o session'a bağlı scheduler ile
çalıştırır ve yalnız aynı session'ın telemetry snapshot'larını sonuç içine
alır.
M2 motorundaki geriye uyumlu per-UE trafik override'ı, M4'ün runtime
metadata'daki allowed 5QI listelerini deterministik round-robin atamasına
dönüştürmesini sağlar. Options verilmediğinde M2 davranışı ve fingerprint'leri
değişmez.
`runM4()` M2 paket yaşam döngüsünü kopyalamadan composite scheduler ile
çalıştırır. Allocated, scheduler-used, scheduler-unused ve cell-unallocated RB
alanları ayrı tutulur. İlk N slot bounded resource trace içinde saklanırken
bütün slotların kaynak toplamları streaming accumulator ile hesaplanır.
One-slice full-band koşusu aynı trafik override'ı verilen direct M2 sonucu ile
eşdeğerdir.
## Determinism and ownership
R1 fonksiyonları RNG veya gizli seed kullanmaz. Aynı config, UE kompozisyonu,
RB talebi ve slot indexi aynı sonucu üretir. Slot indexi yalnız eşit integer
rounding remainder önceliğini canonical sıra üzerinde döndürür.
Caller input'ları mutate edilmez. Config, mapping ve allocation sonuçları
immutable snapshot olarak döner.
## Deterministic fingerprint
M4 fingerprint seed, bilimsel hücre/M2 alanları, M2 trafik ve UE-SINR
fingerprint'leri, mapping, per-UE trafik ataması ve slice policy/scheduler
alanlarını kapsar. Resource trace limiti, workload guard limitleri, çalışma
süresi, UI/request/export metadata'sı kapsam dışındadır.
## Implemented tests
- JSON config ve runtime validation
- Canonical metadata, scheduler, 5QI ve renk sözleşmeleri
- UE toplamları, enabled türetimi ve immutable factory
- Deterministik UE–slice mapping ve zero-UE slice
- Üç aşamalı integer RB allocation
- Ordinary shared ile guarantee redistribution ayrımı
- Borrowed/lent/transfer denklikleri
- Tie rotation ve conservation matrisi
- Invalid runtime input reddi
- Altı scheduler resolver ve QDF-PF M3 registry kaynağı
- Ortak RB requirement helper ve canonical slice demand
- M2 per-UE trafik override geriye uyumluluğu
- Composite session izolasyonu ve local/global index adaptasyonu
- Full-band kapasite korunumu
- Allocated/used/unused ayrımı ve conservation
- Bounded trace ve streaming totals
- Temel `runM4`, fingerprint ve one-slice M2 eşdeğerliği
## R3 metrics, serialization and worker
M2 motorundaki opsiyonel observation sink, sonuç ve fingerprint davranışını
değiştirmeden arrival, completed delivery ve UE slot-end snapshot'larını
streaming M4 accumulator'a iletir. Accumulator sınırsız packet dump tutmaz;
packet count/Mbit toplamları ve exact delay histogramı kullanır.
R3 slice/cell KPI'ları packet-weighted latency percentiles, delay violation,
GBR meeting, Jain fairness ve resource utilization alanlarını kapsar.
`runM4()` observation sink'i bağlar ve immutable metrics snapshot'ını sonuca
ekler. Trace limiti metrics veya fingerprint'i etkilemez.
Deterministik JSON serializer ve derin runtime-validating parser eklendi.
M4'e özel guard tek composite run maliyetini UE × RB × slot olarak hesaplar
ve ortak 100 milyon limitini kullanır. Protocol validator, saf request handler
ve ince Web Worker entry point global mutable state taşımadan `runM4()`ü
çalıştırır.
## R4/R5: frontend, worker lifecycle ve grafikler
R3'ten sonra aşağıdaki katmanlar da uygulandı: React hook
(`useM4SimulationWorker`), worker lifecycle ve cancellation
(`m4WorkerLifecycle`), frontend (`M4Page` ve slice kartları/tablosu/grafikleri),
JSON export. Bu katmanlar `src/features/m4/`, `src/hooks/m4WorkerLifecycle.ts`
ve `src/exports/m4Serialize.ts` altında yer alır ve kendi test dosyalarıyla
kapsanır (`m4R5Integration.test.ts` dahil).
## Planned, not implemented
Aşağıdaki katmanlar hâlâ planlanmıştır fakat uygulanmamıştır:
- navigation (M4 sayfasına uygulama içi yönlendirme)
- CSV export (yalnız JSON export mevcuttur)
- multi-seed experiment (M3'teki Student-t tabanlı çoklu-seed altyapısının M4 karşılığı)
- dynamic inter-slice policy (yalnız static-weighted policy desteklenir)
Bu dokümantasyon yukarıdaki dört maddenin tamamlandığını iddia etmez.
