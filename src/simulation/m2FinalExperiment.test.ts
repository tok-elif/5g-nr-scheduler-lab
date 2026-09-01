import { describe, expect, it } from "vitest";
import { CELL_CONFIGS } from "../config/cells";
import {
 FINAL_M2_EXPERIMENT_PRESET,
 type M2FinalExperimentPreset,
} from "../config/m2Scenarios";
import { M2_SCHEDULERS } from "../m2Schedulers";
import {
 createFinalM2Requests,
 runFinalM2Experiment,
} from "./m2FinalExperiment";
const preset: M2FinalExperimentPreset = {
 id: "test-final",
 label: "Test Final",
 description: "Small deterministic final-suite test.",
 durationMs: 10,
 ueCount: 4,
 baseSeed: 700,
 seedCount: 2,
 seedStep: 3,
 runs: [
   {
     id: "sc1-medium",
     label: "SC-1 medium",
     scenarioId: "sc1-same-qos",
     loadProfileId: "medium",
   },
   {
     id: "sc2-medium",
     label: "SC-2 medium",
     scenarioId: "sc2-mixed-qos",
     loadProfileId: "medium",
   },
 ],
};
describe("final M2 experiment suite", () => {
 it("defines the document final preset with both scenarios and 20 common seeds", () => {
   expect(FINAL_M2_EXPERIMENT_PRESET.seedCount).toBe(20);
   expect(
     FINAL_M2_EXPERIMENT_PRESET.runs.map((run) => run.scenarioId),
   ).toEqual(["sc1-same-qos", "sc2-mixed-qos"]);
 });
 it("creates the two main-document requests with one common seed policy", () => {
   const requests = createFinalM2Requests(preset);
   expect(requests.map((item) => item.request.scenarioId)).toEqual([
     "sc1-same-qos",
     "sc2-mixed-qos",
   ]);
   expect(requests.every((item) => item.request.baseSeed === 700)).toBe(true);
   expect(requests.every((item) => item.request.seedCount === 2)).toBe(true);
   expect(requests.every((item) => item.request.seedStep === 3)).toBe(true);
 });
 it("runs both scenarios across all cells and schedulers with integrity checks", () => {
   const result = runFinalM2Experiment(preset);
   const expectedPerScenario =
     preset.seedCount * CELL_CONFIGS.length * M2_SCHEDULERS.length;
   expect(result.runs).toHaveLength(2);
   expect(result.totalRuns).toBe(expectedPerScenario * 2);
   expect(result.runs[0]?.result.seeds).toEqual([700, 703]);
   expect(result.runs[1]?.result.seeds).toEqual([700, 703]);
   expect(Object.values(result.integrity).every(Boolean)).toBe(true);
 });
 it("is deterministic apart from generation timestamp", () => {
   const first = runFinalM2Experiment(preset);
   const second = runFinalM2Experiment(preset);
   expect({ ...first, generatedAt: "" }).toEqual({
     ...second,
     generatedAt: "",
   });
 });
});
