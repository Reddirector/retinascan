import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  BrainCircuit,
  Check,
  FileSearch,
  Loader2,
  ScanEye,
  Send,
  ShieldCheck,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell, DrStageBadge } from "@/components/AppShell";
import { useScreeningHistory } from "@/context/ScreeningHistoryContext";
import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
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

interface ScreeningState {
  file: File;
  previewUrl: string;
  result: MatchedResult | null;
  notMatched: boolean;
  error: string | null;
}

type StageStatus = "pending" | "active" | "complete";

interface Stage {
  id: number;
  label: string;
  icon: LucideIcon;
  /** [min, max] duration in ms — randomized per run. */
  range: [number, number];
  statusLines: string[];
}

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

function randomInRange([min, max]: [number, number]) {
  return min + Math.random() * (max - min);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function NewScreening() {
  const [screening, setScreening] = useState<ScreeningState | null>(null);
  const [stageStatuses, setStageStatuses] = useState<StageStatus[]>(
    Array(TOTAL_STAGES).fill("pending"),
  );
  const [activeStatusLine, setActiveStatusLine] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [visibleWords, setVisibleWords] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { addResult } = useScreeningHistory();
  const sendChat = useAction(api.screening.chat);

  /* Follow-up chat state (shown after the report finishes streaming) */
  interface ChatMessage {
    role: "user" | "assistant";
    content: string;
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [chatMessages, chatBusy]);

  /* ---------------------------------------------------------------- */
  /* Screening run                                                     */
  /* ---------------------------------------------------------------- */

  const startScreening = useCallback(
    async (file: File) => {
      clearTimers();
      setStageStatuses(Array(TOTAL_STAGES).fill("pending"));
      setActiveStatusLine(null);
      setVisibleWords(0);
      setIsRunning(true);

      // Backend lookup — may include a live AI explanation call, so it is
      // kicked off in parallel with the animation and awaited at the reveal.
      type ScreenResponse =
        | { error: string }
        | { matched: false }
        | MatchedResult;
      const fetchPromise = (async (): Promise<ScreenResponse> => {
        try {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/screen", {
            method: "POST",
            body: form,
          });
          const data = await res.json();
          if (!res.ok) {
            return { error: data?.error ?? "Screening request failed." };
          }
          return data as ScreenResponse;
        } catch {
          return { error: "Could not reach the screening service." };
        }
      })();

      // Choreograph the 6-stage pipeline with randomized per-stage timing.
      let elapsed = 0;
      for (let i = 0; i < TOTAL_STAGES; i++) {
        const stage = STAGES[i];
        const duration = randomInRange(stage.range);
        const start = elapsed;

        timersRef.current.push(
          setTimeout(() => {
            setStageStatuses((prev) => {
              const next = [...prev];
              if (i > 0) next[i - 1] = "complete";
              next[i] = "active";
              return next;
            });
            setActiveStatusLine(stage.statusLines[0]);
          }, start),
        );

        // Halfway through the stage, swap in the second status line.
        timersRef.current.push(
          setTimeout(
            () => setActiveStatusLine(stage.statusLines[1]),
            start + duration / 2,
          ),
        );

        elapsed += duration;
      }

      // Pipeline finished — resolve the backend response (AI explanation
      // latency is hidden under the animation), reveal the DiagnosisCard,
      // and start word streaming.
      timersRef.current.push(
        setTimeout(async () => {
          setStageStatuses((prev) => {
            const next = [...prev];
            next[TOTAL_STAGES - 1] = "complete";
            return next;
          });
          setActiveStatusLine(null);

          const data = await fetchPromise;
          if ("error" in data) {
            setScreening((s) =>
              s && s.file === file
                ? { ...s, result: null, notMatched: false, error: data.error }
                : s,
            );
            setIsRunning(false);
            return;
          }
          if (!data.matched) {
            setScreening((s) =>
              s && s.file === file
                ? { ...s, result: null, notMatched: true, error: null }
                : s,
            );
            setIsRunning(false);
            return;
          }

          const result: MatchedResult = data;
          setScreening((s) =>
            s && s.file === file ? { ...s, result, error: null } : s,
          );
          setIsRunning(false);

          const words = result.report.split(/\s+/);
          // ~30ms per word keeps the full report's reveal brisk.
          wordIntervalRef.current = setInterval(() => {
            setVisibleWords((prev) => {
              if (prev >= words.length) {
                if (wordIntervalRef.current) {
                  clearInterval(wordIntervalRef.current);
                  wordIntervalRef.current = null;
                }
                return prev;
              }
              return prev + 1;
            });
          }, 30);
        }, elapsed),
      );
    },
    [clearTimers],
  );

  const handleFile = useCallback(
    (file: File) => {
      clearTimers();
      setStageStatuses(Array(TOTAL_STAGES).fill("pending"));
      setActiveStatusLine(null);
      setVisibleWords(0);
      setIsRunning(false);
      setChatMessages([]);
      setChatInput("");
      setScreening((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return {
          file,
          previewUrl: URL.createObjectURL(file),
          result: null,
          notMatched: false,
          error: null,
        };
      });
      void startScreening(file);
    },
    [clearTimers, startScreening],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleReset = useCallback(() => {
    clearTimers();
    setScreening((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setStageStatuses(Array(TOTAL_STAGES).fill("pending"));
    setActiveStatusLine(null);
    setVisibleWords(0);
    setIsRunning(false);
    setChatMessages([]);
    setChatInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [clearTimers]);

  /* ---------------------------------------------------------------- */
  /* Derived                                                           */
/* ------------------------------------------------------------------ */

  const result = screening?.result ?? null;
  const words = result ? result.report.split(/\s+/) : [];
  const revealedWords = words.slice(0, visibleWords);
  const isStreaming = result !== null && visibleWords < words.length;
  const chatReady = result !== null && !isStreaming;

  /** Render markdown **bold** in a (possibly still-streaming) text chunk. */
  const renderBold = (text: string) => {
    const parts = text.split("**");
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i}>{part}</strong>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = chatInput.trim();
    if (!question || !result || chatBusy) return;

    const userMsg: ChatMessage = { role: "user", content: question };
    const history = chatMessages.map(({ role, content }) => ({
      role,
      content,
    }));

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatBusy(true);

    try {
      const res = await sendChat({
        question,
        report: result.report,
        dr_stage: result.dr_stage,
        dr_label: result.dr_label,
        referable: result.referable,
        confidence: result.confidence,
        history,
      });
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Could not reach the AI service. Please try again in a moment.",
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              RetinaScan AI — Demo Mode
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              New Screening
            </h1>
          </div>
          {screening && (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isRunning}
              className="nb-pop-hover cursor-pointer gap-2 rounded-none border-2 font-semibold"
            >
              <X className="size-4" />
              Reset
            </Button>
          )}
        </header>

        {/* Upload zone */}
        {!screening && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "nb-border flex min-h-[18rem] cursor-pointer flex-col items-center justify-center gap-4 p-8 text-center transition-colors",
              isDragging
                ? "border-primary bg-secondary/40"
                : "bg-card hover:bg-muted/40",
            )}
          >
            <div className="flex size-14 items-center justify-center border-2 bg-secondary">
              <Upload className="size-7" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">
                Drop a fundus image here
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                or click to browse — .png / .jpg / .jpeg
              </p>
            </div>
            <p className="nb-mono text-xs text-muted-foreground">
              Demo files: eyescan1 / eyescan2 / eyescan3
            </p>
          </div>
        )}

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

        {/* Active screening */}
        {screening && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column: image preview + pipeline */}
            <div className="flex flex-col gap-6">
              <div className="nb-border overflow-hidden bg-card">
                <div className="flex items-center justify-between gap-3 border-b-2 bg-muted px-4 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Uploaded Fundus Image
                  </span>
                  <span
                    className="nb-mono max-w-[14rem] truncate text-xs font-bold"
                    title={screening.file.name}
                  >
                    {screening.file.name}
                  </span>
                </div>
                <img
                  src={screening.previewUrl}
                  alt="Uploaded fundus"
                  className="max-h-64 w-full object-contain"
                />
              </div>

              {/* 6-stage pipeline — the one deliberate motion */}
              <div className="nb-border bg-card">
                <div className="border-b-2 bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Screening Pipeline
                </div>
                <ol className="flex flex-col">
                  {STAGES.map((stage, i) => {
                    const status = stageStatuses[i];
                    const Icon = stage.icon;
                    return (
                      <li
                        key={stage.id}
                        className={cn(
                          "flex items-center gap-3 border-b-2 px-4 py-3 transition-colors duration-300 last:border-b-0",
                          status === "pending" && "bg-card text-muted-foreground",
                          status === "active" && "bg-secondary text-secondary-foreground",
                          status === "complete" && "bg-card text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center border-2 transition-colors duration-300",
                            status === "pending" && "border-border bg-card",
                            status === "active" && "border-border bg-secondary-foreground text-secondary",
                            status === "complete" && "border-border bg-chart-2 text-card-foreground",
                          )}
                        >
                          {status === "complete" ? (
                            <Check className="size-4" />
                          ) : (
                            <Icon className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold tracking-tight">
                            {stage.label}
                          </div>
                          {status === "active" && activeStatusLine && (
                            <motion.div
                              key={activeStatusLine}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="nb-mono mt-0.5 truncate text-xs"
                            >
                              {activeStatusLine}
                            </motion.div>
                          )}
                        </div>
                        <span className="nb-mono text-xs">
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

            {/* Right column: diagnosis card + chat pane */}
            <div className="flex flex-col gap-6">
              {/* DiagnosisCard */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="nb-border nb-pop bg-card"
                  >
                    <div className="flex items-center justify-between border-b-2 bg-muted px-4 py-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Diagnosis
                      </span>
                      <span className="nb-mono text-xs text-muted-foreground">
                        {result.matched_key}
                        {result.via_fallback ? " · demo case" : ""}
                      </span>
                    </div>
                    <div className="flex flex-col gap-4 p-4">
                      <div className="flex flex-wrap items-center gap-3">
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
                      </div>

                      {/* Grad-CAM overlay over the uploaded preview */}
                      <div className="relative">
                        <img
                          src={screening.previewUrl}
                          alt="Fundus with Grad-CAM overlay"
                          className="max-h-48 w-full border-2 object-contain"
                        />
                        <img
                          src={`/assets/gradcam/${result.gradcam_image}`}
                          alt="Grad-CAM overlay"
                          className="pointer-events-none absolute inset-0 size-full object-contain opacity-60 mix-blend-screen"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Referral:{" "}
                        <span className="font-bold">
                          {result.referable ? "Refer to ophthalmology" : "Routine screening"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat pane — word-by-word report reveal */}
              <div className="nb-border flex max-h-[44rem] flex-col bg-card">
                <div className="flex items-center justify-between border-b-2 bg-muted px-4 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Screening Report
                  </span>
                  {result && (
                    <span className="nb-mono text-xs text-muted-foreground">
                      {result.report_source === "ai" ? "live model" : "template"}
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm leading-6">
                  {/* Echo the uploaded image name as the first response */}
                  <div className="flex justify-end">
                    <span
                      className="nb-mono max-w-[16rem] truncate border-2 bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground"
                      title={screening.file.name}
                    >
                      {screening.file.name}
                    </span>
                  </div>
                  {screening.error ? (
                    <div className="border-2 border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                      {screening.error}
                    </div>
                  ) : screening.notMatched ? (
                    <div className="border-2 border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                      No demo case configured for this file. Try one of:
                      <span className="nb-mono"> eyescan1 / eyescan2 / eyescan3</span>
                    </div>
                  ) : result ? (
                    <div
                      aria-live="polite"
                      className="whitespace-pre-wrap text-[13px] leading-6"
                    >
                      {renderBold(revealedWords.join(" "))}
                      {isStreaming && (
                        <span className="nb-mono animate-pulse">▌</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {isRunning
                        ? `Received ${screening.file.name} — running screening pipeline...`
                        : "Waiting for pipeline..."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Follow-up chat — appears after the report finishes streaming */}
        {chatReady && (
          <div className="nb-border bg-card">
            <div className="flex items-center justify-between border-b-2 bg-muted px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Follow-up Chat
              </span>
              {chatMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setChatMessages([])}
                  className="nb-mono cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                >
                  clear
                </button>
              )}
            </div>
            <div className="max-h-[20rem] space-y-3 overflow-y-auto p-4">
              {chatMessages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Ask a follow-up question about this screening — e.g. “Why is
                  this referable?” or “What does Grade 2 mean?”
                </p>
              )}
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <span
                    className={
                      m.role === "user"
                        ? "max-w-[80%] border-2 bg-secondary px-3 py-1.5 text-sm text-secondary-foreground"
                        : "max-w-[85%] border-2 bg-card px-3 py-1.5 text-sm"
                    }
                  >
                    {m.content}
                  </span>
                </div>
              ))}
              {chatBusy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  thinking...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form
              onSubmit={handleChatSubmit}
              className="flex items-center gap-2 border-t-2 bg-muted p-3"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask a follow-up question..."
                className="min-w-0 flex-1 border-2 bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
                disabled={chatBusy}
              />
              <Button
                type="submit"
                size="sm"
                disabled={chatBusy || !chatInput.trim()}
                className="cursor-pointer gap-1.5 rounded-none border-2 font-semibold"
              >
                <Send className="size-3.5" />
                Send
              </Button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
