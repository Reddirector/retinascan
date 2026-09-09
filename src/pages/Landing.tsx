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
      className="min-h-screen bg-background text-foreground"
    >
      {/* Navbar */}
      <header className="border-b-2 bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex cursor-pointer items-center gap-2"
          >
            <div className="flex size-9 items-center justify-center border-2 bg-primary text-primary-foreground">
              <ScanEye className="size-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">RetinaScan</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                AI Fundus Screening
              </div>
            </div>
          </button>
          <Button
            type="button"
            onClick={() => navigate(ctaTo)}
            className="nb-pop-hover cursor-pointer gap-2 rounded-none border-2 font-semibold"
          >
            {ctaLabel}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b-2">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <p className="nb-mono inline-block border-2 bg-secondary px-2 py-1 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
              Diabetic Retinopathy Screening
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Fundus images in.
              <br />
              Staged, explainable
              <br />
              DR diagnosis out.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
              RetinaScan AI runs every fundus image through a six-stage
              clinical pipeline — quality gating, vision-model staging,
              multi-agent reasoning, evidence retrieval, verification, and
              delivery — and returns a staged diagnosis with a Grad-CAM
              heatmap and a written explanation.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                type="button"
                size="lg"
                onClick={() => navigate(ctaTo)}
                className="nb-pop-hover cursor-pointer gap-2 rounded-none border-2 text-base font-bold"
              >
                {ctaLabel}
                <ArrowRight className="size-5" />
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="nb-pop-hover cursor-pointer gap-2 rounded-none border-2 text-base font-bold"
              >
                View Demo
              </Button>
            </div>
          </div>

          {/* Hero card: what a DiagnosisCard looks like */}
          <div className="nb-border nb-pop bg-card">
            <div className="flex items-center gap-2 border-b-2 bg-secondary px-4 py-3 text-secondary-foreground">
              <Activity className="size-4" />
              <span className="text-sm font-bold uppercase tracking-wide">
                Sample Output
              </span>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-block border-2 bg-chart-3 px-2 py-1 text-xs font-bold uppercase tracking-wide text-card-foreground">
                  Stage 2 — Moderate
                </span>
                <span className="nb-mono text-3xl font-bold">93%</span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  confidence
                </span>
              </div>
              <div className="border-2 bg-muted p-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  Microaneurysms and scattered hemorrhages consistent with
                  moderate non-proliferative diabetic retinopathy. Referral to
                  an ophthalmologist is recommended within 3 months.
                </p>
              </div>
              <div className="flex items-center justify-between border-t-2 pt-4 text-xs">
                <span className="text-muted-foreground">
                  Referral:{" "}
                  <span className="font-bold text-foreground">Refer</span>
                </span>
                <span className="nb-mono text-muted-foreground">
                  pipeline: 6 stages
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline stages */}
      <section className="border-b-2 bg-sidebar">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
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
                className="nb-border nb-pop-hover flex items-start gap-3 bg-card p-4"
              >
                <span className="flex size-9 shrink-0 items-center justify-center border-2 bg-secondary text-secondary-foreground">
                  <stage.icon className="size-4" />
                </span>
                <div>
                  <div className="nb-mono text-xs text-muted-foreground">
                    Stage {i + 1}
                  </div>
                  <div className="text-sm font-bold tracking-tight">
                    {stage.label}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
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
            className="nb-pop-hover mt-8 cursor-pointer gap-2 rounded-none border-2 text-base font-bold"
          >
            {ctaLabel}
            <ArrowRight className="size-5" />
          </Button>
        </div>
      </section>

      <footer className="border-t-2 bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>RetinaScan AI — demo build</span>
          <span className="nb-mono">demo pipeline · not a medical device</span>
        </div>
      </footer>
    </motion.div>
  );
}
