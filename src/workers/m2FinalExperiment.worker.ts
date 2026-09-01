/// <reference lib="webworker" />
import { runFinalM2Experiment } from "../simulation/m2FinalExperiment";
import type {
 M2FinalExperimentProgress,
 M2FinalExperimentResult,
} from "../simulation/m2FinalExperiment";
interface FinalWorkerRequest {
 requestId: number;
}
type FinalWorkerResponse =
 | { type: "progress"; requestId: number; progress: M2FinalExperimentProgress }
 | { type: "success"; requestId: number; result: M2FinalExperimentResult }
 | { type: "error"; requestId: number; message: string };
const workerScope = self as DedicatedWorkerGlobalScope;
workerScope.onmessage = (event: MessageEvent<FinalWorkerRequest>) => {
 const { requestId } = event.data;
 try {
   const result = runFinalM2Experiment(undefined, (progress) => {
     const response: FinalWorkerResponse = {
       type: "progress",
       requestId,
       progress,
     };
     workerScope.postMessage(response);
   });
   const response: FinalWorkerResponse = {
     type: "success",
     requestId,
     result,
   };
   workerScope.postMessage(response);
 } catch (error) {
   const response: FinalWorkerResponse = {
     type: "error",
     requestId,
     message: error instanceof Error ? error.message : String(error),
   };
   workerScope.postMessage(response);
 }
};
export {};
