/**
* Jain adalet indeksi.
*
* F-METRIC-01: İndeks yalnız pozitif bir throughput dağılımı için tanımlıdır.
* Aşağıdaki durumlar matematiksel olarak TANIMSIZDIR ve `null` döndürür
* (sessizce 0'a çevrilmez):
*   - UE yok (boş liste),
*   - tüm throughput değerleri sıfır.
* `null`, "adil dağılım 0" ile karıştırılmamalıdır; UI bunu "N/A" gösterir.
*/
export function calculateJainFairness(values: readonly number[]): number | null {
 if (values.length === 0) return null
 const sum = values.reduce((total, value) => total + value, 0)
 const squareSum = values.reduce((total, value) => total + value ** 2, 0)
 if (squareSum === 0) return null
 return sum ** 2 / (values.length * squareSum)
}
/** UI için: null → "N/A", sayı → sabit ondalıklı gösterim. */
export function formatFairnessValue(value: number | null, fractionDigits = 3): string {
 return value === null ? 'N/A' : value.toFixed(fractionDigits)
}
