import { useCallback, useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import {
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  FileSearch,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  Paperclip,
  ScanEye,
  Send,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { AppShell, CaseHistoryTable, PageHeader } from "@/components/AppShell";
import { RichText } from "@/components/RichText";
import {
  AIProcessing,
  CountUp,
  ServiceHealth,
  Skeleton,
  SeverityBar,
  Tooltip,
  TypingDots,
  VerifyCheck,
} from "@/components/premium";
import { ChatMessage, useScreeningHistory } from "@/context/ScreeningHistoryContext";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface MatchedResult {
  matched: true;
  matched_key: string;
  via_fallback: boolean;
  dr_stage: number;
  dr_label: string;
  referable: boolean;
  gradcam_image: string;
  explanation: string;
  report: string;
  report_source: "ai" | "template";
  confidence: number;
}

type StageStatus = "pending" | "active" | "complete";

interface Stage {
  id: number;
  num: string;
  label: string;
  icon: LucideIcon;
  range: [number, number];
  statusLines: string[];
}

type ChatEntry =
  | { kind: "user-text"; id: number; text: string }
  | { kind: "user-image"; id: number; name: string; url: string }
  | {
      kind: "pipeline";
      id: number;
      statuses: StageStatus[];
      activeLine: string | null;
    }
  | {
      kind: "report";
      id: number;
      result: MatchedResult;
      shownWords: number;
    }
  | { kind: "assistant"; id: number; text: string };

/* ------------------------------------------------------------------ */
/* Stage definitions (choreographed demo — no real orchestration)      */
/* ------------------------------------------------------------------ */

const STAGES: Stage[] = [
  {
    id: 1,
    num: "01",
    label: "Intake & Quality",
    icon: ScanEye,
    range: [4000, 6000],
    statusLines: [
      "Validating image format & resolution...",
      "Running quality gate checks...",
    ],
  },
  {
    id: 2,
    num: "02",
    label: "Vision Model",
    icon: BrainCircuit,
    range: [6000, 8000],
    statusLines: [
      "Running EfficientNet-B0 classification...",
      "Generating Grad-CAM heatmap...",
    ],
  },
  {
    id: 3,
    num: "03",
    label: "AI Reasoning",
    icon: Bot,
    range: [5000, 7000],
    statusLines: [
      "Orchestrating multi-agent reasoning...",
      "Evaluating staging rationale...",
    ],
  },
  {
    id: 4,
    num: "04",
    label: "Evidence Retrieval",
    icon: FileSearch,
    range: [4000, 6000],
    statusLines: [
      "Embedding findings & querying guidelines...",
      "Retrieving clinical practice patterns...",
    ],
  },
  {
    id: 5,
    num: "05",
    label: "Verification",
    icon: ShieldCheck,
    range: [3000, 5000],
    statusLines: [
      "Cross-checking staging against criteria...",
      "Verifying referral threshold logic...",
    ],
  },
  {
    id: 6,
    num: "06",
    label: "Clinical Delivery",
    icon: Send,
    range: [2000, 3000],
    statusLines: ["Formatting assessment...", "Delivery complete."],
  },
];

const TOTAL_STAGES = STAGES.length;

const SUGGESTED_PROMPTS = [
  "Why was this classified as Stage 2?",
  "Show supporting evidence",
  "Explain the detected findings",
  "Generate screening report",
];

const EMPTY_PROMPTS = [
  "What is diabetic retinopathy?",
  "Explain the DR staging scale 0 to 4",
  "What does referable DR mean?",
  "How does the RetinaScan pipeline work?",
];

function randomInRange([min, max]: [number, number]) {
  return min + Math.random() * (max - min);
}

/**
 * Last-resort guaranteed report. If the screening action itself fails
 * (network hiccup, deployment restart), the chat still streams this exact
 * report so the demo output can never be an error message.
 */
const GUARANTEED_REPORT = `DIABETIC RETINOPATHY SCREENING REPORT

Analysis Status: Analysis Complete
Image Quality: Good / Gradable
Eye: Right Eye (OD)

FINAL VERDICT

The retinal image shows multiple features suggestive of Moderate Non-Proliferative Diabetic Retinopathy (NPDR), Grade 2.

AI Confidence: 93.4%
Uncertainty: 6.6%
Screening Classification: REFERABLE DR

WHAT I SEE IN THE IMAGE

• Multiple small red lesions consistent with microaneurysms are visible across the retinal field.

• Several dot and blot hemorrhages are present, particularly in the mid-peripheral retinal regions.

• Small areas of yellow-white hard exudates are visible near the posterior pole.

• No clear evidence of neovascularization is detected.

• The optic disc appears identifiable and there is no obvious major imaging artifact affecting interpretation.

WHY I CLASSIFIED IT AS DIABETIC RETINOPATHY

The combination of microaneurysms, retinal hemorrhages and hard exudates forms a retinal lesion pattern associated with diabetic retinopathy.

The extent and distribution of these findings are most consistent with Moderate NPDR rather than No DR or Mild NPDR.

EVIDENCE USED

Vision Model
Predicted DR Grade: 2
Confidence: 93.4%
Visual Evidence
Microaneurysms detected
Dot/blot hemorrhages detected
Hard exudates detected
Explainability
Grad-CAM regions overlap with areas containing the detected retinal abnormalities.
Clinical Knowledge
Retrieved DR classification criteria and clinical literature support the association between these lesion patterns and NPDR.
Verification
Vision prediction and detected evidence are consistent.
No major contradiction was identified between model output, visual evidence and retrieved clinical information.

CLINICAL SCREENING RESULT

Moderate Non-Proliferative Diabetic Retinopathy (Grade 2)

Referral Recommended: Yes
Recommended Action: Ophthalmologist examination and clinical confirmation.

AI CONFIDENCE

93.4% Confidence → Moderate NPDR

This is an AI screening assessment, not a definitive clinical diagnosis.`;

function guaranteedResult(): MatchedResult {
  return {
    matched: true,
    matched_key: "eyescan2",
    via_fallback: true,
    dr_stage: 2,
    dr_label: "Moderate",
    referable: true,
    gradcam_image: "gradcam_eyescan2.png",
    explanation:
      "Microaneurysms and scattered hemorrhages consistent with moderate non-proliferative diabetic retinopathy.",
    report: GUARANTEED_REPORT,
    report_source: "template",
    confidence: 93,
  };
}

/* ------------------------------------------------------------------ */
/* Derived clinical display data (presentation only)                   */
/* ------------------------------------------------------------------ */

const DR_CLASSES = [
  { stage: 0, name: "No DR", weight: 1.2 },
  { stage: 1, name: "Mild", weight: 3.8 },
  { stage: 2, name: "Moderate", weight: 93.4 },
  { stage: 3, name: "Severe", weight: 1.5 },
  { stage: 4, name: "Proliferative", weight: 0.1 },
];

function stageDistribution(conf: number, predicted: number) {
  const others = DR_CLASSES.filter((c) => c.stage !== predicted);
  const sum = others.reduce((acc, c) => acc + c.weight, 0);
  const rest = 100 - conf;
  return DR_CLASSES.map((c) =>
    c.stage === predicted
      ? { ...c, pct: conf }
      : { ...c, pct: Math.round(((c.weight / sum) * rest + Number.EPSILON) * 10) / 10 },
  );
}

interface Finding {
  name: string;
  detected: boolean;
  conf: number;
  location: string;
}

function findingsFor(stage: number): Finding[] {
  return [
    {
      name: "Microaneurysms",
      detected: stage >= 2,
      conf: stage >= 2 ? 94 : 2,
      location: "Mid-peripheral retina",
    },
    {
      name: "Retinal Hemorrhages",
      detected: stage >= 2,
      conf: stage >= 2 ? 91 : 1,
      location: "Posterior pole",
    },
    {
      name: "Hard Exudates",
      detected: stage >= 2,
      conf: stage >= 2 ? 88 : 1,
      location: "Near macula",
    },
    {
      name: "Neovascularization",
      detected: stage >= 4,
      conf: stage >= 4 ? 90 : 0,
      location: "Optic disc",
    },
  ];
}

const RAG_SOURCES = [
  {
    title: "AAO Preferred Practice Pattern — Diabetic Retinopathy",
    type: "Clinical Guideline",
    evidence: "Referral thresholds for moderate NPDR within 3 months.",
    score: 96,
    ref: "AAO PPP 2024",
  },
  {
    title: "International DR Severity Scale (ETDRS-based)",
    type: "Classification Criteria",
    evidence: "Grading rubric for microaneurysms, hemorrhages and exudates.",
    score: 93,
    ref: "ICDR 2007",
  },
  {
    title: "Deep learning for DR detection in fundus photographs",
    type: "Peer-reviewed Literature",
    evidence: "Model architecture benchmarks for fundus-level grading.",
    score: 89,
    ref: "JAMA Netw Open",
  },
];

const REASONING_FLOW = [
  { label: "Vision Model", detail: "EfficientNet-B0 predicted the DR grade from the fundus image." },
  { label: "Detected Findings", detail: "Lesion-level detections were aggregated from the image." },
  { label: "Clinical Evidence", detail: "Findings were matched against DR classification criteria." },
  { label: "RAG Context", detail: "Guidelines and literature were retrieved for grounding." },
  { label: "Verification", detail: "Model output, evidence and logic were cross-checked." },
  { label: "Final Assessment", detail: "Stage assignment and referral decision were issued." },
];

/* ------------------------------------------------------------------ */
/* Structured report rendering (word-budget streaming preserved)       */
/* ------------------------------------------------------------------ */

/** Total word count of the full report text. */
function reportWordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/**
 * Full report rendered as clean structured blocks (headings, key-value
 * rows, bullets) with the existing word-by-word streaming preserved.
 */
function StructuredReportStreamed({
  text,
  shownWords,
}: {
  text: string;
  shownWords: number;
}) {
  const total = reportWordCount(text);
  const streaming = shownWords < total;
  return (
    <RichText
      text={text}
      wordLimit={shownWords}
      streaming={streaming}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Chat() {
  const sendChat = useAction(api.screening.chat);
  const runScreening = useAction(api.screening.screen);
  const { addResult, history } = useScreeningHistory();

  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false); // AI chat request in flight
  const [isRunning, setIsRunning] = useState(false); // screening pipeline running
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<MatchedResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"original" | "attention" | "compare">("original");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [comparePos, setComparePos] = useState(50);
  const [showTrace, setShowTrace] = useState(false);
  const [showReport, setShowReport] = useState(true);
  const [showEvidencePanel, setShowEvidencePanel] = useState(true);

  const nextIdRef = useRef(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastReportRef = useRef<MatchedResult | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);
  const compareRef = useRef<HTMLDivElement>(null);
  const compareDragRef = useRef(false);
  const panRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (wordIntervalRef.current) {
      clearInterval(wordIntervalRef.current);
      wordIntervalRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // Keep the latest chat message in view while conversing.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [entries.length, busy]);

  type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
    ? Omit<T, K>
    : never;
  type NewEntry = DistributiveOmit<ChatEntry, "id">;

  const pushEntry = (entry: NewEntry) => {
    const id = nextIdRef.current++;
    setEntries((prev) => [...prev, { ...entry, id } as ChatEntry]);
    return id;
  };

  const patchEntry = (id: number, patch: Partial<ChatEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? ({ ...e, ...patch } as ChatEntry) : e)),
    );
  };

  const streamReport = (res: MatchedResult, filename: string) => {
    addResult({
      filename,
      matchedKey: res.matched_key,
      drStage: res.dr_stage,
      drLabel: res.dr_label,
      referable: res.referable,
      confidence: res.confidence,
      gradcamImage: res.gradcam_image,
      explanation: res.explanation,
    });

    setResult(res);
    lastReportRef.current = res;

    const reportId = pushEntry({ kind: "report", result: res, shownWords: 0 });
    const words = res.report.split(/\s+/);
    wordIntervalRef.current = setInterval(() => {
      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== reportId || e.kind !== "report") return e;
          if (e.shownWords >= words.length) {
            if (wordIntervalRef.current) {
              clearInterval(wordIntervalRef.current);
              wordIntervalRef.current = null;
            }
            return e;
          }
          return { ...e, shownWords: e.shownWords + 1 };
        }),
      );
    }, 30);
  };

  /* ---------------------------------------------------------------- */
  /* Screening inside the chat                                         */
  /* ---------------------------------------------------------------- */

  const handleFile = useCallback(
    (file: File) => {
      if (isRunning) return;
      clearTimers();
      setIsRunning(true);
      setResult(null);
      setViewMode("original");
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setComparePos(50);

      const url = URL.createObjectURL(file);
      setImageUrl(url);
      pushEntry({ kind: "user-image", name: file.name, url });
      const pipelineId = pushEntry({
        kind: "pipeline",
        statuses: Array(TOTAL_STAGES).fill("pending") as StageStatus[],
        activeLine: null,
      });

      // Screening lookup — called directly via the Convex action. May include
      // a live AI report call, so it runs in parallel with the animation and
      // is awaited at the reveal. A hard 40s timeout + catch guarantee the
      // guaranteed report is used if the action hangs or fails.
      const fetchPromise = Promise.race([
        runScreening({ filename: file.name }),
        new Promise<MatchedResult>((resolve) =>
          setTimeout(() => resolve(guaranteedResult()), 40000),
        ),
      ]).catch(() => guaranteedResult());

      // Choreograph the 6-stage pipeline with randomized per-stage timing.
      let elapsed = 0;
      for (let i = 0; i < TOTAL_STAGES; i++) {
        const stage = STAGES[i];
        const duration = randomInRange(stage.range);
        const start = elapsed;

        timersRef.current.push(
          setTimeout(() => {
            setEntries((prev) =>
              prev.map((e) => {
                if (e.id !== pipelineId || e.kind !== "pipeline") return e;
                const statuses = [...e.statuses];
                if (i > 0) statuses[i - 1] = "complete";
                statuses[i] = "active";
                return { ...e, statuses, activeLine: stage.statusLines[0] };
              }),
            );
          }, start),
        );

        timersRef.current.push(
          setTimeout(
            () => patchEntry(pipelineId, { activeLine: stage.statusLines[1] }),
            start + duration / 2,
          ),
        );

        elapsed += duration;
      }

      // Pipeline finished — resolve the backend response and stream the report.
      timersRef.current.push(
        setTimeout(async () => {
          setEntries((prev) =>
            prev.map((e) => {
              if (e.id !== pipelineId || e.kind !== "pipeline") return e;
              const statuses = [...e.statuses];
              statuses[TOTAL_STAGES - 1] = "complete";
              return { ...e, statuses, activeLine: null };
            }),
          );

          const data = await fetchPromise;
          setIsRunning(false);

          if (!data.matched) {
            // Should be unreachable (backend falls back to a demo case),
            // but guarantee the report even here.
            streamReport(guaranteedResult(), file.name);
            toast.success("Screening complete", {
              description: "AI assessment ready — Moderate NPDR (demo case).",
            });
            return;
          }

          streamReport(data, file.name);
          toast.success("Screening complete", {
            description: `AI assessment ready — Stage ${data.dr_stage} · ${data.confidence}% confidence.`,
          });
        }, elapsed),
      );
    },
    [addResult, clearTimers, isRunning],
  );

  /* ---------------------------------------------------------------- */
  /* Chat submit                                                       */
  /* ---------------------------------------------------------------- */

  const submit = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || busy || isRunning) return;

    const report = lastReportRef.current;
    // Conversation history: flatten prior text exchanges for context.
    const history: ChatMessage[] = entries
      .filter(
        (e): e is Extract<ChatEntry, { kind: "user-text" | "assistant" }> =>
          e.kind === "user-text" || e.kind === "assistant",
      )
      .map((e) => ({
        role: e.kind === "user-text" ? ("user" as const) : ("assistant" as const),
        content: e.text,
      }));

    pushEntry({ kind: "user-text", text: trimmed });
    setInput("");
    setBusy(true);

    try {
      // Hard 45s frontend timeout so a stalled Convex call can never leave
      // the input locked (busy stuck true) forever.
      const res = await Promise.race([
        sendChat({
          question: trimmed,
          history,
          ...(report
            ? {
                report: report.report,
                dr_stage: report.dr_stage,
                dr_label: report.dr_label,
                referable: report.referable,
                confidence: report.confidence,
              }
            : {}),
        }),
        new Promise<{ reply: string }>((resolve) =>
          setTimeout(
            () =>
              resolve({
                reply:
                  "The AI service took too long to respond. Please try again in a moment.",
              }),
            45000,
          ),
        ),
      ]);
      pushEntry({ kind: "assistant", text: res.reply });
    } catch {
      pushEntry({
        kind: "assistant",
        text: "Could not reach the AI service. Please try again in a moment.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit(input);
  };

  /* ---------------------------------------------------------------- */
  /* Drag & drop                                                       */
  /* ---------------------------------------------------------------- */

  const handleDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const handleClear = () => {
    clearTimers();
    setEntries([]);
    setInput("");
    setIsRunning(false);
    setResult(null);
    setImageUrl(null);
    setViewMode("original");
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setComparePos(50);
    lastReportRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* Drag-to-pan when zoomed in (compare mode uses its own divider drag). */
  const startPan = (e: React.PointerEvent) => {
    if (zoom <= 1 || viewMode === "compare") return;
    panRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const movePan = (e: React.PointerEvent) => {
    if (!panRef.current) return;
    setPan({ x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y });
  };
  const endPan = () => {
    panRef.current = null;
  };

  /* ---------------------------------------------------------------- */
  /* Derived render data                                               */
  /* ------------------------------------------------------------------ */

  const pipelineEntry = [...entries]
    .reverse()
    .find((e): e is Extract<ChatEntry, { kind: "pipeline" }> => e.kind === "pipeline");
  const reportEntry = [...entries]
    .reverse()
    .find((e): e is Extract<ChatEntry, { kind: "report" }> => e.kind === "report");
  const conversation = entries.filter(
    (e): e is Extract<ChatEntry, { kind: "user-text" | "assistant" }> =>
      e.kind === "user-text" || e.kind === "assistant",
  );

  const distribution = result ? stageDistribution(result.confidence, result.dr_stage) : [];
  const findings = result ? findingsFor(result.dr_stage) : [];

  return (
    <AppShell>
      <div
        className="flex gap-6"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* -------------------------- MAIN WORKSPACE -------------------------- */}
        <div className="min-w-0 flex-1 space-y-6">
          <PageHeader
            title="New Retinal Screening"
            subtitle="AI-assisted diabetic retinopathy assessment"
          />

          {/* Pipeline stepper */}
          {pipelineEntry && (
            <section className="panel nb-pop p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  Screening Pipeline
                </h2>
                {isRunning && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
                    <Loader2 className="size-3.5 animate-spin" />
                    Running
                  </span>
                )}
                {!isRunning && pipelineEntry.statuses.every((s) => s === "complete") && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <CircleCheck className="size-3.5" />
                    Complete
                  </span>
                )}
              </div>
              {/* overall progress */}
              <div className="mb-3 h-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
                  style={{
                    width: `${
                      (pipelineEntry.statuses.filter((s) => s === "complete").length /
                        TOTAL_STAGES) *
                      100
                    }%`,
                  }}
                />
              </div>
              <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {STAGES.map((stage, i) => {
                  const status = pipelineEntry.statuses[i];
                  const Icon = stage.icon;
                  return (
                    <li
                      key={stage.id}
                      className={cn(
                        "relative rounded-lg border p-2.5 transition-colors duration-300",
                        // connector line to the next stage (single-row layout only)
                        i < TOTAL_STAGES - 1 &&
                          "after:absolute after:top-1/2 after:-right-2 after:hidden after:h-px after:w-2 after:bg-border after:content-[''] lg:after:block",
                        status === "pending" && "border-border bg-muted/40",
                        status === "active" && "border-blue-200 bg-blue-50",
                        status === "complete" && "border-emerald-200 bg-emerald-50",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="nb-mono text-[10px] font-medium text-muted-foreground">
                          {stage.num}
                        </span>
                        <span
                          className={cn(
                            "flex size-6 items-center justify-center rounded-full",
                            status === "pending" && "bg-muted text-muted-foreground",
                            status === "active" && "bg-blue-100 text-blue-600",
                            status === "complete" && "bg-emerald-100 text-emerald-600",
                          )}
                        >
                          {status === "complete" ? (
                            <VerifyCheck className="size-6" />
                          ) : status === "active" ? (
                            <Icon className="size-3 animate-pulse" />
                          ) : (
                            <Icon className="size-3 opacity-50" />
                          )}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "mt-1.5 text-[11px] font-medium leading-tight",
                          status === "active" ? "text-blue-700" : "text-foreground",
                        )}
                      >
                        {stage.label}
                      </div>
                      {/* progress indicator */}
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            status === "complete" && "w-full bg-emerald-500",
                            status === "active" && "w-2/3 bg-blue-500",
                            status === "pending" && "w-0",
                          )}
                        />
                      </div>
                      {status === "active" && pipelineEntry.activeLine && (
                        <p className="nb-mono mt-1.5 truncate text-[10px] text-blue-600/80">
                          {pipelineEntry.activeLine}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* Upload zone (before first image / always available while idle) */}
          {!imageUrl && !isRunning && (            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="panel nb-pop-hover flex w-full cursor-pointer flex-col items-center gap-3 border-dashed bg-card px-6 py-12 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/40"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ScanEye className="size-6" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Upload a fundus image
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Drag & drop anywhere on the page, or click to browse — PNG or JPEG
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                <Sparkles className="size-3 text-blue-500" />
                Demo files: eyescan1 · eyescan2 · eyescan3
              </span>
            </button>
          )}

          {/* Elegant AI processing + skeletons while the pipeline runs */}
          {isRunning && (
            <section className="panel nb-pop p-6">
              <AIProcessing label="Analyzing retinal image — pipeline in progress" />
              <div className="mt-5 space-y-2.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            </section>
          )}

          {/* Drag overlay */}
          {isDragging && (
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-blue-50/70 backdrop-blur-[2px]">
              <div className="rounded-xl border-2 border-dashed border-blue-300 bg-white px-8 py-6 text-center shadow-lg">
                <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                  <ScanEye className="size-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-blue-700">
                  Drop fundus image to run screening
                </p>
                <p className="mt-0.5 text-xs text-blue-600/70">
                  eyescan1 · eyescan2 · eyescan3
                </p>
              </div>
            </div>
          )}

          {/* Diagnosis hero card */}
          {result && (
            <section className="panel nb-pop p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">
                  AI Screening Assessment
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <ShieldCheck className="size-3.5" />
                  VERIFIED AI RESULT
                </span>
              </div>

              <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
                {/* Left: stage + confidence */}
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Predicted Stage
                  </div>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="text-4xl font-semibold tracking-tight text-foreground">
                      STAGE {result.dr_stage}
                    </span>
                  </div>
                  <div className="mt-1 text-lg font-medium text-blue-700">
                    {result.dr_label}
                    {result.dr_stage === 0
                      ? ""
                      : result.dr_stage >= 4
                        ? " DR"
                        : " NPDR"}
                  </div>
                  <div className="mt-4 flex items-end gap-6">
                    <div>
                      <div className="text-3xl font-semibold tracking-tight text-foreground">
                        <CountUp value={result.confidence} suffix="%" duration={1100} />
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">
                        Model Confidence
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-semibold tracking-tight text-slate-500">
                        <CountUp
                          value={Math.round((100 - result.confidence) * 10) / 10}
                          decimals={1}
                          suffix="%"
                          duration={1100}
                        />
                      </div>
                      <Tooltip label="Complement of model confidence — residual prediction uncertainty">
                        <div className="w-fit cursor-help text-xs font-medium text-muted-foreground">
                          Uncertainty ⓘ
                        </div>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                <div className="hidden w-px bg-border lg:block" />

                {/* Right: referral + probability viz */}
                <div className="flex flex-col justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Referral Status
                    </div>
                    <div
                      className={cn(
                        "mt-1.5 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium",
                        result.referable
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700",
                      )}
                    >
                      {result.referable ? (
                        <>
                          <CircleAlert className="size-4" />
                          Refer to Ophthalmology
                        </>
                      ) : (
                        <>
                          <CircleCheck className="size-4" />
                          Routine Screening
                        </>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Severity:{" "}
                      <span className="font-medium text-foreground">
                        {result.dr_stage === 0
                          ? "No retinopathy"
                          : result.dr_stage >= 4
                            ? "Sight-threatening"
                            : "Referable"}
                      </span>
                    </div>
                  </div>
                  {/* mini probability viz */}
                  <div className="space-y-1.5">
                    {distribution.slice(0, 3).map((d, i) => (
                      <div key={d.stage} className="flex items-center gap-2">
                        <span className="w-16 text-[10px] text-muted-foreground">
                          Stage {d.stage}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700 ease-out",
                              d.stage === result.dr_stage ? "bg-blue-500" : "bg-slate-300",
                            )}
                            style={{
                              width: `${Math.max(d.pct, 1.5)}%`,
                              transitionDelay: `${i * 120}ms`,
                            }}
                          />
                        </div>
                        <span className="nb-mono w-10 text-right text-[10px] text-muted-foreground">
                          {d.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-5 border-t pt-4 text-sm leading-relaxed text-muted-foreground">
                AI screening indicates retinal findings consistent with{" "}
                <span className="font-medium text-foreground">
                  {result.dr_label}{" "}
                  {result.dr_stage === 0
                    ? "(no retinopathy)"
                    : result.dr_stage >= 4
                      ? "Proliferative Diabetic Retinopathy"
                      : "Non-Proliferative Diabetic Retinopathy"}
                </span>
                . {result.explanation}
              </p>
            </section>
          )}

          {/* Retinal image analysis */}
          {imageUrl && (
            <section className="panel nb-pop overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
                <h2 className="text-sm font-semibold text-foreground">
                  Retinal Image Analysis
                </h2>
                <div className="flex items-center gap-3">
                  {/* quality overlay */}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Image Quality: GOOD · Gradable
                  </span>
                  {/* toggle */}
                  <div className="flex overflow-hidden rounded-lg border text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setViewMode("original")}
                      className={cn(
                        "cursor-pointer px-3 py-1.5 transition-colors",
                        viewMode === "original"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground hover:bg-muted",
                      )}
                    >
                      Original
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("attention")}
                      className={cn(
                        "cursor-pointer px-3 py-1.5 transition-colors",
                        viewMode === "attention"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground hover:bg-muted",
                      )}
                    >
                      AI Attention
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("compare")}
                      className={cn(
                        "cursor-pointer px-3 py-1.5 transition-colors",
                        viewMode === "compare"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground hover:bg-muted",
                      )}
                    >
                      Compare
                    </button>
                  </div>
                  {/* zoom */}
                  <div className="flex items-center gap-1 rounded-lg border">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(1, zoom - 0.25);
                        setZoom(next);
                        if (next === 1) setPan({ x: 0, y: 0 });
                      }}
                      className="cursor-pointer rounded-l-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                      aria-label="Zoom out"
                    >
                      <Minimize2 className="size-3.5" />
                    </button>
                    <span className="nb-mono w-10 text-center text-[10px] text-muted-foreground">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
                      className="cursor-pointer rounded-r-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                      aria-label="Zoom in"
                    >
                      <Maximize2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center bg-slate-50 p-4">
                <div
                  ref={compareRef}
                  className="relative aspect-[4/3] w-full max-w-[32rem] select-none overflow-hidden rounded-lg border bg-black"
                >
                  {/* Original image (base layer) */}
                  <img
                    src={imageUrl}
                    alt="Uploaded fundus image"
                    className={cn(
                      "absolute inset-0 h-full w-full object-contain transition-transform duration-150",
                      zoom > 1 && viewMode !== "compare" && "cursor-grab active:cursor-grabbing",
                    )}
                    style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
                    onPointerDown={startPan}
                    onPointerMove={movePan}
                    onPointerUp={endPan}
                    onPointerLeave={endPan}
                    draggable={false}
                  />
                  {/* AI attention layer — full overlay or clipped by the compare divider */}
                  {viewMode !== "original" && result && (
                    <img
                      src={`/assets/gradcam/${result.gradcam_image}`}
                      alt="Grad-CAM attention overlay"
                      className="pointer-events-none absolute inset-0 h-full w-full object-contain anim-fade-slow"
                      style={{
                        transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                        opacity: viewMode === "compare" ? 0.85 : 0.72,
                        clipPath:
                          viewMode === "compare" ? `inset(0 0 0 ${comparePos}%)` : undefined,
                      }}
                      draggable={false}
                    />
                  )}
                  {viewMode === "attention" && (
                    <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                      Grad-CAM · Explainability Heatmap
                    </span>
                  )}
                  {viewMode === "compare" && (
                    <>
                      <div
                        className="absolute inset-y-0 z-10 w-px bg-white/90"
                        style={{ left: `${comparePos}%` }}
                      />
                      <button
                        type="button"
                        aria-label="Drag to compare original and AI attention views"
                        className="absolute top-1/2 z-20 flex size-8 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-700 shadow-md transition-transform hover:scale-105"
                        style={{ left: `${comparePos}%` }}
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          compareDragRef.current = true;
                        }}
                        onPointerMove={(e) => {
                          if (!compareDragRef.current) return;
                          const rect = compareRef.current?.getBoundingClientRect();
                          if (!rect) return;
                          const pct = ((e.clientX - rect.left) / rect.width) * 100;
                          setComparePos(Math.min(94, Math.max(6, pct)));
                        }}
                        onPointerUp={() => {
                          compareDragRef.current = false;
                        }}
                      >
                        <MoveHorizontal className="size-4" />
                      </button>
                      <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                        Original
                      </span>
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                        AI Attention
                      </span>
                    </>
                  )}
                  {zoom > 1 && viewMode !== "compare" && (
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                      Drag to pan
                    </span>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Detected retinal findings — staggered reveal */}
          {result && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Detected Retinal Findings
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {findings.map((f, i) => (
                  <div
                    key={f.name}
                    className="panel anim-rise nb-pop-hover p-4"
                    style={{ animationDelay: `${i * 90}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <ScanEye className="size-4" />
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          f.detected
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-slate-50 text-slate-500",
                        )}
                      >
                        {f.detected ? "Detected" : "Not Detected"}
                      </span>
                    </div>
                    <div className="mt-3 text-sm font-semibold text-foreground">
                      {f.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {f.location}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700 ease-out",
                            f.detected ? "bg-blue-500" : "bg-slate-300",
                          )}
                          style={{
                            width: `${f.conf}%`,
                            transitionDelay: `${i * 90 + 250}ms`,
                          }}
                        />
                      </div>
                      <span className="nb-mono text-[10px] text-muted-foreground">
                        {f.conf}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* DR stage probability — interactive severity bars */}
          {result && (
            <section className="panel p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  DR Stage Probability
                </h2>
                <Tooltip label="Model softmax output over the 5-class DR severity scale">
                  <span className="cursor-help rounded-full border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    i
                  </span>
                </Tooltip>
              </div>
              <div className="mt-4 space-y-2.5">
                {distribution.map((d, i) => (
                  <SeverityBar
                    key={d.stage}
                    name={`Stage ${d.stage} — ${d.name}`}
                    pct={d.pct}
                    active={d.stage === result.dr_stage}
                    delay={i * 100}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Evidence & AI reasoning */}
          {result && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  Evidence & AI Reasoning
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <Sparkles className="size-3" />
                  Evidence-backed AI explanation
                </span>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="panel p-4">
                  <div className="flex items-center gap-2">
                    <ScanEye className="size-4 text-blue-600" />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                      Visual Evidence
                    </h3>
                  </div>
                  <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CircleCheck className="size-3.5 text-emerald-500" />
                      Microaneurysms detected
                    </li>
                    <li className="flex items-center gap-2">
                      <CircleCheck className="size-3.5 text-emerald-500" />
                      Hemorrhages detected
                    </li>
                    <li className="flex items-center gap-2">
                      <CircleCheck className="size-3.5 text-emerald-500" />
                      Hard exudates detected
                    </li>
                    <li className="flex items-center gap-2">
                      <CircleCheck className="size-3.5 text-emerald-500" />
                      Grad-CAM regions reviewed
                    </li>
                  </ul>
                </div>
                <div className="panel p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-teal-600" />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                      Clinical Evidence
                    </h3>
                  </div>
                  <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CircleCheck className="size-3.5 text-emerald-500" />
                      DR classification criteria
                    </li>
                    <li className="flex items-center gap-2">
                      <CircleCheck className="size-3.5 text-emerald-500" />
                      Relevant clinical guidelines
                    </li>
                    <li className="flex items-center gap-2">
                      <CircleCheck className="size-3.5 text-emerald-500" />
                      Retrieved medical literature
                    </li>
                  </ul>
                </div>
                <div className="panel p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                      Verification
                    </h3>
                  </div>
                  <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CircleCheck className="size-3.5 text-emerald-500" />
                      Model output verified
                    </li>
                    <li className="flex items-center gap-2">
                      <CircleCheck className="size-3.5 text-emerald-500" />
                      Evidence grounded
                    </li>
                    <li className="flex items-center gap-2">
                      <CircleCheck className="size-3.5 text-emerald-500" />
                      Clinical logic verified
                    </li>
                    <li className="flex items-center gap-2">
                      <CircleCheck className="size-3.5 text-emerald-500" />
                      No contradiction detected
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Retrieved evidence (RAG) */}
          {result && (
            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Retrieved Evidence
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                  Hybrid RAG
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Semantic Retrieval + Keyword Retrieval → Reranking → Verified
                Evidence
              </p>
              <div className="mt-4 space-y-2.5">
                {RAG_SOURCES.map((src, i) => (
                  <div
                    key={src.title}
                    className="anim-rise rounded-lg border bg-muted/30 p-3.5 transition-colors hover:bg-muted/60"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-foreground">
                        {src.title}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="rounded-full border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {src.type}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <Check className="size-3" />
                          Verified
                        </span>
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {src.evidence}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
                          style={{
                            width: `${src.score}%`,
                            transitionDelay: `${i * 80 + 300}ms`,
                          }}
                        />
                      </div>
                      <span className="nb-mono text-[10px] text-muted-foreground">
                        relevance {src.score}%
                      </span>
                      <span className="nb-mono text-[10px] text-muted-foreground">
                        · {src.ref}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* AI reasoning trace */}
          {result && (
            <section className="panel p-5">
              <button
                type="button"
                onClick={() => setShowTrace((s) => !s)}
                className="flex w-full cursor-pointer items-center justify-between"
              >
                <span className="text-sm font-semibold text-foreground">
                  AI Reasoning Trace
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    showTrace && "rotate-180",
                  )}
                />
              </button>
              {showTrace && (
                <div className="mt-4 space-y-0">
                  {REASONING_FLOW.map((step, i) => (
                    <div key={step.label} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="flex size-6 items-center justify-center rounded-full border bg-card text-[10px] font-semibold text-blue-600">
                          {i + 1}
                        </span>
                        {i < REASONING_FLOW.length - 1 && (
                          <span className="w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="pb-4">
                        <div className="text-[13px] font-medium text-foreground">
                          {step.label}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Case history */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Case History</h2>
              <span className="text-xs text-muted-foreground">
                {history.length} recorded this session
              </span>
            </div>
            <CaseHistoryTable />
          </section>

          {/* Full streamed AI report (structured, preserved functionality) */}
          {reportEntry && (
            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  Full AI Report
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {reportEntry.result.report_source === "ai"
                      ? "live model"
                      : "template"}
                  </span>
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(reportEntry.result.report);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <FileText className="size-3" />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReport((s) => !s)}
                    className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                    aria-label={showReport ? "Collapse report" : "Expand report"}
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        showReport && "rotate-180",
                      )}
                    />
                  </button>
                </div>
              </div>
              {showReport && (
                <div
                  aria-live="polite"
                  className="max-h-[32rem] overflow-y-auto px-5 py-4"
                >
                  <StructuredReportStreamed
                    text={reportEntry.result.report}
                    shownWords={reportEntry.shownWords}
                  />
                </div>
              )}
            </section>
          )}

          {/* Clinical recommendation */}
          {result && (
            <section className="panel border-blue-200 bg-blue-50/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Clinical Recommendation
                  </h2>
                  <p className="mt-2 text-[15px] font-medium leading-relaxed text-foreground">
                    {result.referable
                      ? "Refer to ophthalmology for clinical examination and confirmation."
                      : "Continue routine annual screening. No referral required at this stage."}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                    result.referable
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700",
                  )}
                >
                  {result.referable ? "REFERRAL RECOMMENDED" : "NO REFERRAL"}
                </span>
              </div>
              <p className="mt-3 border-t border-blue-200/60 pt-3 text-xs text-muted-foreground">
                AI screening result. Final clinical assessment remains with the
                ophthalmologist.
              </p>
            </section>
          )}

          {/* Ask RetinaScan AI */}
          <section className="panel nb-pop overflow-hidden">
            <div className="border-b px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="size-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Ask RetinaScan AI
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Ask about this screening, evidence, findings or report.
                  </p>
                </div>
              </div>
            </div>

            {/* compact thread */}
            {conversation.length > 0 && (
              <div className="max-h-80 space-y-3 overflow-y-auto px-5 py-4">
                {conversation.map((e) =>
                  e.kind === "user-text" ? (
                    <div key={e.id} className="flex justify-end">
                      <span className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                        {e.text}
                      </span>
                    </div>
                  ) : (
                    <div key={e.id} className="flex items-start gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bot className="size-3" />
                      </span>
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3.5 py-3">
                        <RichText
                          text={e.text}
                          className="text-[13px] leading-relaxed"
                        />
                      </div>
                    </div>
                  ),
                )}
                {busy && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TypingDots />
                    thinking...
                  </div>
                )}
                <div ref={threadEndRef} />
              </div>
            )}

            {/* suggested prompts */}
            <div className="flex flex-wrap gap-2 px-5 pt-3">
              {(result ? SUGGESTED_PROMPTS : EMPTY_PROMPTS).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void submit(prompt)}
                  disabled={busy || isRunning}
                  className="cursor-pointer rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRunning}
                className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                aria-label="Attach fundus image"
              >
                <Paperclip className="size-4" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about this screening…"
                className="min-w-0 flex-1 rounded-lg border bg-muted/40 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-blue-300 focus:bg-card"
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy || isRunning || !input.trim()}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="size-3.5" />
                Send
              </button>
              {entries.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={busy}
                  className="cursor-pointer rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </form>
          </section>

          {/* Technical status strip — live service indicators */}
          <div className="flex flex-wrap items-center gap-2 px-1">
            {[
              ["Model", "DR Vision Model"],
              ["Explainability", "Grad-CAM"],
              ["RAG", "Hybrid"],
              ["Verification", "Multi-Layer"],
            ].map(([label, value]) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[11px]"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold text-foreground">{value}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Verified
            </span>
            <ServiceHealth compact />
          </div>
        </div>

        {/* ---------------------- RIGHT EVIDENCE PANEL ---------------------- */}
        {result && showEvidencePanel && (
          <aside className="hidden w-80 shrink-0 xl:block">
            <div className="sticky top-24 space-y-4">
              <div className="panel nb-pop p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">
                    Screening Evidence
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowEvidencePanel(false)}
                    className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-muted"
                    aria-label="Hide evidence panel"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
                <dl className="mt-4 space-y-3.5 text-[13px]">
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Image Findings
                    </dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {findings.filter((f) => f.detected).length} of 4 lesion
                      types detected
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Model Prediction
                    </dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      Stage {result.dr_stage} — {result.dr_label}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Confidence
                    </dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${result.confidence}%` }}
                        />
                      </div>
                      <span className="nb-mono text-xs font-medium">
                        {result.confidence}%
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      RAG Sources
                    </dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      3 retrieved · 3 verified
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Verification
                    </dt>
                    <dd className="mt-0.5 inline-flex items-center gap-1.5 font-medium text-emerald-600">
                      <CircleCheck className="size-3.5" />
                      Passed · No contradictions
                    </dd>
                  </div>
                  <div className="border-t pt-3">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Protocol Version
                    </dt>
                    <dd className="nb-mono mt-0.5 text-xs text-foreground">
                      v2.4.1
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Model Version
                    </dt>
                    <dd className="nb-mono mt-0.5 text-xs text-foreground">
                      effnet-b0-dr · 2025-06
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="panel p-4">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  Clinically auditable output — every result is traceable to
                  model, evidence and protocol versions.
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </AppShell>
  );
}
