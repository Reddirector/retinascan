import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ServiceHealth } from "@/components/premium";
import {
  Bell,
  BrainCircuit,
  Building2,
  Check,
  Database,
  FileClock,
  FlaskConical,
  Globe,
  KeyRound,
  Languages,
  Library,
  ListChecks,
  Lock,
  Palette,
  RefreshCw,
  ScrollText,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SectionId =
  | "general"
  | "ai-models"
  | "rag"
  | "notifications"
  | "security"
  | "users"
  | "protocol"
  | "system";

const SECTIONS: {
  id: SectionId;
  label: string;
  icon: typeof Settings2;
  activeCls: string;
}[] = [
  {
    id: "general",
    label: "General",
    icon: Settings2,
    activeCls: "bg-blue-50 text-blue-700",
  },
  {
    id: "ai-models",
    label: "AI Models",
    icon: BrainCircuit,
    activeCls: "bg-violet-50 text-violet-700",
  },
  {
    id: "rag",
    label: "RAG & Knowledge",
    icon: Library,
    activeCls: "bg-teal-50 text-teal-700",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    activeCls: "bg-amber-50 text-amber-700",
  },
  {
    id: "security",
    label: "Security & Privacy",
    icon: Lock,
    activeCls: "bg-emerald-50 text-emerald-700",
  },
  {
    id: "users",
    label: "Users & Roles",
    icon: Users,
    activeCls: "bg-cyan-50 text-cyan-700",
  },
  {
    id: "protocol",
    label: "Clinical Protocol",
    icon: ListChecks,
    activeCls: "bg-indigo-50 text-indigo-700",
  },
  {
    id: "system",
    label: "System",
    icon: Server,
    activeCls: "bg-rose-50 text-rose-700",
  },
];

export default function Settings() {
  const [section, setSection] = useState<SectionId>("general");

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          subtitle="Configure RetinaScan AI, security and clinical workflow preferences."
        />

        <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
          {/* Settings navigation */}
          <nav className="panel h-fit p-2 lg:sticky lg:top-24">
            {SECTIONS.map((s) => {
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors",
                    active
                      ? s.activeCls
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <s.icon className="size-4" />
                  {s.label}
                </button>
              );
            })}
          </nav>

          {/* Section content */}
          <div className="min-w-0 space-y-6">
            {section === "general" && <GeneralSection />}
            {section === "ai-models" && <AiModelsSection />}
            {section === "rag" && <RagSection />}
            {section === "notifications" && <NotificationsSection />}
            {section === "security" && <SecuritySection />}
            {section === "users" && <UsersSection />}
            {section === "protocol" && <ProtocolSection />}
            {section === "system" && <SystemSection />}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Shared building blocks                                              */
/* ------------------------------------------------------------------ */

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel nb-pop p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div>
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function EnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-500",
      )}
    >
      {enabled ? <Check className="size-3" /> : null}
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

function OnlineDot() {
  return <span className="size-1.5 rounded-full bg-emerald-500" />;
}

function SwitchToggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      className={cn(
        "relative h-5 w-9 cursor-pointer rounded-full border transition-colors",
        on ? "border-blue-200 bg-blue-600" : "border-border bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-all",
          on ? "left-[calc(100%-1.125rem)]" : "left-0.5",
        )}
      />
    </button>
  );
}

function TextInput({
  value,
  onChange,
  width = "w-56",
}: {
  value: string;
  onChange: (v: string) => void;
  width?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-lg border bg-muted/40 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-blue-300 focus:bg-card",
        width,
      )}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function SaveBar({ onSave, onDiscard }: { onSave?: () => void; onDiscard?: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t pt-4">
      <button
        type="button"
        onClick={onDiscard}
        className="cursor-pointer rounded-lg border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        Discard
      </button>
      <button
        type="button"
        onClick={onSave}
        className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Save Changes
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function GeneralSection() {
  const [appName, setAppName] = useState(() => localStorage.getItem("rs.appName") ?? "RetinaScan AI");
  const [language, setLanguage] = useState(() => localStorage.getItem("rs.language") ?? "English");
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem("rs.dateFormat") ?? "DD-MM-YYYY");
  const [theme, setTheme] = useState(() => localStorage.getItem("rs.theme") ?? "Light");
  const [dashboard, setDashboard] = useState(() => localStorage.getItem("rs.defaultDashboard") ?? "New Screening");
  const applyTheme = (value: string) => {
    const root = document.documentElement;
    root.classList.toggle("dark", value === "Dark" || (value === "System" && window.matchMedia("(prefers-color-scheme: dark)").matches));
    root.classList.toggle("high-contrast", value === "High Contrast");
  };

  useEffect(() => applyTheme(theme), [theme]);
  const save = () => {
    localStorage.setItem("rs.appName", appName);
    localStorage.setItem("rs.language", language);
    localStorage.setItem("rs.dateFormat", dateFormat);
    localStorage.setItem("rs.theme", theme);
    localStorage.setItem("rs.defaultDashboard", dashboard);
    applyTheme(theme);
    window.dispatchEvent(new Event("rs-preferences"));
    toast.success("Preferences saved", { description: "Your display and workspace preferences will be used on future visits." });
  };

  return (
    <Card title="General" description="Core application preferences.">
      <div className="space-y-1">
        <SettingRow label="Application name">
          <TextInput value={appName} onChange={setAppName} />
        </SettingRow>
        <SettingRow label="Language" hint="Interface language for all users.">
          <span className="inline-flex items-center gap-2">
            <Languages className="size-3.5 text-muted-foreground" />
            <SelectInput
              value={language}
              onChange={setLanguage}
              options={["English", "English (UK)", "Dutch", "French", "Hindi"]}
            />
          </span>
        </SettingRow>
        <SettingRow label="Date format">
          <SelectInput
            value={dateFormat}
            onChange={setDateFormat}
            options={["DD-MM-YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]}
          />
        </SettingRow>
        <SettingRow label="Theme">
          <span className="inline-flex items-center gap-2">
            <Palette className="size-3.5 text-muted-foreground" />
            <SelectInput
              value={theme}
              onChange={setTheme}
              options={["Light", "Dark", "System", "High Contrast"]}
            />
          </span>
        </SettingRow>
        <SettingRow label="Default dashboard">
          <span className="inline-flex items-center gap-2">
            <Globe className="size-3.5 text-muted-foreground" />
            <SelectInput
              value={dashboard}
              onChange={setDashboard}
              options={["New Screening", "Screening History", "Patients", "Reports"]}
            />
          </span>
        </SettingRow>
        <SettingRow label="Email digests" hint="Weekly screening activity summary.">
          <SwitchToggle defaultOn />
        </SettingRow>
      </div>
      <div className="mt-4">
        <SaveBar onSave={save} onDiscard={() => window.location.reload()} />
      </div>
    </Card>
  );
}

const MODELS = [
  {
    name: "DR Vision Model",
    desc: "Fundus-level diabetic retinopathy grading (EfficientNet-B0 backbone).",
    version: "effnet-b0-dr · 2025-06",
    provider: "Self-hosted · SGLang runtime",
    accuracy: "94.2% accuracy · AUC 0.971",
    updated: "Jun 12, 2025",
  },
  {
    name: "Retinal Explanation Model",
    desc: "Grad-CAM lesion localization and attention heatmap generation.",
    version: "gradcam-v3 · 2025-05",
    provider: "Self-hosted · PyTorch",
    accuracy: "IoU 0.82 vs. expert masks",
    updated: "May 28, 2025",
  },
  {
    name: "Reasoning Model",
    desc: "Multi-agent staging rationale, verification and report drafting.",
    version: "reasoner-8b · v2.4",
    provider: "Managed API",
    accuracy: "98.1% criteria adherence",
    updated: "Jun 30, 2025",
  },
];

function AiModelsSection() {
  return (
    <div className="space-y-6">
      {MODELS.map((m) => (
        <Card key={m.name} title={m.name} description={m.desc}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                  <OnlineDot />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Model version</span>
                <span className="nb-mono text-xs font-medium text-foreground">
                  {m.version}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium text-foreground">{m.provider}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Inference</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                  <OnlineDot />
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last updated</span>
                <span className="font-medium text-foreground">{m.updated}</span>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Validation metrics
              </div>
              <div className="mt-2 flex items-start gap-2 text-[13px] font-medium text-foreground">
                <FlaskConical className="mt-0.5 size-3.5 text-blue-500" />
                {m.accuracy}
              </div>
              <div className="mt-3 text-[11px] text-muted-foreground">
                Metrics computed on the held-out internal validation cohort
                (n=12,842 fundus images).
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function RagSection() {
  const [updating, setUpdating] = useState(false);

  return (
    <Card
      title="RAG & Knowledge"
      description="Clinical knowledge grounding for every screening assessment."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <StatusTile
          icon={Database}
          label="Knowledge Base"
          value="Online"
          detail="1,284 indexed documents"
        />
        <StatusTile
          icon={Library}
          label="ChromaDB"
          value="Online"
          detail="Vector store · 96,412 embeddings"
        />
        <StatusTile
          icon={BrainCircuit}
          label="Embedding Model"
          value="bge-large-en-v1.5"
          detail="1024-dim · normalized"
        />
        <StatusTile
          icon={SlidersHorizontal}
          label="Reranker"
          value="bge-reranker-v2-m3"
          detail="Cross-encoder top-k=6"
        />
      </div>

      <div className="mt-4 space-y-1">
        <SettingRow label="Semantic chunking" hint="512 tokens · 64-token overlap.">
          <EnabledBadge enabled />
        </SettingRow>
        <SettingRow label="Hybrid retrieval" hint="Dense + BM25 keyword retrieval.">
          <EnabledBadge enabled />
        </SettingRow>
        <SettingRow label="Last synchronization">
          <span className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
            <FileClock className="size-3.5" />
            Sep 9, 2026 · 03:00
          </span>
        </SettingRow>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setUpdating(true);
            setTimeout(() => setUpdating(false), 1500);
          }}
          disabled={updating}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          <RefreshCw className={cn("size-3.5", updating && "animate-spin")} />
          {updating ? "Updating…" : "Update Knowledge Base"}
        </button>
      </div>
    </Card>
  );
}

function StatusTile({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Icon className="size-4" />
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <OnlineDot />
          {value}
        </span>
      </div>
      <div className="mt-3 text-[13px] font-semibold text-foreground">{label}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function NotificationsSection() {
  return (
    <Card
      title="Notifications"
      description="Alert routing for screening events and referrals."
    >
      <div className="space-y-1">
        <SettingRow label="Referral alerts" hint="Immediate notification when a screening is referable.">
          <SwitchToggle defaultOn />
        </SettingRow>
        <SettingRow label="Low-confidence flags" hint="Alert when model confidence falls below threshold.">
          <SwitchToggle defaultOn />
        </SettingRow>
        <SettingRow label="Daily screening digest" hint="Summary of all screenings each morning.">
          <SwitchToggle defaultOn />
        </SettingRow>
        <SettingRow label="System degradation alerts" hint="Pipeline or model availability incidents.">
          <SwitchToggle />
        </SettingRow>
      </div>
      <div className="mt-4">
        <SaveBar />
      </div>
    </Card>
  );
}

function SecuritySection() {
  const rows: { label: string; hint: string; enabled: boolean }[] = [
    {
      label: "Authentication",
      hint: "Email OTP + guest sessions via managed auth.",
      enabled: true,
    },
    {
      label: "Role-based access control",
      hint: "Admin, ophthalmologist, clinician, operator roles.",
      enabled: true,
    },
    {
      label: "Row-level security",
      hint: "Per-tenant record isolation at the database layer.",
      enabled: true,
    },
    {
      label: "Encryption at rest",
      hint: "AES-256 on all stored screening data.",
      enabled: true,
    },
    {
      label: "Encryption in transit",
      hint: "TLS 1.3 for all API and client traffic.",
      enabled: true,
    },
    {
      label: "Audit logging",
      hint: "Immutable log of every screening and record access.",
      enabled: true,
    },
    {
      label: "Session management",
      hint: "24h expiry · automatic refresh · device revocation.",
      enabled: true,
    },
    {
      label: "API security",
      hint: "Scoped keys with per-endpoint rate limiting.",
      enabled: false,
    },
  ];

  return (
    <Card
      title="Security & Privacy"
      description="Enterprise controls protecting patient data."
    >
      <div className="space-y-1">
        {rows.map((r) => (
          <SettingRow key={r.label} label={r.label} hint={r.hint}>
            <EnabledBadge enabled={r.enabled} />
          </SettingRow>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        RetinaScan AI is designed for HIPAA-aligned deployment. Data residency
        and BAA options are configurable per organization.
      </div>
    </Card>
  );
}

const ROLE_USERS = [
  { name: "Dr. A. Mehta", email: "a.mehta@retinascan.health", role: "Administrator", status: "Active" },
  { name: "Dr. S. Rao", email: "s.rao@retinascan.health", role: "Ophthalmologist", status: "Active" },
  { name: "N. Kapoor", email: "n.kapoor@retinascan.health", role: "Clinician", status: "Active" },
  { name: "V. Sharma", email: "v.sharma@retinascan.health", role: "Screening Operator", status: "Active" },
  { name: "R. Iyer", email: "r.iyer@retinascan.health", role: "Screening Operator", status: "Disabled" },
];

function UsersSection() {
  const [users, setUsers] = useState(ROLE_USERS);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("Clinician");
  const updateUser = (email: string, patch: Partial<(typeof ROLE_USERS)[number]>) =>
    setUsers((current) => current.map((user) => user.email === email ? { ...user, ...patch } : user));
  const addUser = () => {
    if (!newName.trim() || !newEmail.trim()) {
      toast.error("Enter a name and email address to add a demo user.");
      return;
    }
    setUsers((current) => [...current, { name: newName.trim(), email: newEmail.trim(), role: newRole, status: "Active" }]);
    setAdding(false); setNewName(""); setNewEmail(""); setNewRole("Clinician");
    toast.success("Demo user added", { description: "This change is local to this browser session." });
  };
  return (
    <div className="space-y-6">
      <Card title="Users & Roles" description="Workspace membership and permissions.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {["Administrators", "Ophthalmologists", "Clinicians", "Screening Operators"].map(
            (role, i) => (
              <div key={role} className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {i === 0 ? (
                      <Building2 className="size-4" />
                    ) : (
                      <Users className="size-4" />
                    )}
                  </span>
                  <span className="nb-mono text-xs text-muted-foreground">
                    {[1, 1, 1, 2][i]}
                  </span>
                </div>
                <div className="mt-3 text-[13px] font-semibold text-foreground">{role}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {i === 0
                    ? "Full workspace control"
                    : i === 1
                      ? "Verify & override results"
                      : i === 2
                        ? "Review & annotate screenings"
                        : "Run & upload screenings"}
                </div>
              </div>
            ),
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setAdding((open) => !open)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <UserPlus className="size-3.5" />
            Add User
          </button>
        </div>
        {adding && <div className="mt-4 grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <TextInput value={newName} onChange={setNewName} width="w-full" />
          <TextInput value={newEmail} onChange={setNewEmail} width="w-full" />
          <SelectInput value={newRole} onChange={setNewRole} options={["Administrator", "Ophthalmologist", "Clinician", "Screening Operator"]} />
          <button type="button" onClick={addUser} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">Add</button>
        </div>}
      </Card>

      <Card title="Workspace Members">
        <div className="space-y-1">
          {users.map((u) => (
            <div
              key={u.email}
              className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-b-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {u.name.charAt(0)}
                </span>
                <div>
                  <div className="text-[13px] font-medium text-foreground">{u.name}</div>
                  <div className="text-[11px] text-muted-foreground">{u.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select aria-label={`Role for ${u.name}`} value={u.role} onChange={(e) => { updateUser(u.email, { role: e.target.value }); toast.success("Demo role updated"); }} className="rounded-full border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground outline-none"><option>Administrator</option><option>Ophthalmologist</option><option>Clinician</option><option>Screening Operator</option></select>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                    u.status === "Active"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-500",
                  )}
                >
                  {u.status}
                </span>
                <button
                  type="button"
                  onClick={() => toast.success("Choose a role from the selector.")}
                  className="cursor-pointer rounded-lg border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Edit Role
                </button>
                <button
                  type="button"
                  onClick={() => { const next = u.status === "Active" ? "Disabled" : "Active"; updateUser(u.email, { status: next }); toast.success(`${u.name} ${next === "Active" ? "enabled" : "disabled"} for this demo.`); }}
                  className={cn(
                    "cursor-pointer rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    u.status === "Active"
                      ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
                  )}
                >
                  {u.status === "Active" ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ProtocolSection() {
  const [classification, setClassification] = useState("ICDR Severity Scale");
  const [referralRules, setReferralRules] = useState("Moderate+ refer within 3 months");
  const [confidenceThreshold, setConfidenceThreshold] = useState("80");

  return (
    <Card
      title="Clinical Protocol"
      description="Staging standards and referral rules applied to every screening."
    >
      <div className="space-y-1">
        <SettingRow label="DR classification standard">
          <span className="inline-flex items-center gap-2">
            <ScrollText className="size-3.5 text-muted-foreground" />
            <SelectInput
              value={classification}
              onChange={setClassification}
              options={["ICDR Severity Scale", "ETDRS", "AAO PPP (custom)"]}
            />
          </span>
        </SettingRow>
        <SettingRow label="Referral rules">
          <SelectInput
            value={referralRules}
            onChange={setReferralRules}
            options={[
              "Moderate+ refer within 3 months",
              "Moderate+ refer within 2 weeks",
              "Severe+ refer within 2 weeks",
            ]}
          />
        </SettingRow>
        <SettingRow
          label="Confidence threshold"
          hint="Screenings below this confidence are flagged for clinician review."
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={50}
              max={99}
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(e.target.value)}
              className="w-20 rounded-lg border bg-muted/40 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:bg-card"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </SettingRow>
        <SettingRow label="Uncertainty threshold" hint="Entropy-based uncertainty flagging.">
          <span className="nb-mono text-[13px] font-medium text-foreground">0.15</span>
        </SettingRow>
        <SettingRow label="Protocol version">
          <span className="nb-mono text-[13px] font-medium text-foreground">v2.4.1</span>
        </SettingRow>
        <SettingRow label="Last updated">
          <span className="text-[13px] text-muted-foreground">Jun 30, 2026</span>
        </SettingRow>
      </div>
      <div className="mt-4">
        <SaveBar />
      </div>
    </Card>
  );
}

function SystemSection() {
  const services = [
    { name: "Vision Model", icon: BrainCircuit },
    { name: "LLM", icon: BrainCircuit },
    { name: "SGLang", icon: Server },
    { name: "RAG", icon: Library },
    { name: "ChromaDB", icon: Database },
    { name: "Supabase", icon: Database },
    { name: "API", icon: Globe },
    { name: "Database", icon: Database },
  ];

  return (
    <Card
      title="System Status"
      description="Live health of all pipeline services."
    >
      <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">
          Live service indicators
        </span>
        <ServiceHealth />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {services.map((s) => (
          <div key={s.name} className="rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/60">
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <s.icon className="size-4" />
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <OnlineDot />
                Online
              </span>
            </div>
            <div className="mt-3 text-[13px] font-semibold text-foreground">{s.name}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Uptime 30d · 99.98%
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          <KeyRound className="size-4 text-muted-foreground" />
          <div>
            <div className="text-[13px] font-medium text-foreground">Audit log</div>
            <div className="text-[11px] text-muted-foreground">
              Full event history retained for 7 years.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <Check className="size-3" />
            All systems operational
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Siren className="size-3" />
            0 incidents
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Search className="size-3" />
            View logs
          </span>
        </div>
      </div>
    </Card>
  );
}
