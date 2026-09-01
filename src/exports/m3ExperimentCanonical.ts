import { APPLICATION_METADATA } from '../config/application'
import { M3_EXPERIMENT_PROTOCOL } from '../config/m3ExperimentProtocol'
import { SCHEDULER_DESCRIPTORS } from '../schedulers/metadata'
import type { M3ScientificExperimentResult } from '../simulation/m3Experiment'
/**
* F-REPRO-01 çözümü: M3 bilimsel deney sonucunun BYTE düzeyinde deterministik
* kanonik JSON export'u.
*
* `generatedAt` gibi zaman damgaları kanonik export'un DIŞINDA bırakılır; böylece
* aynı bilimsel girdi her zaman aynı byte dizisini üretir. Anahtar sırası sabittir
* (özyinelemeli alfabetik) ve non-finite sayılar reddedilir. Bilimsel fingerprint
* ve istatistikler değişmez; yalnız serialization/metadata katmanı etkilenir.
*/
/** Sonuçtan zaman-damgası gibi deterministik olmayan alanları çıkarır. */
export function canonicalizeM3ExperimentResult(
 result: M3ScientificExperimentResult,
): Omit<M3ScientificExperimentResult, 'generatedAt'> {
 // `generatedAt` bilerek dışarıda bırakılır; diğer tüm alanlar korunur.
 const { generatedAt: _ignored, ...deterministic } = result
 void _ignored
 return deterministic
}
function assertFiniteDeep(value: unknown, path: string): void {
 if (typeof value === 'number') {
   if (!Number.isFinite(value)) {
     throw new Error(`Kanonik export non-finite sayı içeremez: ${path} = ${String(value)}`)
   }
   return
 }
 if (Array.isArray(value)) {
   value.forEach((item, index) => assertFiniteDeep(item, `${path}[${index}]`))
   return
 }
 if (value && typeof value === 'object') {
   for (const [key, nested] of Object.entries(value)) {
     assertFiniteDeep(nested, path === '' ? key : `${path}.${key}`)
   }
 }
}
/** Anahtarları özyinelemeli alfabetik sıralayan kanonik kopya üretir. */
function canonicalize(value: unknown): unknown {
 if (Array.isArray(value)) return value.map(canonicalize)
 if (value && typeof value === 'object') {
   const sorted: Record<string, unknown> = {}
   for (const key of Object.keys(value as Record<string, unknown>).sort()) {
     sorted[key] = canonicalize((value as Record<string, unknown>)[key])
   }
   return sorted
 }
 return value
}
/** Sabit anahtar sıralı, deterministik JSON dizesi. */
export function stableStringify(value: unknown): string {
 assertFiniteDeep(value, '')
 return JSON.stringify(canonicalize(value), null, 2)
}
/**
* UI'nın ana bilimsel JSON export'u. Aynı bilimsel girdi için (farklı
* `generatedAt` olsa bile) byte-for-byte aynı çıktı üretir.
*/
export function serializeM3ExperimentCanonical(
 result: M3ScientificExperimentResult,
): string {
 const payload = {
   schemaVersion: 2,
   experimentType: 'm3-scheduler-scientific-multi-seed-comparison',
   canonical: true,
   application: APPLICATION_METADATA,
   experimentProtocol: M3_EXPERIMENT_PROTOCOL,
   schedulerMetadata: SCHEDULER_DESCRIPTORS,
   statisticalProtocol: {
     confidenceLevel: 0.95,
     standardDeviation: 'sample-standard-deviation-n-minus-1',
     interval: 'two-sided-student-t',
     pairedDifferenceDirection: 'comparator-minus-baseline',
     nullPolicy: 'not-applicable-values-remain-null',
   },
   result: canonicalizeM3ExperimentResult(result),
 }
 return stableStringify(payload)
}
