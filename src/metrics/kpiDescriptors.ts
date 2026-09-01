export type KpiBetterDirection = 'higher' | 'lower' | 'target' | 'neutral'
export interface KpiDescriptor {
 id: string
 label: string
 shortLabel: string
 unit: string | null
 betterDirection: KpiBetterDirection
 decimals: number
 supportsNull: boolean
 description: string
}
export const KPI_DESCRIPTORS = {
 cellThroughputMbps: {
   id: 'cellThroughputMbps', label: 'Hücre throughput', shortLabel: 'Throughput', unit: 'Mbps',
   betterDirection: 'higher', decimals: 3, supportsNull: false, description: 'Hücrenin toplam teslim edilen veri hızı.',
 },
 jainFairness: {
   id: 'jainFairness', label: 'Jain adalet indeksi', shortLabel: 'Jain', unit: null,
   betterDirection: 'higher', decimals: 4, supportsNull: false, description: 'UE throughput dağılımının 0–1 adaletölçüsü.',
 },
 deliveryRatio: {
   id: 'deliveryRatio', label: 'Paket teslim oranı', shortLabel: 'Teslim', unit: '%',
   betterDirection: 'higher', decimals: 2, supportsNull: false, description: 'Üretilen paketlerin teslim edilen bölümü.',
 },
 gbrUeMeetingRatio: {
   id: 'gbrUeMeetingRatio', label: 'GBR hedefini karşılayan UE oranı', shortLabel: 'GBR UE', unit: '%',
   betterDirection: 'higher', decimals: 2, supportsNull: true, description: 'Talep-sınırlı GBR hedefini karşılayan GBR UEoranı.',
 },
 gbrMeanFulfillmentRatio: {
   id: 'gbrMeanFulfillmentRatio', label: 'Ortalama GBR karşılanma oranı', shortLabel: 'GBR ort.', unit: '%',
   betterDirection: 'higher', decimals: 2, supportsNull: true, description: 'GBR UE başına kırpılmış hedef karşılamaoranının ortalaması.',
 },
 aggregateGbrServiceRatio: {
   id: 'aggregateGbrServiceRatio', label: 'Toplam GBR servis oranı', shortLabel: 'GBR toplam', unit: '%',
   betterDirection: 'higher', decimals: 2, supportsNull: true, description: 'Toplam sağlanan talep-sınırlı GBR servisinintoplam hedefe oranı.',
 },
 worstQosP99Ms: {
   id: 'worstQosP99Ms', label: 'En kötü 5QI P99 gecikmesi', shortLabel: 'P99', unit: 'ms',
   betterDirection: 'lower', decimals: 3, supportsNull: true, description: 'Teslim edilen paketlerden hesaplanan enyüksek 5QI P99 değeri.',
 },
 pdbViolationRatio: {
   id: 'pdbViolationRatio', label: 'PDB ihlal oranı', shortLabel: 'PDB ihlali', unit: '%',
   betterDirection: 'lower', decimals: 2, supportsNull: false, description: 'Teslim edilen paketler içinde PDB sınırınıaşanların oranı.',
 },
 queuedPackets: {
   id: 'queuedPackets', label: 'Simülasyon sonu kuyruk', shortLabel: 'Kuyruk', unit: 'paket',
   betterDirection: 'lower', decimals: 0, supportsNull: false, description: 'Simülasyon sonunda teslim edilmemiş paketsayısı.',
 },
} as const satisfies Record<string, KpiDescriptor>
export function formatMetricValue(descriptor: KpiDescriptor, value: number | null): string {
 if (value === null) return 'N/A'
 if (!Number.isFinite(value)) return 'Geçersiz değer'
 const formattedValue = descriptor.unit === '%'
   ? (value * 100).toLocaleString('tr-TR', { maximumFractionDigits: descriptor.decimals })
   : value.toLocaleString('tr-TR', { maximumFractionDigits: descriptor.decimals })
 return descriptor.unit ? `${formattedValue} ${descriptor.unit}` : formattedValue
}
export function betterDirectionLabel(descriptor: KpiDescriptor): string {
 if (descriptor.betterDirection === 'higher') return 'Yüksek daha iyi'
 if (descriptor.betterDirection === 'lower') return 'Düşük daha iyi'
 if (descriptor.betterDirection === 'target') return 'Hedefe yakın daha iyi'
 return 'Yönsüz bilgi metriği'
}
