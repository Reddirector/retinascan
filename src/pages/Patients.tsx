import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import {
  Activity,
  CalendarClock,
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  Download,
  Eye,
  FileText,
  Filter,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { CountUp } from "@/components/premium";
import { ProgressionChart, Sparkline } from "@/components/graphics";
import {
  PATIENTS,
  DR_LABELS,
  type Patient,
} from "@/lib/clinicData";
import { cn } from "@/lib/utils";

type ReferralFilter = "all" | "refer" | "follow-up" | "routine";

/** Badge classes for DR stage labels used across tables. */
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

function ReferralBadge({ status }: { status: Patient["referralStatus"] }) {
  const cls =
    status === "Refer"
      ? "border-red-200 bg-red-50 text-red-700"
      : status === "Follow-up"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        cls,
      )}
    >
      {status}
    </span>
  );
}

export default function Patients() {
  const [query, setQuery] = useState("");
  const [referralFilter, setReferralFilter] = useState<ReferralFilter>("all");
  const [stageFilter, setStageFilter] = useState<"all" | number>("all");
  const [sortBy, setSortBy] = useState<"name" | "lastScreening" | "stage" | "confidence">("lastScreening");
  const [selected, setSelected] = useState<Patient | null>(null);

  const filtered = useMemo(() => {
    let rows = [...PATIENTS];

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.mrn.toLowerCase().includes(q),
      );
    }
    if (referralFilter !== "all") {
      rows = rows.filter((p) => p.referralStatus.toLowerCase() === referralFilter);
    }
    if (stageFilter !== "all") {
      rows = rows.filter((p) => p.drStage === stageFilter);
    }

    rows.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "stage":
          return b.drStage - a.drStage;
        case "confidence":
          return b.confidence - a.confidence;
        default:
          return a.lastScreeningDaysAgo - b.lastScreeningDaysAgo;
      }
    });

    return rows;
  }, [query, referralFilter, stageFilter, sortBy]);

  const stats = useMemo(() => {
    const today = PATIENTS.filter((p) => p.lastScreeningDaysAgo <= 2).length;
    const followUp = PATIENTS.filter((p) => p.referralStatus === "Follow-up").length;
    const referable = PATIENTS.filter((p) => p.referable).length;
    return { total: PATIENTS.length, today, followUp, referable };
  }, []);

  const screeningsNewestFirst = (p: Patient) =>
    [...p.screenings].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

  if (selected) {
    return (
      <PatientProfile
        patient={selected}
        onBack={() => setSelected(null)}
        screeningsNewestFirst={screeningsNewestFirst}
      />
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Patients"
          subtitle="Manage patient screening records and longitudinal retinal history."
        >
          <button
            type="button"
            className="btn-grad inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <Plus className="size-4" />
            Add Patient
          </button>
        </PageHeader>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Users}
            iconClass="bg-blue-100 text-blue-600"
            cardClass="tint-blue"
            label="Total Patients"
            value={stats.total}
          />
          <SummaryCard
            icon={CalendarClock}
            iconClass="bg-teal-100 text-teal-600"
            cardClass="tint-teal"
            label="Screened Today"
            value={stats.today}
          />
          <SummaryCard
            icon={Activity}
            iconClass="bg-amber-100 text-amber-600"
            cardClass="tint-amber"
            label="Follow-up Required"
            value={stats.followUp}
          />
          <SummaryCard
            icon={CircleAlert}
            iconClass="bg-rose-100 text-rose-600"
            cardClass="tint-rose"
            label="Referable DR"
            value={stats.referable}
          />
        </div>

        {/* Search / filter / sort */}
        <div className="panel flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patients by name, ID or MRN…"
              className="w-full rounded-lg border bg-muted/40 py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-blue-300 focus:bg-card"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground" />
            <select
              value={referralFilter}
              onChange={(e) => setReferralFilter(e.target.value as ReferralFilter)}
              className="cursor-pointer rounded-lg border bg-card px-2.5 py-2 text-xs font-medium text-foreground outline-none"
              aria-label="Filter by referral status"
            >
              <option value="all">All referrals</option>
              <option value="refer">Refer</option>
              <option value="follow-up">Follow-up</option>
              <option value="routine">Routine</option>
            </select>
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
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="cursor-pointer rounded-lg border bg-card px-2.5 py-2 text-xs font-medium text-foreground outline-none"
              aria-label="Sort patients"
            >
              <option value="lastScreening">Sort: Last screening</option>
              <option value="name">Sort: Name</option>
              <option value="stage">Sort: DR stage</option>
              <option value="confidence">Sort: Confidence</option>
            </select>
          </div>
        </div>

        {/* Patient table */}
        <div className="panel overflow-hidden nb-pop">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Patient ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Age</th>
                  <th className="px-4 py-3 font-medium">Last Screening</th>
                  <th className="px-4 py-3 font-medium">Eye</th>
                  <th className="px-4 py-3 font-medium">DR Stage</th>
                  <th className="px-4 py-3 font-medium">Confidence</th>
                  <th className="px-4 py-3 font-medium">Referral</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer border-b transition-all duration-200 last:border-b-0 hover:bg-muted/40 hover:pl-1"
                    onClick={() => setSelected(p)}
                  >
                    <td className="nb-mono px-4 py-3 text-xs text-muted-foreground">
                      {p.id}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.age}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.lastScreening}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.eye === "Right Eye (OD)" ? "Right (OD)" : "Left (OS)"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                          drStageBadge(p.drStage),
                        )}
                      >
                        Stage {p.drStage} · {DR_LABELS[p.drStage]}
                      </span>
                    </td>
                    <td className="nb-mono px-4 py-3 font-medium">{p.confidence}%</td>
                    <td className="px-4 py-3">
                      <ReferralBadge status={p.referralStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(p);
                        }}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Eye className="size-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No patients match the current search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  icon: Icon,
  iconClass,
  cardClass,
  label,
  value,
}: {
  icon: typeof Users;
  iconClass: string;
  cardClass?: string;
  label: string;
  value: number;
}) {
  return (
    <div className={cn("panel nb-pop nb-pop-hover p-5", cardClass)}>
      <div className="flex items-center justify-between">
        <span className={cn("flex size-9 items-center justify-center rounded-lg", iconClass)}>
          <Icon className="size-4.5" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        <CountUp value={value} duration={800} />
      </div>
      <div className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Patient profile                                                     */
/* ------------------------------------------------------------------ */

function PatientProfile({
  patient,
  onBack,
  screeningsNewestFirst,
}: {
  patient: Patient;
  onBack: () => void;
  screeningsNewestFirst: (p: Patient) => Patient["screenings"];
}) {
  const screenings = screeningsNewestFirst(patient);

  return (
    <AppShell>
      <div className="space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to Patients
        </button>

        {/* Header card */}
        <div className="panel nb-pop p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary">
                {patient.name.charAt(0)}
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  {patient.name}
                </h1>
                <p className="nb-mono mt-0.5 text-xs text-muted-foreground">
                  {patient.id} · {patient.mrn}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
                  drStageBadge(patient.drStage),
                )}
              >
                Stage {patient.drStage} — {DR_LABELS[patient.drStage]}
              </span>
              <ReferralBadge status={patient.referralStatus} />
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Download className="size-3.5" />
                Export Record
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Demographics & diabetes history */}
          <section className="panel p-5">
            <h2 className="text-sm font-semibold text-foreground">Patient Demographics</h2>
            <dl className="mt-4 space-y-3 text-[13px]">
              <Row label="Age" value={`${patient.age} years`} />
              <Row label="Sex" value={patient.sex} />
              <Row label="Phone" value={patient.phone} />
              <Row label="MRN" value={patient.mrn} mono />
            </dl>
            <h2 className="mt-6 text-sm font-semibold text-foreground">Diabetes History</h2>
            <dl className="mt-4 space-y-3 text-[13px]">
              <Row label="Type" value={patient.diabetesType} />
              <Row label="Duration" value={patient.diabetesDuration} />
              <Row label="HbA1c" value={patient.hba1c} mono />
            </dl>
          </section>

          {/* Previous AI predictions / confidence history */}
          <section className="panel p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Previous AI Predictions
            </h2>
            <div className="mt-4 space-y-3">
              {screenings.map((s, i) => (
                <div
                  key={`${s.date}-${i}`}
                  className="rounded-lg border bg-muted/30 p-3 text-[13px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{s.date}</span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        drStageBadge(s.drStage),
                      )}
                    >
                      Stage {s.drStage} · {DR_LABELS[s.drStage]}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-700"
                        style={{ width: `${s.confidence}%` }}
                      />
                    </div>
                    <span className="nb-mono text-[10px] text-muted-foreground">
                      {s.confidence}%
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{s.eye}</span>
                    <span>
                      {s.status}
                      {s.clinician ? ` · ${s.clinician}` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Clinical notes + referral history */}
          <section className="panel p-5">
            <h2 className="text-sm font-semibold text-foreground">Clinical Notes</h2>
            <ul className="mt-4 space-y-3">
              {patient.clinicalNotes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Stethoscope className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
                  {note}
                </li>
              ))}
            </ul>
            <h2 className="mt-6 text-sm font-semibold text-foreground">Referral History</h2>
            <ul className="mt-4 space-y-3 text-[13px]">
              {screenings.some((s) => s.referable) ? (
                screenings
                  .filter((s) => s.referable)
                  .map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                      <span className="text-muted-foreground">
                        {s.date} — referral issued ({DR_LABELS[s.drStage]},{" "}
                        {s.confidence}% confidence)
                      </span>
                    </li>
                  ))
              ) : (
                <li className="flex items-start gap-2">
                  <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  <span className="text-muted-foreground">
                    No referrals required — routine screening maintained.
                  </span>
                </li>
              )}
            </ul>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <FileText className="size-3.5" />
                View Reports
              </button>
              <button
                type="button"
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ShieldCheck className="size-3.5" />
                Verified
              </button>
            </div>
          </section>
        </div>          {/* DR progression timeline */}
          <section className="panel nb-pop p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">DR Progression</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Longitudinal staging across previous screenings (oldest → latest).
                </p>
              </div>
              {screenings.length >= 2 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                  <Activity className="size-3" />
                  Trend
                </span>
              )}
            </div>
            {screenings.length >= 2 && (
              <div className="mt-4 rounded-lg border bg-gradient-to-br from-blue-50/60 to-teal-50/40 p-3">
                <ProgressionChart
                  points={[...screenings]
                    .reverse()
                    .map((s) => ({ label: s.date.split(",")[0], stage: s.drStage }))}
                />
              </div>
            )}
            <div className="mt-6 flex items-stretch">
            {[...screenings].reverse().map((s, i, arr) => (
              <div key={`${s.date}-tl`} className="flex flex-1 items-start">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border-2 bg-card text-[11px] font-bold",
                      s.drStage === 0
                        ? "border-emerald-400 text-emerald-600"
                        : s.drStage === 1
                          ? "border-teal-400 text-teal-600"
                          : s.drStage === 2
                            ? "border-amber-400 text-amber-600"
                            : s.drStage === 3
                              ? "border-orange-400 text-orange-600"
                              : "border-red-400 text-red-600",
                    )}
                  >
                    {s.drStage}
                  </span>
                  <span className="mt-2 text-center text-[11px] font-medium text-foreground">
                    {s.date}
                  </span>
                  <span className="text-center text-[10px] text-muted-foreground">
                    {DR_LABELS[s.drStage]}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className="mx-1 mt-[18px] h-0.5 flex-1 overflow-hidden rounded-full bg-border">
                    <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-200 to-teal-200 transition-all duration-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
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
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium text-foreground", mono && "nb-mono text-xs")}>
        {value}
      </dd>
    </div>
  );
}
