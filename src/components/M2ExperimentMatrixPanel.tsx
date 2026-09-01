import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
 DEFAULT_M2_EXPERIMENT_SCENARIO_ID,
 DEFAULT_M2_LOAD_PROFILE_ID,
 DEFAULT_M2_MATRIX_SETTINGS,
 FINAL_M2_EXPERIMENT_PRESET,
 M2_EXPERIMENT_SCENARIOS,
 M2_LOAD_PROFILES,
} from "../config/m2Scenarios";
import {
 createM2BatchJson,
 createM2BatchPairwiseCsv,
 createM2BatchSummaryCsv,
} from "../exports/m2MatrixSerialize";
import {
 createM2FinalJson,
 createM2FinalManifestCsv,
 createM2FinalPairwiseCsv,
 createM2FinalSummaryCsv,
} from "../exports/m2FinalExperimentSerialize";
import {
 type M2BatchMatrixRequest,
 type M2BatchMatrixResult,
 type M2BatchMetric,
 type M2BatchProgress,
 type M2SampleSummary,
} from "../simulation/m2BatchMatrix";
import type {
 M2FinalExperimentProgress,
 M2FinalExperimentResult,
} from "../simulation/m2FinalExperiment";
import { PlotlyChart } from "./PlotlyChart";
import { schedulerChartStyle } from "./schedulerChartStyle";
import { M2_SCHEDULERS } from "../m2Schedulers";
import "./M2ExperimentMatrixPanel.css";
type FinalWorkerResponse =
 | { type: "progress"; requestId: number; progress: M2FinalExperimentProgress }
 | { type: "success"; requestId: number; result: M2FinalExperimentResult }
 | { type: "error"; requestId: number; message: string };
type WorkerResponse =
 | { type: "progress"; requestId: number; progress: M2BatchProgress }
 | { type: "success"; requestId: number; result: M2BatchMatrixResult }
 | { type: "error"; requestId: number; message: string };
interface MetricDefinition {
 label: string;
 unit: string;
 ratio?: boolean;
 lowerIsBetter?: boolean;
}
const METRICS: Record<M2BatchMetric, MetricDefinition> = {
 gbrUeMeetingRatio: { label: 'GBR hedefini karşılayan UE oranı', unit: '', ratio: true },
 gbrMeanFulfillmentRatio: { label: 'Ortalama GBR karşılanma oranı', unit: '', ratio: true },
 aggregateGbrServiceRatio: { label: 'Toplam GBR servis oranı', unit: '', ratio: true },
 totalThroughputMbps: { label: "Toplam throughput", unit: "Mbps" },
 jainFairness: { label: "Jain adalet indeksi", unit: "" },
 deliveryRatio: { label: "Paket teslim oranı", unit: "", ratio: true },
 gbrSatisfactionRatio: { label: "GBR karşılama oranı", unit: "", ratio: true },
 worstQosP99Ms: { label: "En kötü 5QI P99", unit: "ms", lowerIsBetter: true },
 queuedPackets: {
   label: "Kuyrukta kalan paket",
   unit: "paket",
   lowerIsBetter: true,
 },
 undeliveredRatio: { label: "Teslim edilemeyen oran", unit: "", ratio: true, lowerIsBetter: true },
 pdbViolationRatio: { label: "PDB ihlal oranı", unit: "", ratio: true, lowerIsBetter: true },
 queuedBytes: { label: "Kuyrukta kalan veri", unit: "byte", lowerIsBetter: true },
 overdueQueuedPackets: { label: "PDB aşmış kuyruk paketi", unit: "paket", lowerIsBetter: true },
 oldestQueuedPacketAgeMs: { label: "En yaşlı kuyruk paketi", unit: "ms", lowerIsBetter: true }, };
const MAX_SEED = 2_147_483_647;
const decimal = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 3 });
const percent = new Intl.NumberFormat("tr-TR", {
 style: "percent",
 maximumFractionDigits: 1,
});
function createRandomSeed(seedCount: number, seedStep: number): number {
 const maximumBase = Math.max(0, MAX_SEED - (seedCount - 1) * seedStep);
 const values = new Uint32Array(1);
 crypto.getRandomValues(values);
 return (values[0] ?? Date.now()) % (maximumBase + 1);
}
function downloadText(filename: string, content: string, type: string): void {
 const url = URL.createObjectURL(new Blob([content], { type }));
 const anchor = document.createElement("a");
 anchor.href = url;
 anchor.download = filename;
 anchor.click();
 URL.revokeObjectURL(url);
}
function formatValue(metric: M2BatchMetric, value: number): string {
 const definition = METRICS[metric];
 if (definition.ratio) return percent.format(value);
 const formatted = decimal.format(value);
 return definition.unit ? `${formatted} ${definition.unit}` : formatted;
}
function formatSummary(
 metric: M2BatchMetric,
 summary: M2SampleSummary | null,
): string {
 if (!summary) return "N/A";
 return `${formatValue(metric, summary.mean)} · %95 GA [${formatValue(metric, summary.confidence95Lower)},${formatValue(metric, summary.confidence95Upper)}]`;
}
interface ThroughputFairnessRow {
 scheduler: string;
 schedulerLabel: string;
 metrics: Record<M2BatchMetric, M2SampleSummary | null>;
}
function schedulerLabelShort(kind: string, fallback: string): string {
 return M2_SCHEDULERS.find((scheduler) => scheduler.kind === kind)?.shortLabel ?? fallback;
}
function schedulerColor(kind: string): string {
 return M2_SCHEDULERS.find((scheduler) => scheduler.kind === kind)?.color ?? '#475569';
}
function throughputFairnessTraces(rows: readonly ThroughputFairnessRow[]): ReadonlyArray<Record<string, unknown>> {
 return rows.flatMap((row) => {
   const fairness = row.metrics.jainFairness;
   const throughput = row.metrics.totalThroughputMbps;
   if (!fairness || !throughput) return [];
   const style = schedulerChartStyle(row.scheduler, schedulerColor(row.scheduler));
   return [{
     type: 'scatter',
     mode: 'markers+text',
     name: row.schedulerLabel,
     x: [fairness.mean],
     y: [throughput.mean],
     text: [schedulerLabelShort(row.scheduler, row.schedulerLabel)],
     textposition: style.textPosition,
     textfont: { color: style.color, size: 11 },
     cliponaxis: false,
     marker: {
       size: style.size,
       color: style.color,
       symbol: style.symbol,
       line: { color: style.color, width: style.symbol.includes('open') ? 3 : 1.5 },
       opacity: 0.97,
     },
     error_x: {
       type: 'data',
       array: [fairness.confidence95HalfWidth],
       visible: true,
       color: style.color,
       thickness: 1.8,
       width: 5,
     },
     error_y: {
       type: 'data',
       array: [throughput.confidence95HalfWidth],
       visible: true,
       color: style.color,
       thickness: 1.8,
       width: 5,
     },
     customdata: [[
       fairness.confidence95Lower,
       fairness.confidence95Upper,
       throughput.confidence95Lower,
       throughput.confidence95Upper,
     ]],
     hovertemplate: '<b>%{fullData.name}</b><br>Jain: %{x:.4f}<br>Jain %95 GA: [%{customdata[0]:.4f}, %{customdata[1]:.4f}]<br>Throughput: %{y:.3f} Mbps<br>Throughput %95 GA: [%{customdata[2]:.3f}, %{customdata[3]:.3f}] Mbps<extra></extra>',
   }];
 });
}
export function M2ExperimentMatrixPanel() {
 const [request, setRequest] = useState<M2BatchMatrixRequest>({
   scenarioId: DEFAULT_M2_EXPERIMENT_SCENARIO_ID,
   loadProfileId: DEFAULT_M2_LOAD_PROFILE_ID,
   durationMs: DEFAULT_M2_MATRIX_SETTINGS.durationMs,
   ueCount: DEFAULT_M2_MATRIX_SETTINGS.ueCount,
   baseSeed: DEFAULT_M2_MATRIX_SETTINGS.baseSeed,
   seedCount: DEFAULT_M2_MATRIX_SETTINGS.seedCount,
   seedStep: DEFAULT_M2_MATRIX_SETTINGS.seedStep,
 });
 const [result, setResult] = useState<M2BatchMatrixResult | null>(null);
 const [progress, setProgress] = useState<M2BatchProgress | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [running, setRunning] = useState(false);
 const [autoSeed, setAutoSeed] = useState(false);
 const [selectedCellId, setSelectedCellId] = useState("");
 const [selectedMetric, setSelectedMetric] = useState<M2BatchMetric>(
   "totalThroughputMbps",
 );
 const workerRef = useRef<Worker | null>(null);
 const requestIdRef = useRef(0);
 const finalWorkerRef = useRef<Worker | null>(null);
 const finalRequestIdRef = useRef(0);
 const [finalResult, setFinalResult] =
   useState<M2FinalExperimentResult | null>(null);
 const [finalProgress, setFinalProgress] =
   useState<M2FinalExperimentProgress | null>(null);
 const [finalError, setFinalError] = useState<string | null>(null);
 const [finalRunning, setFinalRunning] = useState(false);
 const [finalSelectedRunId, setFinalSelectedRunId] = useState("");
 const [finalSelectedCellId, setFinalSelectedCellId] = useState("");
 const [finalSelectedMetric, setFinalSelectedMetric] =
   useState<M2BatchMetric>("worstQosP99Ms");
 useEffect(
   () => () => {
     workerRef.current?.terminate();
     finalWorkerRef.current?.terminate();
   },
   [],
 );
 const selectedScenario = M2_EXPERIMENT_SCENARIOS.find(
   (item) => item.id === request.scenarioId,
 );
 const selectedLoad = M2_LOAD_PROFILES.find(
   (item) => item.id === request.loadProfileId,
 );
 const cellRows = useMemo(
   () =>
     result?.summaryRows.filter((row) => row.cellId === selectedCellId) ?? [],
   [result, selectedCellId],
 );
 const pairwiseRows = useMemo(
   () =>
     result?.pairwiseRows.filter((row) => row.cellId === selectedCellId) ?? [],
   [result, selectedCellId],
 );
 const uniqueCells = useMemo(() => {
   const map = new Map<string, string>();
   result?.summaryRows.forEach((row) => map.set(row.cellId, row.cellLabel));
   return [...map.entries()];
 }, [result]);
 const selectedFinalRun = useMemo(
   () =>
     finalResult?.runs.find(
       (run) => run.definition.id === finalSelectedRunId,
     ) ??
     finalResult?.runs[0] ??
     null,
   [finalResult, finalSelectedRunId],
 );
 const finalUniqueCells = useMemo(() => {
   const map = new Map<string, string>();
   selectedFinalRun?.result.summaryRows.forEach((row) =>
     map.set(row.cellId, row.cellLabel),
   );
   return [...map.entries()];
 }, [selectedFinalRun]);
 const finalCellRows = useMemo(
   () =>
     selectedFinalRun?.result.summaryRows.filter(
       (row) => row.cellId === finalSelectedCellId,
     ) ?? [],
   [selectedFinalRun, finalSelectedCellId],
 );
 const finalMetricRows = finalCellRows.filter(
   (row) => row.metrics[finalSelectedMetric] !== null,
 );
 const finalScatterData = useMemo<ReadonlyArray<Record<string, unknown>>>(
   () => throughputFairnessTraces(finalCellRows),
   [finalCellRows],
 );
 const finalScatterLayout = useMemo<Record<string, unknown>>(
   () => ({
     title: {
       text: `${selectedFinalRun?.definition.label ?? "Final M2"} · Throughput–Fairness`,
       font: { size: 16 },
     },
     xaxis: {
       title: "Jain adalet indeksi",
       range: [0, 1.02],
       gridcolor: "#e5e7eb",
     },
     yaxis: {
       title: "Toplam throughput (Mbps)",
       rangemode: "tozero",
       gridcolor: "#e5e7eb",
     },
     margin: { l: 70, r: 30, t: 60, b: 60 },
     paper_bgcolor: "#ffffff",
     plot_bgcolor: "#ffffff",
     font: { color: "#344054" },
     showlegend: true,
     legend: { orientation: "h", y: 1.13 },
     hovermode: "closest",
     autosize: true,
   }),
   [selectedFinalRun],
 );
 const finalMetricData = useMemo<ReadonlyArray<Record<string, unknown>>>(
   () => [
     {
       type: "bar",
       x: finalMetricRows.map((row) => row.schedulerLabel),
       y: finalMetricRows.map(
         (row) => row.metrics[finalSelectedMetric]?.mean ?? 0,
       ),
       marker: { color: finalMetricRows.map((row) => schedulerColor(row.scheduler)) },
       error_y: {
         type: "data",
         array: finalMetricRows.map(
           (row) =>
             row.metrics[finalSelectedMetric]?.confidence95HalfWidth ?? 0,
         ),
         visible: true,
       },
       hovertemplate: `%{x}<br>${METRICS[finalSelectedMetric].label}=%{y:.4f}${METRICS[finalSelectedMetric].unit ?' ' + METRICS[finalSelectedMetric].unit : ''}<extra></extra>`,
     },
   ],
   [finalMetricRows, finalSelectedMetric],
 );
 const finalMetricLayout = useMemo<Record<string, unknown>>(
   () => ({
     title: {
       text: `${METRICS[finalSelectedMetric].label} · Ortalama ve %95 GA`,
       font: { size: 16 },
     },
     xaxis: { title: "Scheduler", gridcolor: "#e5e7eb" },
     yaxis: {
       title: METRICS[finalSelectedMetric].unit
         ? `${METRICS[finalSelectedMetric].label} (${METRICS[finalSelectedMetric].unit})`
         : METRICS[finalSelectedMetric].label,
       rangemode: "tozero",
       gridcolor: "#e5e7eb",
       tickformat: METRICS[finalSelectedMetric].ratio ? ".0%" : undefined,
     },
     margin: { l: 75, r: 30, t: 60, b: 90 },
     paper_bgcolor: "#ffffff",
     plot_bgcolor: "#ffffff",
     font: { color: "#344054" },
     showlegend: false,
     autosize: true,
   }),
   [finalSelectedMetric],
 );
 const scatterData = useMemo<ReadonlyArray<Record<string, unknown>>>(
   () => throughputFairnessTraces(cellRows),
   [cellRows],
 );
 const scatterLayout = useMemo<Record<string, unknown>>(
   () => ({
     title: {
       text: "Throughput–Fairness · Ortalama ve %95 GA",
       font: { size: 16 },
     },
     xaxis: {
       title: "Jain adalet indeksi",
       range: [0, 1.02],
       gridcolor: "#e5e7eb",
     },
     yaxis: {
       title: "Toplam throughput (Mbps)",
       rangemode: "tozero",
       gridcolor: "#e5e7eb",
     },
     margin: { l: 70, r: 30, t: 55, b: 60 },
     paper_bgcolor: "#ffffff",
     plot_bgcolor: "#ffffff",
     font: { color: "#344054" },
     showlegend: true,
     legend: { orientation: "h", y: 1.13 },
     hovermode: "closest",
     autosize: true,
   }),
   [],
 );
 const metricRows = cellRows.filter(
   (row) => row.metrics[selectedMetric] !== null,
 );
 const metricData = useMemo<ReadonlyArray<Record<string, unknown>>>(
   () => [
     {
       type: "bar",
       x: metricRows.map((row) => row.schedulerLabel),
       y: metricRows.map((row) => row.metrics[selectedMetric]?.mean ?? 0),
       marker: { color: metricRows.map((row) => schedulerColor(row.scheduler)) },
       error_y: {
         type: "data",
         array: metricRows.map(
           (row) => row.metrics[selectedMetric]?.confidence95HalfWidth ?? 0,
         ),
         visible: true,
       },
       hovertemplate: `%{x}<br>${METRICS[selectedMetric].label}=%{y:.4f}${METRICS[selectedMetric].unit ? ' ' +METRICS[selectedMetric].unit : ''}<extra></extra>`,
     },
   ],
   [metricRows, selectedMetric],
 );
 const metricLayout = useMemo<Record<string, unknown>>(
   () => ({
     title: {
       text: `${METRICS[selectedMetric].label} · Ortalama ve %95 GA`,
       font: { size: 16 },
     },
     xaxis: { title: "Scheduler", gridcolor: "#e5e7eb" },
     yaxis: {
       title: METRICS[selectedMetric].unit
         ? `${METRICS[selectedMetric].label} (${METRICS[selectedMetric].unit})`
         : METRICS[selectedMetric].label,
       rangemode: "tozero",
       gridcolor: "#e5e7eb",
       tickformat: METRICS[selectedMetric].ratio ? ".0%" : undefined,
     },
     margin: { l: 75, r: 30, t: 55, b: 90 },
     paper_bgcolor: "#ffffff",
     plot_bgcolor: "#ffffff",
     font: { color: "#344054" },
     showlegend: false,
     autosize: true,
   }),
   [selectedMetric],
 );
 const runFinalExperiment = () => {
   finalWorkerRef.current?.terminate();
   workerRef.current?.terminate();
   const worker = new Worker(
     new URL("../workers/m2FinalExperiment.worker.ts", import.meta.url),
     { type: "module" },
   );
   finalWorkerRef.current = worker;
   const requestId = finalRequestIdRef.current + 1;
   finalRequestIdRef.current = requestId;
   setFinalRunning(true);
   setFinalError(null);
   setFinalProgress(null);
   worker.onmessage = (event: MessageEvent<FinalWorkerResponse>) => {
     const message = event.data;
     if (message.requestId !== requestId) return;
     if (message.type === "progress") {
       setFinalProgress(message.progress);
       return;
     }
     setFinalRunning(false);
     worker.terminate();
     finalWorkerRef.current = null;
     if (message.type === "error") {
       setFinalError(message.message);
       return;
     }
     setFinalResult(message.result);
     const firstRun = message.result.runs[0];
     setFinalSelectedRunId(firstRun?.definition.id ?? "");
     setFinalSelectedCellId(firstRun?.result.summaryRows[0]?.cellId ?? "");
   };
   worker.onerror = (event) => {
     setFinalRunning(false);
     setFinalError(
       event.message || "Final M2 deney worker işlemi başarısız oldu.",
     );
     worker.terminate();
     finalWorkerRef.current = null;
   };
   worker.postMessage({ requestId });
 };
 const runMatrix = () => {
   const activeRequest = autoSeed
     ? {
         ...request,
         baseSeed: createRandomSeed(request.seedCount, request.seedStep),
       }
     : request;
   if (autoSeed) setRequest(activeRequest);
   workerRef.current?.terminate();
   const worker = new Worker(
     new URL("../workers/m2Matrix.worker.ts", import.meta.url),
     { type: "module" },
   );
   workerRef.current = worker;
   const requestId = requestIdRef.current + 1;
   requestIdRef.current = requestId;
   setRunning(true);
   setError(null);
   setProgress(null);
   worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
     const message = event.data;
     if (message.requestId !== requestId) return;
     if (message.type === "progress") {
       setProgress(message.progress);
       return;
     }
     setRunning(false);
     worker.terminate();
     workerRef.current = null;
     if (message.type === "error") {
       setError(message.message);
       return;
     }
     setResult(message.result);
     setSelectedCellId(message.result.summaryRows[0]?.cellId ?? "");
   };
   worker.onerror = (event) => {
     setRunning(false);
     setError(event.message || "M2 çoklu-seed worker işlemi başarısız oldu.");
     worker.terminate();
     workerRef.current = null;
   };
   worker.postMessage({ requestId, request: activeRequest });
 };
 return (
   <section className="m2-matrix-panel" id="m2-experiment-matrix">
     <header className="m2-matrix-heading">
       <div>
         <span className="m2-matrix-eyebrow">M2 bilimsel deney katmanı</span>
         <h2>SC-1 / SC-2 · Yük Seviyesi · Çoklu-Seed</h2>
         <p>
           Beş hücre ve tüm M2 scheduler’ları ortak seed listesi, ortak SINR
           popülasyonu, ortak trafik ve eşit duvar-saati süresiyle
           karşılaştırılır.
         </p>
       </div>
     </header>
     <article className="m2-final-preset">
       <div className="m2-final-preset-heading">
         <div>
           <span className="m2-final-badge">Ana doküman teslim koşusu</span>
           <h3>{FINAL_M2_EXPERIMENT_PRESET.label}</h3>
           <p>{FINAL_M2_EXPERIMENT_PRESET.description}</p>
         </div>
         <button
           type="button"
           disabled={running || finalRunning}
           onClick={runFinalExperiment}
         >
           {finalRunning
             ? "Final deney çalışıyor…"
             : "Final M2 deneyini çalıştır"}
         </button>
       </div>
       <div className="m2-final-specs">
         <span>
           <b>Senaryolar</b> SC-1 + SC-2
         </span>
         <span>
           <b>Yük</b> Orta · 1×
         </span>
         <span>
           <b>Seed</b> {FINAL_M2_EXPERIMENT_PRESET.seedCount} adet ·{" "}
           {FINAL_M2_EXPERIMENT_PRESET.baseSeed} başlangıç
         </span>
         <span>
           <b>Süre</b> {FINAL_M2_EXPERIMENT_PRESET.durationMs} ms
         </span>
         <span>
           <b>UE</b> {FINAL_M2_EXPERIMENT_PRESET.ueCount}
         </span>
         <span>
           <b>Koşu</b> {FINAL_M2_EXPERIMENT_PRESET.runs.length} senaryo × 5
           hücre × tüm scheduler’lar × {FINAL_M2_EXPERIMENT_PRESET.seedCount}{" "}
           seed
         </span>
       </div>
       {finalRunning && finalProgress && (
         <div className="m2-matrix-progress">
           <div>
             <i
               style={{
                 width: `${(finalProgress.completedRuns / finalProgress.totalRuns) * 100}%`,
               }}
             />
           </div>
           <span>
             {finalProgress.completedRuns}/{finalProgress.totalRuns} · Aşama{" "}
             {finalProgress.stageIndex}/{finalProgress.stageCount}:{" "}
             {finalProgress.stageLabel} · Seed{" "}
             {finalProgress.batchProgress.seedIndex}/
             {finalProgress.batchProgress.seedCount} ·{" "}
             {finalProgress.batchProgress.cellLabel} ·{" "}
             {finalProgress.batchProgress.schedulerLabel}
           </span>
         </div>
       )}
       {finalError && <p className="m2-matrix-error">{finalError}</p>}
       {finalResult && (
         <>
           <div
             className="m2-final-integrity"
             aria-label="Final deney bütünlük kontrolleri"
           >
             {Object.entries(finalResult.integrity).map(([key, passed]) => (
               <span key={key} className={passed ? "is-pass" : "is-fail"}>
                 {passed ? "✓" : "✕"} {key}
               </span>
             ))}
           </div>
           <div className="m2-matrix-actions">
             <div>
               <b>{finalResult.preset.label}</b>
               <span>
                 {finalResult.totalRuns} toplam simülasyon koşusu ·{" "}
                 {finalResult.runs[0]?.result.seeds.join(", ")}
               </span>
             </div>
             <button
               type="button"
               onClick={() =>
                 downloadText(
                   "m2-final-manifest.csv",
                   createM2FinalManifestCsv(finalResult),
                   "text/csv;charset=utf-8",
                 )
               }
             >
               Manifest CSV
             </button>
             <button
               type="button"
               onClick={() =>
                 downloadText(
                   "m2-final-summary.csv",
                   createM2FinalSummaryCsv(finalResult),
                   "text/csv;charset=utf-8",
                 )
               }
             >
               Final Özet CSV
             </button>
             <button
               type="button"
               onClick={() =>
                 downloadText(
                   "m2-final-pairwise.csv",
                   createM2FinalPairwiseCsv(finalResult),
                   "text/csv;charset=utf-8",
                 )
               }
             >
               Final Pairwise CSV
             </button>
             <button
               type="button"
               onClick={() =>
                 downloadText(
                   "m2-final-complete.json",
                   createM2FinalJson(finalResult),
                   "application/json;charset=utf-8",
                 )
               }
             >
               Final Tam JSON
             </button>
           </div>
           <div className="m2-matrix-chart-controls">
             <label>
               Final senaryo
               <select
                 value={selectedFinalRun?.definition.id ?? ""}
                 onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                   const nextRunId = event.target.value;
                   setFinalSelectedRunId(nextRunId);
                   const nextRun = finalResult.runs.find(
                     (run) => run.definition.id === nextRunId,
                   );
                   setFinalSelectedCellId(
                     nextRun?.result.summaryRows[0]?.cellId ?? "",
                   );
                 }}
               >
                 {finalResult.runs.map((run) => (
                   <option key={run.definition.id} value={run.definition.id}>
                     {run.definition.label}
                   </option>
                 ))}
               </select>
             </label>
             <label>
               Final hücre
               <select
                 value={finalSelectedCellId}
                 onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                   setFinalSelectedCellId(event.target.value)
                 }
               >
                 {finalUniqueCells.map(([id, label]) => (
                   <option key={id} value={id}>
                     {label}
                   </option>
                 ))}
               </select>
             </label>
             <label>
               QoS metriği
               <select
                 value={finalSelectedMetric}
                 onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                   setFinalSelectedMetric(event.target.value as M2BatchMetric)
                 }
               >
                 {Object.entries(METRICS).map(([key, definition]) => (
                   <option key={key} value={key}>
                     {definition.label}
                   </option>
                 ))}
               </select>
             </label>
           </div>
           <div className="m2-matrix-chart-grid">
             <article className="m2-matrix-chart-card">
               <PlotlyChart
                 data={finalScatterData}
                 layout={finalScatterLayout}
                 ariaLabel="Final M2 throughput fairness grafiği"
               />
             </article>
             <article className="m2-matrix-chart-card">
               <PlotlyChart
                 data={finalMetricData}
                 layout={finalMetricLayout}
                 ariaLabel="Final M2 QoS metriği grafiği"
               />
             </article>
           </div>
           <div className="m2-matrix-table-wrap">
             <table>
               <thead>
                 <tr>
                   <th>Senaryo</th>
                   <th>Hücre</th>
                   <th>Scheduler</th>
                   <th>Throughput ort. ± %95 GA</th>
                   <th>Jain ort. ± %95 GA</th>
                   <th>Teslim ort. ± %95 GA</th>
                   <th>GBR ort. ± %95 GA</th>
                   <th>P99 ort. ± %95 GA</th>
                   <th>Kuyruk ort. ± %95 GA</th>
                 </tr>
               </thead>
               <tbody>
                 {finalResult.runs.flatMap((run) =>
                   run.result.summaryRows.map((row) => (
                     <tr
                       key={`${run.definition.id}-${row.cellId}-${row.scheduler}`}
                     >
                       <td>{run.definition.label}</td>
                       <td>
                         <b>{row.cellLabel}</b>
                         <small>
                           {row.resourceBlocks} RB · {row.slotDurationMs} ms
                         </small>
                       </td>
                       <td>{row.schedulerLabel}</td>
                       <td>
                         {formatSummary(
                           "totalThroughputMbps",
                           row.metrics.totalThroughputMbps,
                         )}
                       </td>
                       <td>
                         {formatSummary(
                           "jainFairness",
                           row.metrics.jainFairness,
                         )}
                       </td>
                       <td>
                         {formatSummary(
                           "deliveryRatio",
                           row.metrics.deliveryRatio,
                         )}
                       </td>
                       <td>
                         {formatSummary(
                           "gbrSatisfactionRatio",
                           row.metrics.gbrSatisfactionRatio,
                         )}
                       </td>
                       <td>
                         {formatSummary(
                           "worstQosP99Ms",
                           row.metrics.worstQosP99Ms,
                         )}
                       </td>
                       <td>
                         {formatSummary(
                           "queuedPackets",
                           row.metrics.queuedPackets,
                         )}
                       </td>
                     </tr>
                   )),
                 )}
               </tbody>
             </table>
           </div>
           <p className="m2-matrix-footnote">
             Bu preset ana dokümandaki iki senaryoyu orta yükte, aynı{" "}
             {FINAL_M2_EXPERIMENT_PRESET.seedCount} seed listesiyle ve beş
             hücrede çalıştırır. Plotly mod çubuğundaki kamera düğmesi rapora
             hazır PNG üretir.
           </p>
         </>
       )}
     </article>
     <h3 className="m2-matrix-subheading">Esnek M2 deneyleri</h3>
     <p className="m2-matrix-footnote">
       Aşağıdaki kontroller, final preset dışında senaryo, yük, süre, UE ve
       seed ayarlarını değiştirerek ek deney yapman içindir.
     </p>
     <div className="m2-matrix-controls">
       <label>
         Senaryo
         <select
           value={request.scenarioId}
           disabled={running || finalRunning}
           onChange={(event: ChangeEvent<HTMLSelectElement>) =>
             setRequest({ ...request, scenarioId: event.target.value })
           }
         >
           {M2_EXPERIMENT_SCENARIOS.map((item) => (
             <option key={item.id} value={item.id}>
               {item.label}
             </option>
           ))}
         </select>
       </label>
       <label>
         Yük seviyesi
         <select
           value={request.loadProfileId}
           disabled={running || finalRunning}
           onChange={(event: ChangeEvent<HTMLSelectElement>) =>
             setRequest({ ...request, loadProfileId: event.target.value })
           }
         >
           {M2_LOAD_PROFILES.map((item) => (
             <option key={item.id} value={item.id}>
               {item.label} · {item.shortLabel}
             </option>
           ))}
         </select>
       </label>
       <label>
         Süre (ms)
         <input
           type="number"
           min="10"
           max="60000"
           step="10"
           value={request.durationMs}
           disabled={running || finalRunning}
           onChange={(event: ChangeEvent<HTMLInputElement>) =>
             setRequest({ ...request, durationMs: Number(event.target.value) })
           }
         />
       </label>
       <label>
         UE sayısı
         <input
           type="number"
           min="1"
           max="500"
           step="1"
           value={request.ueCount}
           disabled={running || finalRunning}
           onChange={(event: ChangeEvent<HTMLInputElement>) =>
             setRequest({ ...request, ueCount: Number(event.target.value) })
           }
         />
       </label>
       <label>
         Seed sayısı
         <input
           type="number"
           min="2"
           max="50"
           step="1"
           value={request.seedCount}
           disabled={running || finalRunning}
           onChange={(event: ChangeEvent<HTMLInputElement>) =>
             setRequest({ ...request, seedCount: Number(event.target.value) })
           }
         />
       </label>
       <label>
         Seed adımı
         <input
           type="number"
           min="1"
           max="1000000"
           step="1"
           value={request.seedStep}
           disabled={running || finalRunning}
           onChange={(event: ChangeEvent<HTMLInputElement>) =>
             setRequest({ ...request, seedStep: Number(event.target.value) })
           }
         />
       </label>
       <div className="m2-matrix-seed-block">
         <div className="m2-matrix-seed-control">
           <label>
             Temel seed
             <input
               type="number"
               min="0"
               max={MAX_SEED}
               step="1"
               value={request.baseSeed}
               disabled={running || finalRunning}
               onChange={(event: ChangeEvent<HTMLInputElement>) => {
                 setAutoSeed(false);
                 setRequest({
                   ...request,
                   baseSeed: Number(event.target.value),
                 });
               }}
             />
           </label>
           <button
             className="m2-matrix-secondary-button"
             type="button"
             disabled={running || finalRunning}
             onClick={() => {
               setAutoSeed(false);
               setRequest({
                 ...request,
                 baseSeed: createRandomSeed(
                   request.seedCount,
                   request.seedStep,
                 ),
               });
             }}
           >
             Yeni temel seed
           </button>
         </div>
         <label className="m2-matrix-checkbox">
           <input
             type="checkbox"
             checked={autoSeed}
             disabled={running || finalRunning}
             onChange={(event: ChangeEvent<HTMLInputElement>) =>
               setAutoSeed(event.target.checked)
             }
           />{" "}
           Her batch koşusunda yenile
         </label>
       </div>
       <button
         className="m2-matrix-run-button"
         type="button"
         disabled={running || finalRunning}
         onClick={runMatrix}
       >
         {running ? "Çoklu-seed çalışıyor…" : "Bilimsel M2 deneyini çalıştır"}
       </button>
     </div>
     <div className="m2-matrix-notes">
       {selectedScenario && (
         <p>
           <b>{selectedScenario.shortLabel}:</b> {selectedScenario.description}
         </p>
       )}
       {selectedLoad && (
         <p>
           <b>{selectedLoad.label}:</b> {selectedLoad.description}
         </p>
       )}
       <p>
         <b>Seed listesi:</b> temel seed + k × seed adımı. Aynı k için bütün
         scheduler’lar aynı SINR ve trafik gerçekleşmesini kullanır.
       </p>
     </div>
     {running && progress && (
       <div className="m2-matrix-progress">
         <div>
           <i
             style={{
               width: `${(progress.completedRuns / progress.totalRuns) * 100}%`,
             }}
           />
         </div>
         <span>
           {progress.completedRuns}/{progress.totalRuns} · Seed{" "}
           {progress.seedIndex}/{progress.seedCount}: {progress.baseSeed} ·{" "}
           {progress.cellLabel} · {progress.schedulerLabel}
         </span>
       </div>
     )}
     {error && <p className="m2-matrix-error">{error}</p>}
     {result && (
       <>
         <div className="m2-matrix-actions">
           <div>
             <b>
               {result.scenarioLabel} · {result.loadProfileLabel}
             </b>
             <span>
               {result.seedCount} seed × {result.cellCount} hücre ×{" "}
               {result.schedulerCount} scheduler = {result.totalRuns} koşu
             </span>
             <code>{result.seeds.join(", ")}</code>
           </div>
           <button
             type="button"
             onClick={() =>
               downloadText(
                 `m2-summary-${result.scenarioId}-${result.loadProfileId}.csv`,
                 createM2BatchSummaryCsv(result),
                 "text/csv;charset=utf-8",
               )
             }
           >
             Özet CSV
           </button>
           <button
             type="button"
             onClick={() =>
               downloadText(
                 `m2-pairwise-${result.scenarioId}-${result.loadProfileId}.csv`,
                 createM2BatchPairwiseCsv(result),
                 "text/csv;charset=utf-8",
               )
             }
           >
             Eşleştirilmiş fark CSV
           </button>
           <button
             type="button"
             onClick={() =>
               downloadText(
                 `m2-batch-${result.scenarioId}-${result.loadProfileId}.json`,
                 createM2BatchJson(result),
                 "application/json;charset=utf-8",
               )
             }
           >
             Tam JSON
           </button>
         </div>
         <div className="m2-matrix-chart-controls">
           <label>
             Gösterilen hücre
             <select
               value={selectedCellId}
               onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                 setSelectedCellId(event.target.value)
               }
             >
               {uniqueCells.map(([id, label]) => (
                 <option key={id} value={id}>
                   {label}
                 </option>
               ))}
             </select>
           </label>
           <label>
             İkinci grafik metriği
             <select
               value={selectedMetric}
               onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                 setSelectedMetric(event.target.value as M2BatchMetric)
               }
             >
               {Object.entries(METRICS).map(([key, definition]) => (
                 <option key={key} value={key}>
                   {definition.label}
                 </option>
               ))}
             </select>
           </label>
         </div>
         <div className="m2-matrix-chart-grid">
           <article className="m2-matrix-chart-card">
             <PlotlyChart
               data={scatterData}
               layout={scatterLayout}
               ariaLabel="Throughput fairness çoklu seed grafiği"
             />
           </article>
           <article className="m2-matrix-chart-card">
             <PlotlyChart
               data={metricData}
               layout={metricLayout}
               ariaLabel={`${METRICS[selectedMetric].label} çoklu seed grafiği`}
             />
           </article>
         </div>
         <div className="m2-matrix-table-wrap">
           <table>
             <thead>
               <tr>
                 <th>Hücre</th>
                 <th>Scheduler</th>
                 <th>Throughput ort. ± %95 GA</th>
                 <th>Jain ort. ± %95 GA</th>
                 <th>Teslim ort. ± %95 GA</th>
                 <th>GBR ort. ± %95 GA</th>
                 <th>P99 ort. ± %95 GA</th>
                 <th>Kuyruk ort. ± %95 GA</th>
               </tr>
             </thead>
             <tbody>
               {result.summaryRows.map((row) => (
                 <tr key={`${row.cellId}-${row.scheduler}`}>
                   <td>
                     <b>{row.cellLabel}</b>
                     <small>
                       {row.resourceBlocks} RB · {row.slotDurationMs} ms
                     </small>
                   </td>
                   <td>{row.schedulerLabel}</td>
                   <td>
                     {formatSummary(
                       "totalThroughputMbps",
                       row.metrics.totalThroughputMbps,
                     )}
                   </td>
                   <td>
                     {formatSummary("jainFairness", row.metrics.jainFairness)}
                   </td>
                   <td>
                     {formatSummary(
                       "deliveryRatio",
                       row.metrics.deliveryRatio,
                     )}
                   </td>
                   <td>
                     {formatSummary(
                       "gbrSatisfactionRatio",
                       row.metrics.gbrSatisfactionRatio,
                     )}
                   </td>
                   <td>
                     {formatSummary(
                       "worstQosP99Ms",
                       row.metrics.worstQosP99Ms,
                     )}
                   </td>
                   <td>
                     {formatSummary(
                       "queuedPackets",
                       row.metrics.queuedPackets,
                     )}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
         <h3 className="m2-matrix-subheading">
           Eşleştirilmiş scheduler farkları · {METRICS[selectedMetric].label}
         </h3>
         <p className="m2-matrix-footnote">
           Fark A − B olarak hesaplanır ve her seed yalnız aynı seed’deki
           karşılığıyla eşleştirilir.{" "}
           {METRICS[selectedMetric].lowerIsBetter
             ? "Bu metrikte negatif fark A lehinedir."
             : "Bu metrikte pozitif fark A lehinedir."}
         </p>
         <div className="m2-matrix-table-wrap">
           <table className="m2-pairwise-table">
             <thead>
               <tr>
                 <th>Scheduler A</th>
                 <th>Scheduler B</th>
                 <th>Ortalama fark</th>
                 <th>Standart sapma</th>
                 <th>%95 GA</th>
                 <th>n</th>
               </tr>
             </thead>
             <tbody>
               {pairwiseRows.map((row) => {
                 const summary = row.metrics[selectedMetric];
                 return (
                   <tr
                     key={`${row.cellId}-${row.schedulerA}-${row.schedulerB}`}
                   >
                     <td>{row.schedulerALabel}</td>
                     <td>{row.schedulerBLabel}</td>
                     <td>
                       {summary
                         ? formatValue(selectedMetric, summary.mean)
                         : "N/A"}
                     </td>
                     <td>
                       {summary
                         ? formatValue(
                             selectedMetric,
                             summary.standardDeviation,
                           )
                         : "N/A"}
                     </td>
                     <td>
                       {summary
                         ? `[${formatValue(selectedMetric, summary.confidence95Lower)}, ${formatValue(selectedMetric,summary.confidence95Upper)}]`
                         : "N/A"}
                     </td>
                     <td>{summary?.sampleSize ?? 0}</td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
         </div>
         <p className="m2-matrix-footnote">
           P50/P95/P99 yalnız teslim edilen paketlerin gelişten hizmet
           tamamlanmasına kadar geçen gecikmesine dayanır. Final rapor
           koşularında en az 20 seed kullanılması önerilir; kısa kontroller
           için daha düşük seed sayısı seçilebilir.
         </p>
       </>
     )}
   </section>
 );
}
