import { CELL_CONFIGS } from "../config/cells";
import { M2_SCHEDULERS } from "../m2Schedulers";
import {
 FINAL_M2_EXPERIMENT_PRESET,
 type M2FinalExperimentPreset,
 type M2FinalExperimentRunDefinition,
} from "../config/m2Scenarios";
import {
 runM2BatchMatrix,
 type M2BatchMatrixRequest,
 type M2BatchMatrixResult,
 type M2BatchProgress,
} from "./m2BatchMatrix";
export interface M2FinalExperimentProgress {
 completedRuns: number;
 totalRuns: number;
 stageIndex: number;
 stageCount: number;
 stageId: string;
 stageLabel: string;
 batchProgress: M2BatchProgress;
}
export interface M2FinalExperimentRunResult {
 definition: M2FinalExperimentRunDefinition;
 request: M2BatchMatrixRequest;
 result: M2BatchMatrixResult;
}
export interface M2FinalExperimentIntegrity {
 commonSeedList: boolean;
 commonCellCount: boolean;
 commonSchedulerCount: boolean;
 expectedScenarioCoverage: boolean;
 totalRunCountMatches: boolean;
}
export interface M2FinalExperimentResult {
 preset: M2FinalExperimentPreset;
 generatedAt: string;
 totalRuns: number;
 runs: M2FinalExperimentRunResult[];
 integrity: M2FinalExperimentIntegrity;
}
export function createFinalM2Requests(
 preset: M2FinalExperimentPreset = FINAL_M2_EXPERIMENT_PRESET,
): Array<{
 definition: M2FinalExperimentRunDefinition;
 request: M2BatchMatrixRequest;
}> {
 return preset.runs.map((definition) => ({
   definition: { ...definition },
   request: {
     scenarioId: definition.scenarioId,
     loadProfileId: definition.loadProfileId,
     durationMs: preset.durationMs,
     ueCount: preset.ueCount,
     baseSeed: preset.baseSeed,
     seedCount: preset.seedCount,
     seedStep: preset.seedStep,
   },
 }));
}
function equalNumberArrays(left: number[], right: number[]): boolean {
 return (
   left.length === right.length &&
   left.every((value, index) => value === right[index])
 );
}
function buildIntegrity(
 preset: M2FinalExperimentPreset,
 runs: M2FinalExperimentRunResult[],
 totalRuns: number,
): M2FinalExperimentIntegrity {
 const first = runs[0]?.result;
 const expectedScenarioIds = new Set(["sc1-same-qos", "sc2-mixed-qos"]);
 const actualScenarioIds = new Set(runs.map((run) => run.result.scenarioId));
 const expectedTotal = runs.reduce(
   (sum, run) => sum + run.result.totalRuns,
   0,
 );
 return {
   commonSeedList: first
     ? runs.every((run) => equalNumberArrays(run.result.seeds, first.seeds))
     : false,
   commonCellCount: first
     ? runs.every((run) => run.result.cellCount === first.cellCount)
     : false,
   commonSchedulerCount: first
     ? runs.every((run) => run.result.schedulerCount === first.schedulerCount)
     : false,
   expectedScenarioCoverage:
     preset.runs.length === 2 &&
     [...expectedScenarioIds].every((scenarioId) =>
       actualScenarioIds.has(scenarioId),
     ),
   totalRunCountMatches: expectedTotal === totalRuns,
 };
}
export function runFinalM2Experiment(
 preset: M2FinalExperimentPreset = FINAL_M2_EXPERIMENT_PRESET,
 onProgress?: (progress: M2FinalExperimentProgress) => void,
): M2FinalExperimentResult {
 const stages = createFinalM2Requests(preset);
 if (stages.length === 0)
   throw new Error("Final M2 deney preseti koşu içermiyor.");
 const runs: M2FinalExperimentRunResult[] = [];
 const totalRuns =
   stages.length *
   preset.seedCount *
   CELL_CONFIGS.length *
   M2_SCHEDULERS.length;
 let completedBeforeStage = 0;
 stages.forEach((stage, stageIndex) => {
   const result = runM2BatchMatrix(stage.request, (batchProgress) => {
     onProgress?.({
       completedRuns: completedBeforeStage + batchProgress.completedRuns,
       totalRuns,
       stageIndex: stageIndex + 1,
       stageCount: stages.length,
       stageId: stage.definition.id,
       stageLabel: stage.definition.label,
       batchProgress,
     });
   });
   runs.push({
     definition: { ...stage.definition },
     request: { ...stage.request },
     result,
   });
   completedBeforeStage += result.totalRuns;
 });
 const integrity = buildIntegrity(preset, runs, totalRuns);
 if (Object.values(integrity).some((value) => !value)) {
   throw new Error("Final M2 deney bütünlük doğrulaması başarısız oldu.");
 }
 return {
   preset: {
     ...preset,
     runs: preset.runs.map((run) => ({ ...run })),
   },
   generatedAt: new Date().toISOString(),
   totalRuns,
   runs,
   integrity,
 };
}
