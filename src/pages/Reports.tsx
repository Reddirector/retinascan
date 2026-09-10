import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CountUp, Tooltip } from "@/components/premium";
import { REPORTS, DR_LABELS, type ReportRecord } from "@/lib/clinicData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type VerificationFilter = "all" | "Pending Review" | "Clinician Verified" | "Archived";
type ReferralFilter = "all" | "refer" | "no-referral";

function drStageBadge(stage: number) {
  switch (stage) {
    case 0:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case 1:
      return "border-teal-200 bg-teal-50 text-teal-700";
    case 2:
      return "border-amber-200 bg-amber-50 text-amber-700";
    case 3:
      return "border-orange-200 bg-orange-50 text-orange-700";
    case 4:
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function VerificationBadge({ status }: { status: ReportRecord["verification"] }) {
  const map = {
    "Pending Review": {
      cls: "border-amber-200 bg-amber-50 text-amber-700",
      icon: Clock,
    },
    "Clinician Verified": {
      cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: ShieldCheck,
    },
    Archived: {
      cls: "border-slate-200 bg-slate-50 text-slate-500",
      icon: Archive,
    },
  } as const;
  const { cls, icon: Icon } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        cls,
      )}
    >
      <Icon className="size-3" />
      {status}
    </span>
  );
}

export default function Reports() {
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | number>("all");
  const [referralFilter, setReferralFilter] = useState<ReferralFilter>("all");
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>("all");
  const [clinicianFilter, setClinicianFilter] = useState("all");
  const [patientFilter, setPatientFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string>(REPORTS[0]?.id ?? "");

  const clinicians = useMemo(
    () =>
      Array.from(
        new Set(REPORTS.map((r) => r.clinician).filter((c) => c !== "—")),
      ),
    [],
  );
  const patients = useMemo(
    () => Array.from(new Set(REPORTS.map((r) => r.patientName))),
    [],
  );

  const filtered = useMemo(() => {
    let rows = [...REPORTS];

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.patientName.toLowerCase().includes(q) ||
          r.patientId.toLowerCase().includes(q),
      );
    }
    if (stageFilter !== "all") rows = rows.filter((r) => r.drStage === stageFilter);
    if (referralFilter !== "all") {
      rows = rows.filter((r) =>
        referralFilter === "refer" ? r.referable : !r.referable,
      );
    }
    if (verificationFilter !== "all") {
      rows = rows.filter((r) => r.verification === verificationFilter);
    }
    if (clinicianFilter !== "all") {
      rows = rows.filter((r) => r.clinician === clinicianFilter);
    }
    if (patientFilter !== "all") {
      rows = rows.filter((r) => r.patientName === patientFilter);
    }

    return rows;
  }, [query, stageFilter, referralFilter, verificationFilter, clinicianFilter, patientFilter]);

  const stats = useMemo(
    () => ({
      total: REPORTS.length,
      pending: REPORTS.filter((r) => r.verification === "Pending Review").length,
      verified: REPORTS.filter((r) => r.verification === "Clinician Verified").length,
      referral: REPORTS.filter((r) => r.referable).length,
    }),
    [],
  );

  const selected = REPORTS.find((r) => r.id === selectedId) ?? null;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          subtitle="Review, generate and manage AI-assisted retinal screening reports."
        >
          <button
            type="button"
            onClick={() =>
              toast.success("Report generated", {
                description: "A new AI screening report has been created.",
              })
            }
            className="btn-grad inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <FileText className="size-4" />
            Generate Report
          </button>
        </PageHeader>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={FileText}
            iconClass="bg-blue-100 text-blue-600"
            cardClass="tint-blue"
            label="Reports Generated"
            value={stats.total}
          />
          <SummaryCard
            icon={Clock}
            iconClass="bg-amber-100 text-amber-600"
            cardClass="tint-amber"
            label="Pending Review"
            value={stats.pending}
          />
          <SummaryCard
            icon={ShieldCheck}
            iconClass="bg-emerald-100 text-emerald-600"
            cardClass="tint-emerald"
            label="Clinician Verified"
            value={stats.verified}
          />
          <SummaryCard
            icon={Send}
            iconClass="bg-rose-100 text-rose-600"
            cardClass="tint-rose"
            label="Referral Reports"
            value={stats.referral}
          />
        </div>

        {/* Filters */}
        <div className="panel flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reports by ID, patient…"
              className="w-full rounded-lg border bg-muted/40 py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-blue-300 focus:bg-card"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground" />
            <select
              value={String(stageFilter)}
              onChange={(e) =>
                setStageFilter(e.target.value === "all" ? "all" : Number(e.target.value))
              }
              className="cursor-pointer rounded-lg border bg-card px-2.5 py-2 text-xs font-medium text-foreground outline-none"
              aria-label="Filter by DR stage"
            >
              <option value="all">All DR stages</option>
              {[0, 1, 2, 3, 4].map((s) => (
                <option key={s} value={s}>
                  {DR_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={referralFilter}
              onChange={(e) => setReferralFilter(e.target.value as ReferralFilter)}
              className="cursor-pointer rounded-lg border bg-card px-2.5 py-2 text-xs font-medium text-foreground outline-none"
              aria-label="Filter by referral"
            >
              <option value="all">All referrals</option>
              <option value="refer">Referral</option>
              <option value="no-referral">No referral</option>
            </select>
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value as VerificationFilter)}
              className="cursor-pointer rounded-lg border bg-card px-2.5 py-2 text-xs font-medium text-foreground outline-none"
              aria-label="Filter by verification"
            >
              <option value="all">All verification</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Clinician Verified">Clinician Verified</option>
              <option value="Archived">Archived</option>
            </select>
            <select
              value={clinicianFilter}
              onChange={(e) => setClinicianFilter(e.target.value)}
              className="cursor-pointer rounded-lg border bg-card px-2.5 py-2 text-xs font-medium text-foreground outline-none"
              aria-label="Filter by clinician"
            >
              <option value="all">All clinicians</option>
              {clinicians.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              className="cursor-pointer rounded-lg border bg-card px-2.5 py-2 text-xs font-medium text-foreground outline-none"
              aria-label="Filter by patient"
            >
              <option value="all">All patients</option>
              {patients.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table + preview */}
        <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
          <div className="panel overflow-hidden nb-pop">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Report ID</th>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">DR Stage</th>
                    <th className="px-4 py-3 font-medium">Confidence</th>
                    <th className="px-4 py-3 font-medium">Verification</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "anim-rise cursor-pointer border-b transition-colors duration-200 last:border-b-0 hover:bg-muted/40",
                        selectedId === r.id && "bg-blue-50/50",
                      )}
                      style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}
                      onClick={() => setSelectedId(r.id)}
                    >
                      <td className="nb-mono px-4 py-3 text-xs font-medium text-foreground">
                        {r.id}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {r.patientName}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.date}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                            drStageBadge(r.drStage),
                          )}
                        >
                          Stage {r.drStage} · {DR_LABELS[r.drStage]}
                        </span>
                      </td>
                      <td className="nb-mono px-4 py-3 font-medium">{r.confidence}%</td>
                      <td className="px-4 py-3">
                        <VerificationBadge status={r.verification} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <IconButton
                            label="View"
                            onClick={() => setSelectedId(r.id)}
                          >
                            <Eye className="size-3.5" />
                          </IconButton>
                          <IconButton
                            label="Download"
                            onClick={() =>
                              toast.success(`Report ${r.id} downloaded`, {
                                description: "PDF exported to your downloads folder.",
                              })
                            }
                          >
                            <Download className="size-3.5" />
                          </IconButton>
                          <IconButton
                            label="Share"
                            onClick={() =>
                              toast.success(`Share link copied for ${r.id}`, {
                                description: "Secure link expires in 7 days.",
                              })
                            }
                          >
                            <Send className="size-3.5" />
                          </IconButton>
                          <IconButton
                            label="Archive"
                            onClick={() =>
                              toast(`Report ${r.id} archived`, {
                                description: "Restore it anytime from Archived filters.",
                              })
                            }
                          >
                            <Archive className="size-3.5" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-sm text-muted-foreground"
                      >
                        No reports match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed report preview */}
          {selected && (
            <aside>
              <div className="panel nb-pop sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
                <ReportPreview key={selected.id} report={selected} />
              </div>
            </aside>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-90"
      >
        {children}
      </button>
    </Tooltip>
  );
}

function SummaryCard({
  icon: Icon,
  iconClass,
  cardClass,
  label,
  value,
}: {
  icon: typeof FileText;
  iconClass: string;
  cardClass?: string;
  label: string;
  value: number;
}) {
  return (
    <div className={cn("panel nb-pop nb-pop-hover p-5", cardClass)}>
      <span className={cn("flex size-9 items-center justify-center rounded-lg", iconClass)}>
        <Icon className="size-4.5" />
      </span>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        <CountUp value={value} duration={800} />
      </div>
      <div className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Report preview panel                                                */
/* ------------------------------------------------------------------ */

function ReportPreview({ report }: { report: ReportRecord }) {
  return (
    <div className="anim-rise p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          RetinaScan AI
        </span>
        <span className="nb-mono text-[10px] text-muted-foreground">{report.id}</span>
      </div>
      <h2 className="mt-1 text-base font-semibold tracking-tight text-foreground">
        Diabetic Retinopathy Screening Report
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Generated {report.generatedAt}
      </p>

      <Section title="Patient Information">
        <Row label="Name" value={report.patientName} />
        <Row label="Patient ID" value={report.patientId} mono />
        <Row label="Screening Date" value={report.date} />
      </Section>

      <Section title="AI Assessment">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
              drStageBadge(report.drStage),
            )}
          >
            Stage {report.drStage} — {DR_LABELS[report.drStage]}
          </span>
          <span className="nb-mono text-sm font-semibold text-foreground">
            {report.confidence}%
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              report.referable
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            )}
          >
            {report.referable ? "Referral" : "No referral"}
          </span>
        </div>
      </Section>

      <Section title="Detected Findings">
        <ul className="space-y-1.5">
          {report.findings.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13px] text-muted-foreground">
              <CheckCircle2
                className={cn(
                  "mt-0.5 size-3.5 shrink-0",
                  f.toLowerCase().startsWith("no") ? "text-emerald-500" : "text-amber-500",
                )}
              />
              {f}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Grad-CAM Explainability">
        <div className="rounded-lg border bg-slate-50 p-3 text-xs text-muted-foreground">
          Grad-CAM attention regions overlaid on the fundus image; salient regions
          correspond to detected lesion locations.
        </div>
      </Section>

      <Section title="Evidence & RAG Sources">
        <ul className="space-y-2">
          {report.evidence.map((src) => (
            <li key={src.title} className="rounded-lg border bg-muted/30 p-2.5">
              <div className="text-[12px] font-medium text-foreground">{src.title}</div>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="rounded-full border bg-card px-1.5 py-0.5">{src.type}</span>
                <span className="nb-mono">{src.ref}</span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${Math.round(src.relevance * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Verification Status">
        <VerificationBadge status={report.verification} />
        {report.clinician !== "—" && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Confirmed by {report.clinician}
          </p>
        )}
      </Section>

      <Section title="Clinical Recommendation">
        <p className="text-[13px] leading-relaxed text-foreground">
          {report.recommendation}
        </p>
      </Section>

      <Section title="Model & Protocol">
        <Row label="Model Version" value="effnet-b0-dr · 2025-06" mono />
        <Row label="Protocol Version" value="v2.4.1" mono />
        <Row label="Timestamp" value={report.generatedAt} mono />
      </Section>

      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="size-3.5" />
          Clinician Confirmation
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-emerald-700/80">
          {report.verification === "Clinician Verified"
            ? `Reviewed and verified by ${report.clinician}.`
            : "Awaiting clinician review and sign-off."}
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() =>
            toast.success("Report regenerated", {
              description: "AI assessment refreshed with the latest model version.",
            })
          }
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Sparkles className="size-3.5" />
          Regenerate
        </button>
        <button
          type="button"
          onClick={() =>
            toast.success(`Report ${report.id} downloaded`, {
              description: "PDF exported to your downloads folder.",
            })
          }
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Download className="size-3.5" />
          Download PDF
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-foreground", mono && "nb-mono text-xs")}>
        {value}
      </span>
    </div>
  );
}
