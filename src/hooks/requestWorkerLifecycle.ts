/**
* F-TEST-01 / F-ARCH-01 (worker tarafı): M2, normal M3 ve bilimsel M3 worker
* sürücülerinin ortak, enjekte edilebilir ve test edilebilir yaşam döngüsü.
*
* Tasarım M4'teki `createM4WorkerLifecycle` desenini genelleştirir. Stale-yanıt
* koruması, mesaja requestId gömmeyi GEREKTİRMEZ; aktif worker örneği kimliğiyle
* (closure) yapılır. Böylece mevcut worker protokolleri değişmeden korunur.
*
* Kurallar:
* - `run()` her çağrıda önceki worker'ı sonlandırır (double-run guard).
* - Yalnız AKTİF worker örneğinin mesajları işlenir (stale-yanıt guard).
* - Başarıda önce state yayınlanır, SONRA worker sonlandırılır → sonuç korunur.
* - Hata mesajları string'e indirgenir; stack UI'ya sızmaz.
* - `dispose()` worker'ı sonlandırır ve dinleyicileri temizler (unmount).
*/
export interface RequestWorkerLike<Request, Response> {
 onmessage: ((event: MessageEvent<Response>) => void) | null
 onerror: (() => void) | null
 onmessageerror: (() => void) | null
 postMessage(message: Request): void
 terminate(): void
}
export type RequestWorkerStatus = 'idle' | 'running' | 'success' | 'error'
export interface RequestWorkerState<Data> {
 readonly status: RequestWorkerStatus
 readonly data: Data | null
 readonly error: string | null
}
export interface ParsedResponse<Data> {
 readonly ok: boolean
 readonly data?: Data
 readonly error?: string
}
export interface RequestWorkerLifecycleInput<Request, Response, Data> {
 readonly createWorker: () => RequestWorkerLike<Request, Response>
 readonly readResponse: (response: Response) => ParsedResponse<Data>
 readonly errorMessage: string
 readonly messageErrorMessage?: string
 readonly onState?: (state: RequestWorkerState<Data>) => void
}
export function createRequestWorkerLifecycle<Request, Response, Data>(
 input: RequestWorkerLifecycleInput<Request, Response, Data>,
) {
 let worker: RequestWorkerLike<Request, Response> | null = null
 const listeners = new Set<() => void>()
 let state: RequestWorkerState<Data> = Object.freeze({ status: 'idle', data: null, error: null })
 const publish = (next: RequestWorkerState<Data>) => {
   state = Object.freeze(next)
   input.onState?.(state)
   for (const listener of [...listeners]) {
     try { listener() } catch { /* Bir dinleyici diğerlerini bloklamamalıdır. */ }
   }
 }
 const terminate = () => {
   worker?.terminate()
   worker = null
 }
 const fail = (error: string) => {
   terminate()
   publish({ status: 'error', data: null, error })
 }
 return Object.freeze({
   getSnapshot: () => state,
   getState: () => state,
   subscribe(listener: () => void): () => void {
     listeners.add(listener)
     return () => listeners.delete(listener)
   },
   run(request: Request): void {
     terminate()
     const nextWorker = input.createWorker()
     worker = nextWorker
     // Çalışırken önceki başarılı veriyi göstermeye devam et (M1/M2 davranışı).
     publish({ status: 'running', data: state.data, error: null })
     nextWorker.onmessage = (event) => {
       if (worker !== nextWorker) return // stale worker guard
       const parsed = input.readResponse(event.data)
       if (parsed.ok) {
         publish({ status: 'success', data: parsed.data ?? null, error: null })
         if (worker === nextWorker) terminate()
       } else {
         fail(parsed.error ?? input.errorMessage)
       }
     }
     nextWorker.onerror = () => { if (worker === nextWorker) fail(input.errorMessage) }
     nextWorker.onmessageerror = () => {
       if (worker === nextWorker) fail(input.messageErrorMessage ?? input.errorMessage)
     }
     nextWorker.postMessage(request)
   },
   cancel(): void {
     terminate()
     publish({ status: 'idle', data: state.data, error: null })
   },
   reset(): void {
     terminate()
     publish({ status: 'idle', data: null, error: null })
   },
   dispose(): void {
     terminate()
     listeners.clear()
   },
 })
}
export type RequestWorkerLifecycle<Request, Response, Data> =
 ReturnType<typeof createRequestWorkerLifecycle<Request, Response, Data>>
