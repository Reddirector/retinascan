import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  Activity,
  ArrowRight,
  Bot,
  BrainCircuit,
  FileSearch,
  ScanEye,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router";
import logoMark from "@/assets/logo.svg";
import { RetinaArt } from "@/components/graphics";

const DEMO_THUMBS = [
  { key: "eyescan1", stage: 0, label: "No DR", chip: "border-emerald-200 bg-emerald-50/90 text-emerald-700" },
  { key: "eyescan2", stage: 2, label: "Moderate", chip: "border-amber-200 bg-amber-50/90 text-amber-700" },
  { key: "eyescan3", stage: 4, label: "Proliferative", chip: "border-red-200 bg-red-50/90 text-red-700" },
];

const PIPELINE_PREVIEW = [
  { label: "Intake & Quality Gate", icon: ScanEye },
  { label: "Vision Model (DR Staging)", icon: BrainCircuit },
  { label: "Multi-Agent Reasoning", icon: Bot },
  { label: "Evidence Retrieval (RAG)", icon: FileSearch },
  { label: "Verification", icon: ShieldCheck },
  { label: "Clinical Delivery", icon: Send },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const ctaLabel = isAuthenticated ? "Open Dashboard" : "Get Started";
  const ctaTo = isAuthenticated ? "/dashboard" : "/auth";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative min-h-screen bg-background text-foreground"
    >
      {/* Ambient background — soft grid + drifting wave glows */}
      <div className="bg-grid-soft pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="bg-waves" aria-hidden />

      {/* Navbar */}
      <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex cursor-pointer items-center gap-2.5"
          >
            <img
              src={logoMark}
              alt="RetinaScan AI"
              className="size-9 rounded-lg"
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">RetinaScan</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                AI Fundus Screening
              </div>
            </div>
          </button>
          <Button
            type="button"
            onClick={() => navigate(ctaTo)}
            className="nb-pop-hover btn-grad cursor-pointer gap-2 font-semibold text-primary-foreground transition-[filter] hover:brightness-105 active:scale-[0.98]"
          >
            {ctaLabel}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <p className="nb-mono inline-flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
              <span className="size-1.5 rounded-full bg-blue-500" />
              AI-Assisted Diabetic Retinopathy Screening
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              A second read on
              <br />
              every fundus image —
              <br />
              <span className="text-primary">before the clinician decides.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
              RetinaScan runs every fundus image through a six-stage clinical
              pipeline — quality gating, vision-model staging, multi-agent
              reasoning, evidence retrieval, and verification — and hands the
              clinician a staged assessment with a Grad-CAM explanation and
              cited evidence. Every result waits for clinician confirmation:
              RetinaScan assists the read, it does not replace it.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                type="button"
                size="lg"
                onClick={() => navigate(ctaTo)}
                className="nb-pop-hover btn-grad cursor-pointer gap-2 text-base font-semibold text-primary-foreground transition-[filter] hover:brightness-105 active:scale-[0.98]"
              >
                {ctaLabel}
                <ArrowRight className="size-5" />
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="nb-pop-hover cursor-pointer gap-2 text-base font-semibold"
              >
                View Demo
              </Button>
            </div>
          </div>

          {/* Hero card: sample pipeline output with synthetic fundus */}
          <div className="glass nb-pop anim-rise relative rounded-2xl">
            <div className="flex items-center gap-2 rounded-t-2xl border-b bg-muted/50 px-4 py-3">
              <Activity className="size-4 text-primary" />
              <span className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Sample Result
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/90 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                Pending clinician review
              </span>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <div className="relative overflow-hidden rounded-xl border">
                <RetinaArt stage={2} className="h-40 w-full" />
                <RetinaArt
                  stage={2}
                  attention
                  className="anim-fade-slow absolute inset-0 h-full w-full"
                />
                <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                  Grad-CAM · AI attention
                </span>
                <span className="absolute bottom-2 right-2 rounded-full border border-amber-200 bg-amber-50/95 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Stage 2 — Moderate
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="nb-mono text-3xl font-semibold text-foreground">93%</span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  model confidence
                </span>
                <span className="ml-auto inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                  Refer to ophthalmology
                </span>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  Microaneurysms and scattered hemorrhages consistent with
                  moderate non-proliferative diabetic retinopathy. Referral to
                  an ophthalmologist is recommended within 3 months, pending
                  clinician sign-off.
                </p>
              </div>
              {/* Demo case thumbnails */}
              <div className="grid grid-cols-3 gap-2 border-t pt-4">
                {DEMO_THUMBS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => navigate(ctaTo)}
                    className="group cursor-pointer overflow-hidden rounded-lg border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <RetinaArt
                      stage={d.stage}
                      className="h-14 w-full transition-transform duration-300 group-hover:scale-105"
                    />
                    <span
                      className={`block border-t px-1 py-1 text-center text-[9px] font-semibold ${d.chip}`}
                    >
                      {d.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline stages */}
      <section className="relative z-10 border-b border-border/60 bg-sidebar/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Six stages, one deliberate motion
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Each screening lights up the pipeline stage by stage — from
            intake-quality gating to the final DiagnosisCard.
          </p>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PIPELINE_PREVIEW.map((stage, i) => (
              <li
                key={stage.label}
                className="panel nb-pop-hover anim-rise flex items-start gap-3 p-4 transition-all"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${[
                    "bg-violet-100 text-violet-600",
                    "bg-blue-100 text-blue-600",
                    "bg-cyan-100 text-cyan-600",
                    "bg-teal-100 text-teal-600",
                    "bg-emerald-100 text-emerald-600",
                    "bg-indigo-100 text-indigo-600",
                  ][i]}`}
                >
                  <stage.icon className="size-4" />
                </span>
                <div>
                  <div className="nb-mono text-xs text-muted-foreground">
                    Stage {i + 1}
                  </div>
                  <div className="text-sm font-semibold tracking-tight">
                    {stage.label}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to run a screening?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Demo cases eyescan1, eyescan2, and eyescan3 cover the full range —
            no DR, moderate, and proliferative.
          </p>
          <Button
            type="button"
            size="lg"
            onClick={() => navigate(ctaTo)}
            className="nb-pop-hover btn-grad mt-8 cursor-pointer gap-2 text-base font-semibold text-primary-foreground transition-[filter] hover:brightness-105 active:scale-[0.98]"
          >
            {ctaLabel}
            <ArrowRight className="size-5" />
          </Button>
        </div>
      </section>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>RetinaScan AI — demo build</span>
          <span className="nb-mono">demo pipeline · not a medical device</span>
        </div>
      </footer>
    </motion.div>
  );
}
