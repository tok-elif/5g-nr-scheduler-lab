# M3 Bilimsel Deney Protokolü
Makinece okunabilir kaynak `configs/M3_EXPERIMENT_PROTOCOL.json`, schema ise `configs/M3_EXPERIMENT_
PROTOCOL.schema.json` dosyasıdır.
## Deney tasarımı
- Senaryolar: SC-1 aynı QoS, SC-2 karışık QoS.
- Deneysel genişletme yükleri: `ρ = offeredLoadMbps / capacityReferenceMbps`; 0.50, 0.80, 1.10.
- `capacityReferenceMbps`, örneklenmiş en iyi UE tam-bant hızıdır; Shannon veya gerçek hücre kapasitesi değildir.
- Development ve evaluation seed listeleri ayrı ve kesişimsizdir.
- Formül, parametre, eşik ve aday elemesi evaluation seed'lerine bakılarak değiştirilemez.
## İstatistik
- Aynı seed koşuları eşleştirilir.
- Örnek standart sapması ve Student-t %95 güven aralığı kullanılır.
- Güven aralığının sıfırı kesmesi eşdeğerlik kanıtı değildir.
- P99, linear interpolation R7 ile hesaplanır; 100 örnek eşiği proje raporlama kuralıdır.
- Null/N/A değer pairwise farkta sıfıra çevrilmez.
## Baseline politikası
- QoS: M-LWDF ve EXP/PF.
- Throughput maliyeti: PF.
- Fairness: PF ve güçlü QoS baseline'ı.
## Pratik önem
%5 throughput ve 0.02 Jain varsayılan eşikleri literatür standardı değildir; sonuçlardan önce seçilmiş proje non-
inferiority sınırlarıdır. %3/%5/%10 throughput ve 0.01/0.02/0.05 Jain duyarlılık görünümü desteklenir.
## Bütünlük
Eksik koşu, seed rolü çakışması, fingerprint uyuşmazlığı ve non-finite metrik bilimsel sonuç üretimini başarısız kılar.
## İstemci kaynak güvenliği
M3 browser-safe hard workload limit: **200.000.000 UE-RB-slot**.
Bu limit scientific config değildir, fingerprint'e girmez ve yalnız istemci
kaynak güvenliği amacı taşır. Normal M3 karşılaştırmasının maliyet modeli
scheduler sayısı × UE sayısı × RB sayısı × slot sayısıdır. Bilimsel deney
worker'ının mevcut senaryo × hücre × scheduler × seed × slot × UE maliyet
modeli de aynı M3'e özel limit kaynağını kullanır.
M2'ye özel limit 300.000.000 olarak, ortak M4/diğer deney limiti ise
100.000.000 olarak korunur.
