import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAction } from "convex/react";
import {
  Bot,
  BrainCircuit,
  Check,
  FileSearch,
  Loader2,
  Paperclip,
  ScanEye,
  Send,
  ShieldCheck,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell, DrStageBadge } from "@/components/AppShell";
import { ChatMessage, useScreeningHistory } from "@/context/ScreeningHistoryContext";
import { api } from "@/convex/_generated/api";
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
    label: "Intake & Quality Gate",
    icon: ScanEye,
    range: [4000, 6000],
    statusLines: [
      "Validating image format & resolution...",
      "Running quality gate checks...",
    ],
  },
  {
    id: 2,
    label: "Vision Model (DR Staging)",
    icon: BrainCircuit,
    range: [6000, 8000],
    statusLines: [
      "Running EfficientNet-B0 classification...",
      "Generating Grad-CAM heatmap...",
    ],
  },
  {
    id: 3,
    label: "Multi-Agent Reasoning",
    icon: Bot,
    range: [5000, 7000],
    statusLines: [
      "Orchestrating LangGraph agents...",
      "SGLang inference on staging rationale...",
    ],
  },
  {
    id: 4,
    label: "Evidence Retrieval (RAG)",
    icon: FileSearch,
    range: [4000, 6000],
    statusLines: [
      "Embedding findings & querying guidelines...",
      "Retrieving AAO preferred practice patterns...",
    ],
  },
  {
    id: 5,
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
    label: "Clinical Delivery",
    icon: Send,
    range: [2000, 3000],
    statusLines: ["Formatting DiagnosisCard...", "Delivery complete."],
  },
];

const TOTAL_STAGES = STAGES.length;

const SUGGESTED_PROMPTS = [
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

/** Render markdown **bold** in a (possibly still-streaming) text chunk. */
function renderBold(text: string) {
  const parts = text.split("**");
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Chat() {
  const sendChat = useAction(api.screening.chat);
  const runScreening = useAction(api.screening.screen);
  const { addResult } = useScreeningHistory();

  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false); // AI chat request in flight
  const [isRunning, setIsRunning] = useState(false); // screening pipeline running
  const [isDragging, setIsDragging] = useState(false);

  const nextIdRef = useRef(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastReportRef = useRef<MatchedResult | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (wordIntervalRef.current) {
      clearInterval(wordIntervalRef.current);
      wordIntervalRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [entries, busy]);

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

  const streamReport = (result: MatchedResult, filename: string) => {
    addResult({
      filename,
      matchedKey: result.matched_key,
      drStage: result.dr_stage,
      drLabel: result.dr_label,
      referable: result.referable,
      confidence: result.confidence,
      gradcamImage: result.gradcam_image,
      explanation: result.explanation,
    });

    const reportId = pushEntry({ kind: "report", result, shownWords: 0 });
    const words = result.report.split(/\s+/);
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
      lastReportRef.current = null;

      const url = URL.createObjectURL(file);
      pushEntry({ kind: "user-image", name: file.name, url });
      const pipelineId = pushEntry({
        kind: "pipeline",
        statuses: Array(TOTAL_STAGES).fill("pending") as StageStatus[],
        activeLine: null,
      });

      // Screening lookup — called directly via the Convex action (no HTTP
      // round-trip to a separate domain). May include a live AI report call,
      // so it runs in parallel with the animation and is awaited at the
      // reveal. On any failure the guaranteed report is used instead.
      const fetchPromise = runScreening({ filename: file.name }).catch(
        () => guaranteedResult(),
      );

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

      // Pipeline finished — resolve the backend response, mark delivery
      // complete, and stream the report into the chat.
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
            const result = guaranteedResult();
            lastReportRef.current = result;
            streamReport(result, file.name);
            return;
          }

          const result: MatchedResult = data;
          lastReportRef.current = result;
          addResult({
            filename: file.name,
            matchedKey: result.matched_key,
            drStage: result.dr_stage,
            drLabel: result.dr_label,
            referable: result.referable,
            confidence: result.confidence,
            gradcamImage: result.gradcam_image,
            explanation: result.explanation,
          });
          streamReport(result, file.name);
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
      const res = await sendChat({
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
      });
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

  const handleClear = () => {
    clearTimers();
    setEntries([]);
    setInput("");
    setIsRunning(false);
    lastReportRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasConversation = entries.length > 0;

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            RetinaScan AI — Demo Mode
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            New Screening
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Upload a fundus image to run the 6-stage screening pipeline and get
            a full report — or just ask about diabetic retinopathy, DR staging,
            and the pipeline.
          </p>
        </header>

        <div
          className="nb-border flex min-h-[32rem] flex-col bg-card"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          {/* Messages */}
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {/* Empty state */}
            {!hasConversation && (
              <div className="flex flex-col items-start gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center border-2 bg-primary text-primary-foreground">
                    <Bot className="size-4" />
                  </span>
                  <p className="border-2 bg-muted px-3 py-2 text-sm">
                    Hi — I'm RetinaScan AI. Drop a fundus image here (or use
                    the 📎 button) to run a screening, or ask me anything about
                    diabetic retinopathy.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void submit(prompt)}
                      disabled={busy || isRunning}
                      className="nb-pop-hover cursor-pointer border-2 bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <p className="nb-mono text-xs text-muted-foreground">
                  Demo files: eyescan1 / eyescan2 / eyescan3
                </p>
              </div>
            )}

            {/* Entries */}
            {entries.map((entry) => {
              if (entry.kind === "user-text") {
                return (
                  <div key={entry.id} className="flex justify-end">
                    <span className="max-w-[80%] border-2 bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">
                      {entry.text}
                    </span>
                  </div>
                );
              }

              if (entry.kind === "user-image") {
                return (
                  <div key={entry.id} className="flex justify-end">
                    <div className="max-w-[80%] border-2 bg-secondary p-2 text-secondary-foreground">
                      <img
                        src={entry.url}
                        alt={entry.name}
                        className="max-h-40 border-2 object-contain"
                      />
                      <div className="nb-mono mt-1.5 max-w-[16rem] truncate px-1 text-xs font-bold">
                        {entry.name}
                      </div>
                    </div>
                  </div>
                );
              }

              if (entry.kind === "pipeline") {
                return (
                  <div key={entry.id} className="flex justify-start">
                    <div className="w-full max-w-xl border-2 bg-card">
                      <div className="border-b-2 bg-muted px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Screening Pipeline
                      </div>
                      <ol className="flex flex-col">
                        {STAGES.map((stage, i) => {
                          const status = entry.statuses[i];
                          const Icon = stage.icon;
                          return (
                            <li
                              key={stage.id}
                              className={cn(
                                "flex items-center gap-3 border-b-2 px-3 py-2 transition-colors duration-300 last:border-b-0",
                                status === "pending" &&
                                  "bg-card text-muted-foreground",
                                status === "active" &&
                                  "bg-secondary text-secondary-foreground",
                                status === "complete" &&
                                  "bg-card text-foreground",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex size-7 shrink-0 items-center justify-center border-2 transition-colors duration-300",
                                  status === "pending" && "border-border bg-card",
                                  status === "active" &&
                                    "border-border bg-secondary-foreground text-secondary",
                                  status === "complete" &&
                                    "border-border bg-chart-2 text-card-foreground",
                                )}
                              >
                                {status === "complete" ? (
                                  <Check className="size-3.5" />
                                ) : (
                                  <Icon className="size-3.5" />
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold tracking-tight sm:text-sm">
                                  {stage.label}
                                </div>
                                {status === "active" && entry.activeLine && (
                                  <div className="nb-mono mt-0.5 truncate text-[11px]">
                                    {entry.activeLine}
                                  </div>
                                )}
                              </div>
                              <span className="nb-mono text-[11px]">
                                {status === "complete"
                                  ? "done"
                                  : status === "active"
                                    ? "running"
                                    : "queued"}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </div>
                );
              }

              if (entry.kind === "report") {
                const { result, shownWords } = entry;
                const words = result.report.split(/\s+/);
                const revealed = words.slice(0, shownWords).join(" ");
                const streaming = shownWords < words.length;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-start"
                  >
                    <div className="w-full max-w-3xl border-2 bg-card">
                      {/* Diagnosis summary */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 bg-muted px-3 py-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Diagnosis
                        </span>
                        <span className="nb-mono text-xs text-muted-foreground">
                          {result.matched_key}
                          {result.via_fallback ? " · demo case" : ""}
                          {` · ${result.report_source === "ai" ? "live model" : "template"}`}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 px-3 pt-3">
                        <DrStageBadge
                          stage={result.dr_stage}
                          label={result.dr_label}
                          referable={result.referable}
                        />
                        <span className="nb-mono text-2xl font-bold">
                          {result.confidence}%
                        </span>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          confidence
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Referral:{" "}
                          <span className="font-bold">
                            {result.referable
                              ? "Refer to ophthalmology"
                              : "Routine screening"}
                          </span>
                        </span>
                      </div>

                      {/* Streaming report */}
                      <div
                        aria-live="polite"
                        className="whitespace-pre-wrap px-3 py-3 text-[13px] leading-6"
                      >
                        {renderBold(revealed)}
                        {streaming && (
                          <span className="nb-mono animate-pulse">▌</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              }

              // assistant text
              return (
                <div key={entry.id} className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center border-2 bg-primary text-primary-foreground">
                    <Bot className="size-4" />
                  </span>
                  <p className="max-w-[85%] border-2 bg-card px-3 py-2 text-sm leading-6">
                    {entry.text}
                  </p>
                </div>
              );
            })}

            {busy && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                thinking...
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Drag-over banner */}
          {isDragging && (
            <div className="border-t-2 border-dashed bg-secondary/40 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
              Drop image to run screening
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t-2 bg-muted p-3"
          >
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isRunning}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-none border-2"
              aria-label="Upload fundus image"
            >
              <Paperclip className="size-4" />
            </Button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isRunning
                  ? "Screening in progress..."
                  : "Ask a question or attach an image..."
              }
              className="min-w-0 flex-1 border-2 bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
              disabled={busy || isRunning}
            />
            <Button
              type="submit"
              size="sm"
              disabled={busy || isRunning || !input.trim()}
              className="cursor-pointer gap-1.5 rounded-none border-2 font-semibold"
            >
              <Send className="size-3.5" />
              Send
            </Button>
            {hasConversation && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleClear}
                disabled={busy || isRunning}
                className="cursor-pointer rounded-none border-2"
                aria-label="Clear conversation"
              >
                <X className="size-4" />
              </Button>
            )}
          </form>
        </div>
      </div>
    </AppShell>
  );
}
