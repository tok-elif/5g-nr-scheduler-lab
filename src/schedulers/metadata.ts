import { M3_CONFIG } from '../config/m3'
export type SchedulerRole =
 | 'baseline'
 | 'literature'
 | 'literature-adaptation'
 | 'project-proposal'
 | 'ablation'
export interface SchedulerParameterDescriptor {
 id: string
 label: string
 value: number | string
 unit?: string
 description: string
}
export interface SchedulerDescriptor {
 id: string
 displayName: string
 role: SchedulerRole
 source?: {
   title: string
   citation: string
   url?: string
 }
 originalFormula?: string
 originalFormulaLatex?: string
 implementedFormula: string
 implementedFormulaLatex: string
 formulaSymbols: readonly { symbol: string; meaning: string }[]
 adaptations: string[]
 parameters: SchedulerParameterDescriptor[]
 limitations: string[]
 metricRecomputationPolicy: 'slot_start' | 'per_rb'
 stateUpdatePolicy: string
}
export const SCHEDULER_DESCRIPTORS: readonly SchedulerDescriptor[] = Object.freeze([
 {
   id: 'proportional-fair',
   displayName: 'Proportional Fair',
   role: 'baseline',
   implementedFormula: 'R_i / max(T_i, ε_T)',
   implementedFormulaLatex: String.raw`M_i(t)=\frac{R_i(t)}{\max\!\left(T_i(t),\varepsilon_T\right)}`,
   formulaSymbols: [
     { symbol: 'Rᵢ(t)', meaning: 'UE i için anlık ulaşılabilir hız' },
     { symbol: 'Tᵢ(t)', meaning: 'EWMA geçmiş throughput' },
     { symbol: 'εₜ', meaning: 'PF paydası sayısal alt sınırı' },
   ],
   adaptations: ['Statik wideband ulaşılabilir hız kullanılır.'],
   parameters: [],
   limitations: ['Zamanla değişen hızlı fading fırsatçılığı bu modelde ölçülmez.'],
   metricRecomputationPolicy: 'slot_start',
   stateUpdatePolicy: 'Bütün UE throughput EWMA değerleri slot sonunda güncellenir; servis almayan UE için örnek sıfırdır.',
 },
 {
   id: 'm-lwdf',
   displayName: 'M-LWDF',
   role: 'literature',
   source: {
     title: 'Providing quality of service over a shared wireless link',
     citation: 'Andrews et al., IEEE Communications Magazine, 2001',
     url: 'https://doi.org/10.1109/35.900644',
   },
   originalFormula: 'a_i W_i R_i / T_i',
   originalFormulaLatex: String.raw`M_i(t)=a_iW_i(t)\frac{R_i(t)}{T_i(t)}`,
   implementedFormula: '[-ln(δ_i) / τ_i] × W_i × R_i / max(T_i, ε_T)',
   implementedFormulaLatex: String.raw`M_i(t)=\left(\frac{-\ln\delta_i}{\tau_i}\right)W_i(t)\frac{R_i(t)}{\max\!\left(T_i(t),\varepsilon_T\right)}`,
   formulaSymbols: [
     { symbol: 'Wᵢ(t)', meaning: 'Head-of-Line paket gecikmesi' },
     { symbol: 'τᵢ', meaning: 'Packet Delay Budget' },
     { symbol: 'δᵢ', meaning: 'İzin verilen gecikme ihlal olasılığı' },
     { symbol: 'Rᵢ/Tᵢ', meaning: 'Proportional Fair kanal/fairness oranı' },
   ],
   adaptations: ['Zaman birimleri saniyeye dönüştürülür.', 'Greedy wideband RB dolumu kullanılır.'],
   parameters: [],
   limitations: ['Orijinal teorik kanal modeliyle birebir reprodüksiyon değildir.'],
   metricRecomputationPolicy: 'slot_start',
   stateUpdatePolicy: 'Bütün UE throughput EWMA değerleri slot sonunda güncellenir.',
 },
 {
   id: 'exp-pf',
   displayName: 'EXP/PF',
   role: 'literature',
   source: {
     title: 'Pathwise optimality of the exponential scheduling rule for wireless channels',
     citation: 'Shakkottai, Srikant and Stolyar, Advances in Applied Probability, 2004',
     url: 'https://doi.org/10.1239/aap/1103662957',
   },
   implementedFormula: 'exp[(a_iW_i − mean(aW)) / (1 + sqrt(mean(aW)))] × R_i / max(T_i, ε_T)',
   implementedFormulaLatex: String.raw`M_i(t)=\exp\!\left(\frac{a_iW_i(t)-\overline{aW}(t)}{1+\sqrt{\overline{aW}(t)}}\right)\frac{R_i(t)}{\max\!\left(T_i(t),\varepsilon_T\right)}`,
   formulaSymbols: [
     { symbol: 'aᵢWᵢ(t)', meaning: 'UE i gecikme aciliyeti' },
     { symbol: 'āW(t)', meaning: 'Uygun kuyrukların ortalama aciliyeti' },
     { symbol: 'exp(·)', meaning: 'Göreli aciliyet farkını büyüten üstel terim' },
     { symbol: 'Rᵢ/Tᵢ', meaning: 'Proportional Fair oranı' },
   ],
   adaptations: [
     'Mean urgency ve tahsis aynı schedulable backlog kümesini kullanır.',
     'PF oranı ve bu projedeki normalize üstel ifade greedy wideband RB dolumuna uyarlanır.',
   ],
   parameters: [],
   limitations: [
     'Statik wideband SINR, opportunistic kanal çeşitliliğini sınırlar.',
     'Bu uygulama kaynak makaledeki teorik modelin birebir reprodüksiyonu değildir.',
   ],
   metricRecomputationPolicy: 'slot_start',
   stateUpdatePolicy: 'Bütün UE throughput EWMA değerleri slot sonunda güncellenir.',
 },
 {
   id: 'qdf-pf',
   displayName: 'QDF-PF · İlk M3 prototipi',
   role: 'project-proposal',
   implementedFormula: 'M-LWDF tabanı × (1 + β·GBR açığı) × (1 + γ/priority)',
   implementedFormulaLatex: String.raw`M_i^{\mathrm{QDF-PF}}(t)=M_i^{\mathrm{M\! -\! LWDF}}(t)\left(1+\beta D_i^{\mathrm{GBR}}(t)\right)\left(1+\gamma P_i^{\mathrm{5QI}}\right)`,
   formulaSymbols: [
     { symbol: 'Mᵢᴹ⁻ᴸᵂᴰᶠ', meaning: 'Gecikme ağırlıklı PF taban metriği' },
     { symbol: 'Dᵢᴳᴮᴿ', meaning: '0–1 aralığına sınırlandırılmış nominal GBR açığı' },
     { symbol: 'Pᵢ⁵Qᴵ', meaning: '1 / priorityLevel öncelik ağırlığı' },
     { symbol: 'β, γ', meaning: 'GBR açığı ve 5QI öncelik çarpanları' },
   ],
   adaptations: ['Proje kapsamında geliştirilmiş deneysel çarpanlar kullanılır.'],
   parameters: [
     {
       id: 'beta',
       label: 'GBR açık ağırlığı',
       value: M3_CONFIG.qdfPf.beta,
       description: 'Proje prototipindeki deneysel GBR çarpanı.',
     },
     {
       id: 'gamma',
       label: '5QI öncelik ağırlığı',
       value: M3_CONFIG.qdfPf.gamma,
       description: 'Proje prototipindeki deneysel öncelik çarpanı.',
     },
     {
       id: 'epsilonThroughputMbps',
       label: 'Throughput epsilon',
       value: M3_CONFIG.qdfPf.epsilonThroughputMbps,
       unit: 'Mbps',
       description: 'PF paydasındaki sayısal alt sınır.',
     },
   ],
   limitations: [
     'Yerleşik bir literatür algoritmasının birebir reprodüksiyonu değildir.',
     'Parametrelerin teorik optimalite garantisi yoktur.',
     'Yeni bilimsel aday seçiminden önceki prototip olarak korunur.',
     'GBR açığı nominal yapılandırılmış GBR üzerinden hesaplanır; talep-sınırlı raporlama KPI’sıyla aynı kavram değildir.',
   ],
   metricRecomputationPolicy: 'slot_start',
   stateUpdatePolicy: 'M2 throughput EWMA protokolünü kullanır.',
 },
])
export function getSchedulerDescriptor(id: string): SchedulerDescriptor {
 return SCHEDULER_DESCRIPTORS.find((descriptor) => descriptor.id === id) ?? {
   id,
   displayName: id,
   role: 'baseline',
   implementedFormula: 'Metadata henüz tanımlanmadı.',
   implementedFormulaLatex: String.raw`\text{Formül metadata kaydında tanımlı değildir.}`,
   formulaSymbols: [],
   adaptations: [],
   parameters: [],
   limitations: ['Scheduler metadata kaydı eksik.'],
   metricRecomputationPolicy: 'slot_start',
   stateUpdatePolicy: 'Belirtilmedi.',
 }
}
