import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type { M4RunInput } from '../simulation/m4Types'
import {
 createM4WorkerLifecycle,
 type M4WorkerLike,
} from './m4WorkerLifecycle'
export function useM4LifecycleSnapshot(
 lifecycle: ReturnType<typeof createM4WorkerLifecycle>,
) {
 return useSyncExternalStore(
   lifecycle.subscribe,
   lifecycle.getSnapshot,
   lifecycle.getSnapshot,
 )
}
export function useM4SimulationWorker() {
 const controller = useRef<ReturnType<typeof createM4WorkerLifecycle> | null>(null)
 if (!controller.current) {
   controller.current = createM4WorkerLifecycle({
     createWorker: () => new Worker(
       new URL('../workers/m4.worker.ts', import.meta.url),
       { type: 'module' },
     ) as M4WorkerLike,
     createRequestId: () => crypto.randomUUID(),
   })
 }
 const lifecycle = controller.current
 const state = useM4LifecycleSnapshot(lifecycle)
 useEffect(() => () => {
   lifecycle.dispose()
 }, [lifecycle])
 const run = useCallback((input: M4RunInput) => lifecycle.run(input), [lifecycle])
 const cancel = useCallback(() => lifecycle.cancel(), [lifecycle])
 const reset = useCallback(() => lifecycle.reset(), [lifecycle])
 return { ...state, isRunning: state.status === 'running', run, cancel, reset }
}
