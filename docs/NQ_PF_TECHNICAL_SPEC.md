# NQ-PF Teknik Spesifikasyonu — Uygulama Öncesi Taslak
Durum: `NEEDS_SPECIFICATION`. Bu görev NQ-PF kodu eklemez.
## Araştırma hipotezi
NQ-PF; PF kanal/fairness terimini normalize gecikme, talep-sınırlı GBR servis borcu ve yapılandırılabilir QoS öncelik
bileşeniyle birleştiren proje önerisidir. Hazır literatür algoritmasının birebir reprodüksiyonu değildir.
## Aday formül
```text
PF_i(t) = R_i / max(T_i, ε_T)
D_i(t) = clamp(HOL_i/PDB_i, 0, D_max)
Z_i(t+1) = max(0, Z_i(t) + requiredService_i(t) - servedBits_i(t))
G_i(t) = clamp(Z_i(t) / max(g_i H, ε_G), 0, 1)
U_i(t) = w_d D_i(t) + w_g G_i(t) + w_p P_i
M_i(t) = PF_i(t) [1 + λ U_i(t)]
```
`requiredService_i(t)` nominal olmayan trafiğe borç yazmamalıdır; backlog ve gerçekleşen/konfigüre talep semantiği
uygulamadan önce kilitlenmelidir.
## Zorunlu ablation
- A0: PF
- A1: PF + delay
- A2: PF + delay + GBR debt
- A3: PF + delay + GBR debt + priority
## Açık kararlar
- `D_max` ve PDB aşımı sonrası büyüme.
- Priority mapping'in ordinal niteliği.
- Borcun boş kuyruk davranışı ve warm-up.
- Slot-start/per-RB recomputation.
- Development grid ve Pareto seçim kuralı.
- Evaluation öncesi başarı/non-inferiority kriteri.
Teorik Lyapunov garantileri bu basitleştirilmiş servis borcuna atfedilemez.
