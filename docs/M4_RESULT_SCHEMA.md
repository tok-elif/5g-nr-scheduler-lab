# M4 Result Schema
## Schema
`M4Result.schemaVersion` değeri `1`'dir. Sonuç; doğrulanmış runtime config,
UE–slice mapping, per-UE 5QI trafik ataması, M2 sonucu, bounded resource trace,
streaming resource totals, slice/cell performans metrikleri, scheduler mapping
ve reproducibility fingerprint içerir.
## Performans metrikleri
Slice ve cell metrikleri configured offered load, realized offered Mbits,
delivered Mbits, throughput, final queue, packet counts, delivery ratio,
packet-weighted latency, delay violation, GBR meeting, Jain fairness ve
resource utilization alanlarını içerir.
Paydası sıfır olan delivery, delay, GBR ve utilization oranları `0` veya `1`
yerine `null` olur. Zero-UE slice canonical sonuç sırasından çıkarılmaz.
Latency arrival-to-completion gecikmesidir ve packet-weighted hesaplanır.
P50/P95/P99, slot tabanlı exact delay histogramından linear interpolation R7
ile hesaplanır. UE percentile ortalamalarının ortalaması kullanılmaz.
Bir delivery ancak `delayMs > 5QI packet delay budget` olduğunda violation
sayılır; eşitlik violation değildir. GBR meeting yalnız pozitif GBR hedefli
UE'lerde `throughput + epsilon >= configured GBR` kuralını kullanır. Fairness
mevcut Jain helper'ıyla UE throughput değerlerinden hesaplanır; zero-UE için
`null`, bütün throughput değerleri sıfırsa mevcut helper convention'ıyla `0`
olur.
Resource share `slice allocated / cell available`, scheduler utilization ise
`scheduler used / slice allocated` değeridir. Sıfır allocated RB durumunda
utilization `null` olur.
## Observation ve bounded state
M2 observation sink arrival, completed delivery ve UE slot-end snapshot'larını
deterministik sırada yayınlar. Kısmi servis delivery değildir. M4 accumulator
packet dump saklamaz; count, Mbit toplamı ve exact delay histogramı streaming
güncellenir. Resource trace limiti metrics ve fingerprint sonuçlarını
değiştirmez.
## JSON
`serializeM4Result()` deterministik, timestamp ve request ID içermeyen JSON
üretir. `parseM4Result()` schema, config, mapping, traffic assignment, M2 temel
yapısı, resource conservation, metrics oranları/percentile sırası ve
fingerprint formatı için runtime validation uygular. Parsed snapshot derin
immutable'dır.
Fingerprint bilimsel config, mapping, traffic assignment ve M2 realization
fingerprint'lerini kapsar. Metrics, observation sink, trace limiti, workload
limitleri ve worker request ID kapsam dışındadır.
## Worker protocol
Request `run-m4`, success response `m4-result`, hata response `m4-error`
kind'ını taşır. Request ID response'ta echo edilir fakat bilimsel fingerprint'e
girmez. Saf handler protocol validation, M4 workload guard ve `runM4()` akışını
uygular; stack trace veya `Error` nesnesi göndermez.
mMTC, 5QI 9 tabanlı Non-GBR mMTC proxy.
Ayrı düşük packet-size veya düşük arrival-rate parametresi bu baseline’da
tanımlı değildir.
React hook, worker lifecycle ve frontend uygulanmıştır (`src/features/m4/`,
`src/hooks/m4WorkerLifecycle.ts`). Navigation, multi-seed deney ve dynamic
slicing henüz uygulanmamıştır.
