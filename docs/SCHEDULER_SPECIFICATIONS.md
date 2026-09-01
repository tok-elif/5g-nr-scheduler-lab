# Scheduler Spesifikasyonları
Bu belge mevcut scheduler'ların uygulanan formüllerini ve gelecekteki adayların entegrasyon kurallarını tanımlar.
Runtime/UI metadata kaynağı `src/schedulers/metadata.ts` dosyasıdır.
## Ortak motor protokolü
- Metrikler slot başında hesaplanır.
- Greedy allocator schedulable kuyrukları puana göre sıralar ve RB bütçesini aşmaz.
- Throughput EWMA bütün UE'ler için slot sonunda güncellenir; servis almayan UE örneği sıfırdır.
- Statik wideband achievable rate kullanılır.
## PF
`R_i / max(T_i, ε_T)`. Throughput/fairness baseline'ıdır; QoS garantisi iddia edilmez.
## M-LWDF
`[-ln(δ_i)/τ_i] × W_i × R_i/max(T_i, ε_T)`. Andrews ve diğerlerinin delay-aware scheduling yaklaşımına dayanır;
mevcut greedy wideband uygulama birebir teorik kanal modeli değildir. Kaynak: Andrews et al., IEEE Communications
Magazine 39(2), 2001, DOI 10.1109/35.900644.
## EXP/PF
`exp[(a_iW_i − mean(aW))/(1 + sqrt(mean(aW)))] × PF_i`. Mean urgency ve allocation uygunluk kümesi ortaktır. Bu
form, kaynak teorik modelin birebir reprodüksiyonu değil proje uyarlamasıdır. Kaynak: Shakkottai, Srikant ve Stolyar,
Advances in Applied Probability 36(4), 2004, DOI 10.1239/aap/1103662957.
## QDF-PF
İlk M3 proje prototipidir. Yerleşik literatür algoritması olarak sunulmaz. Gelecekteki bilimsel aday seçimi tamamlanana
kadar geçmiş/karşılaştırma amacıyla korunur. Scheduler içindeki GBR açığı nominal yapılandırılmış GBR'yi kullanır;
yeni talep-sınırlı GBR raporlama KPI'larıyla özdeş değildir.
## Gelecekteki adaylar
Project-adapted LOG Rule, UE-level adapted QoS-PF ve NQ-PF ancak ayrı teknik spesifikasyon, development seed
ön elemesi ve ablation sonrasında registry'ye eklenebilir. Teorik garantilerin uyarlamaya taşındığı varsayılamaz.
