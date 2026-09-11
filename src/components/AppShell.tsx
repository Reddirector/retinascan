import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useScreeningHistory } from "@/context/ScreeningHistoryContext";
import {
  FileText,
  History,
  LogOut,
  ScanEye,
  Search,
  Settings,
  Users,
  Bell,
  CalendarClock,
  CircleCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Kbd } from "@/components/ui/kbd";
import {
  Breadcrumb,
  BreadcrumbItem as CrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUiLanguage } from "@/lib/uiLanguage";
import logoMark from "@/assets/logo.svg";

interface NavItem {
  label: string;
  icon: LucideIcon;
  to: string;
  enabled: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "New Screening", icon: ScanEye, to: "/chat", enabled: true },
  { label: "Screening History", icon: History, to: "/dashboard", enabled: true },
  { label: "Patients", icon: Users, to: "/patients", enabled: true },
  { label: "Reports", icon: FileText, to: "/reports", enabled: true },
  { label: "Settings", icon: Settings, to: "/settings", enabled: true },
];

function formatPreferredDate(date: Date, includeWeekday = false) {
  const format = localStorage.getItem("rs.dateFormat") ?? "DD-MM-YYYY";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const value = format === "DD/MM/YYYY" ? `${day}/${month}/${year}` : format === "MM/DD/YYYY" ? `${month}/${day}/${year}` : format === "YYYY-MM-DD" ? `${year}-${month}-${day}` : `${day}-${month}-${year}`;
  return includeWeekday ? `${date.toLocaleDateString(undefined, { weekday: "short" })} · ${value}` : value;
}

/** Severity color scale — soft, badge-style solid tints. */
export function drStageClasses(stage: number, referable: boolean): string {
  if (stage === 0) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (!referable) return "bg-amber-50 text-amber-700 border-amber-200";
  if (stage >= 4) return "bg-red-50 text-red-700 border-red-200";
  return "bg-orange-50 text-orange-700 border-orange-200";
}

export function DrStageBadge({
  stage,
  label,
  referable,
}: {
  stage: number;
  label: string;
  referable: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        drStageClasses(stage, referable),
      )}
    >
      Stage {stage} — {label}
    </span>
  );
}

const CRUMB_LABELS: Record<string, string> = {
  "/chat": "New Screening",
  "/dashboard": "Screening History",
  "/patients": "Patients",
  "/reports": "Reports",
  "/settings": "Settings",
};

/** Breadcrumb trail: Home / Current page. */
export function PageBreadcrumbs() {
  const t = useUiLanguage();
  const location = useLocation();
  const current = CRUMB_LABELS[location.pathname];
  return (
    <Breadcrumb>
      <BreadcrumbList className="text-xs">
        <CrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/chat" className="transition-colors hover:text-blue-600">
              {t("New Screening")}
            </Link>
          </BreadcrumbLink>
        </CrumbItem>
        {current && (
          <>
            <BreadcrumbSeparator />
            <CrumbItem>
              <BreadcrumbPage className="font-medium">
                {t(current)}
              </BreadcrumbPage>
            </CrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** Live clock — updates every 30s so the header shows current time. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const NOTIFICATIONS = [
  {
    id: "n1",
    title: "Screening verified",
    detail: "eyescan2 result verified · Stage 2, 94% confidence",
    time: "2 min ago",
    tone: "ok" as const,
  },
  {
    id: "n2",
    title: "Referral report ready",
    detail: "Report RS-20260910-1042 requires clinician sign-off",
    time: "18 min ago",
    tone: "warn" as const,
  },
  {
    id: "n3",
    title: "Clinical evidence base synced",
    detail: "Guideline and literature index refreshed for retrieval",
    time: "1 h ago",
    tone: "ok" as const,
  },
];

/** Top header: global search (⌘K), AI status, live clock, notifications, profile. */
export function TopHeader({ onOpenPalette }: { onOpenPalette: () => void }) {
  const t = useUiLanguage();
  const now = useNow();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(() => new Set(NOTIFICATIONS.map((n) => n.id)));
  const notificationTarget = (id: string) => (id === "n2" ? "/reports" : id === "n1" ? "/dashboard" : "/settings");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="sticky top-0 z-30 hidden border-b bg-sidebar/85 backdrop-blur-md md:block">
      <div className="flex h-14 items-center gap-4 px-8">
        {/* Global search trigger */}
        <button
          type="button"
          onClick={onOpenPalette}
          className="group flex h-9 w-72 max-w-full cursor-pointer items-center gap-2 rounded-lg border bg-muted/50 px-3 text-left text-xs text-muted-foreground transition-colors hover:border-blue-200 hover:bg-blue-50/50 hover:text-foreground"
        >
          <Search className="size-3.5 shrink-0" />
          <span className="truncate">Search patients, case ID, or anything...</span>
          <Kbd className="ml-auto shrink-0 border bg-card">⌘K</Kbd>
        </button>

        {/* AI system status */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full rounded-full bg-emerald-500 anim-ping-soft" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          {t("AI System Online")}
        </span>

        {/* Date & time */}
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:inline-flex">
          <CalendarClock className="size-3.5" />
          {formatPreferredDate(now, true)}
          {" · "}
          {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Notification center */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative cursor-pointer rounded-lg p-2 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
                {unread.size > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-sidebar bg-blue-500" />}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 rounded-xl p-0">
              <div className="border-b px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Notifications")}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {NOTIFICATIONS.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => { setUnread((current) => { const next = new Set(current); next.delete(n.id); return next; }); navigate(notificationTarget(n.id)); }}
                    className={cn("flex w-full gap-2.5 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/50", unread.has(n.id) && "bg-blue-50/30")}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                        n.tone === "ok"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600",
                      )}
                    >
                      {n.tone === "ok" ? (
                        <CircleCheck className="size-3.5" />
                      ) : (
                        <Bell className="size-3.5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-foreground">
                        {n.title}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {n.detail}
                      </p>
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        {n.time}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setUnread(new Set()); toast.success("All notifications marked as read"); }}
                className="w-full cursor-pointer border-t px-4 py-2.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
              >
                {t("Mark all as read")}
              </button>
            </PopoverContent>
          </Popover>

          {/* User profile menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 pr-2.5 outline-none transition-colors hover:bg-muted"
                aria-label="User profile menu"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {(user?.name ?? user?.email ?? "U").charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-xs font-medium text-foreground lg:block">
                  {user?.name ?? "Account"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel className="text-xs">
                <div className="font-medium text-foreground">
                  {user?.name ?? user?.email ?? "Signed in"}
                </div>
                <div className="text-[11px] font-normal text-muted-foreground">
                  Ophthalmologist
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-xs"
                onClick={() => navigate("/settings")}
              >
                <UserRound className="size-3.5" />
                Profile & settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-xs"
                onClick={() => void handleSignOut()}
              >
                <LogOut className="size-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  const now = new Date();
  const caseId = `RS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="mb-1.5">
          <PageBreadcrumbs />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-muted-foreground">
            AI SYSTEM ONLINE
          </span>
        </div>
        <div className="hidden text-right sm:block">
          <div className="nb-mono text-xs text-muted-foreground">{caseId}</div>
          <div className="text-xs text-muted-foreground">
            {formatPreferredDate(now)}{" "}
            ·{" "}
            {now.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const t = useUiLanguage();

  // Global ⌘K / Ctrl+K command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const runNav = (to: string) => {
    setPaletteOpen(false);
    navigate(to);
  };

  const paletteItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        label: item.label,
        to: item.to,
        icon: item.icon,
      })),
    [],
  );

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      {/* Ambient AI wave background (fixed, non-interactive) */}
      <div className="bg-waves" aria-hidden />

      {/* Left sidebar */}
      <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar px-4 py-6 md:flex">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-8 flex cursor-pointer items-center gap-3 px-2 text-left"
        >
          <img
            src={logoMark}
            alt="RetinaScan AI"
            className="size-10 rounded-xl shadow-sm"
          />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">
              RetinaScan AI
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              AI Fundus Screening
            </div>
          </div>
        </button>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to;
            return (
              <button
                key={item.label}
                type="button"
                disabled={!item.enabled}
                onClick={() => item.enabled && navigate(item.to)}
                className={cn(
                  "group relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-all duration-200",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5",
                  !item.enabled && "cursor-not-allowed opacity-45 hover:bg-transparent hover:translate-x-0",
                )}
              >
                {/* active navigation indicator */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 h-5 w-[3px] rounded-full bg-primary transition-all duration-250",
                    active ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0",
                  )}
                />
                <item.icon className="size-4 transition-transform duration-200 group-hover:scale-110" />
                {t(item.label)}
              </button>
            );
          })}

          {/* Command palette trigger */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="mt-3 flex w-full cursor-pointer items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-blue-200 hover:bg-blue-50/50 hover:text-foreground"
          >
            <span className="inline-flex items-center gap-2">
              <Search className="size-3.5" />
              Quick actions…
            </span>
            <kbd className="nb-mono rounded border bg-card px-1.5 py-0.5 text-[10px]">⌘K</kbd>
          </button>
        </nav>

        <div className="mt-auto">
          <div className="rounded-xl border bg-muted/50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {(user?.name ?? user?.email ?? "U").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13px] font-medium text-foreground">
                  {user?.name ?? user?.email ?? "Signed in"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Screening Operator
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b bg-sidebar px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex cursor-pointer items-center gap-2"
        >
          <img
            src={logoMark}
            alt="RetinaScan AI"
            className="size-8 rounded-lg"
          />
          <span className="text-sm font-semibold tracking-tight">
            RetinaScan AI
          </span>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate("/chat")}
            className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="New Screening"
          >
            <ScanEye className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Screening History"
          >
            <History className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/patients")}
            className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Patients"
          >
            <Users className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/reports")}
            className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Reports"
          >
            <FileText className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Settings"
          >
            <Settings className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="min-w-0 flex-1">
        <TopHeader onOpenPalette={() => setPaletteOpen(true)} />
        <main className="relative z-10 min-w-0 px-4 pb-16 pt-20 md:px-8 md:pt-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      {/* Global command palette (⌘K) */}
      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Jump to page or run an action…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {paletteItems.map((item) => (
              <CommandItem
                key={item.to}
                value={item.label}
                onSelect={() => runNav(item.to)}
              >
                <item.icon className="size-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem
              value="start new screening"
              onSelect={() => runNav("/chat")}
            >
              <ScanEye className="size-4" />
              Start a new screening
            </CommandItem>
            <CommandItem
              value="sign out"
              onSelect={() => {
                setPaletteOpen(false);
                void handleSignOut();
              }}
            >
              <LogOut className="size-4" />
              Sign out
            </CommandItem>
            <CommandItem
              value="copy current page link"
              onSelect={() => {
                setPaletteOpen(false);
                void navigator.clipboard
                  ?.writeText(window.location.href)
                  .then(() => toast.success("Link copied to clipboard"));
              }}
            >
              <FileText className="size-4" />
              Copy page link
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

export function CaseHistoryTable() {
  const { history } = useScreeningHistory();
  const navigate = useNavigate();

  if (history.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No screenings yet. Run a demo case from New Screening — completed
          results appear here as auditable records.
        </p>
        <button
          type="button"
          onClick={() => navigate("/chat")}
          className="btn-grad mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <ScanEye className="size-4" />
          Start a screening
        </button>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden nb-pop">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Case ID</th>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">DR Stage</th>
              <th className="px-4 py-3 font-medium">Confidence</th>
              <th className="px-4 py-3 font-medium">Referral</th>
              <th className="px-4 py-3 font-medium">Completed</th>
            </tr>
          </thead>
          <tbody>
            {history.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer border-b last:border-b-0 transition-colors hover:bg-muted/40"
                onClick={() => navigate("/dashboard")}
              >
                <td className="nb-mono px-4 py-3 text-xs text-muted-foreground">
                  {r.matchedKey.toUpperCase()}-{String(r.id).padStart(3, "0")}
                </td>
                <td className="max-w-[12rem] truncate px-4 py-3">
                  {r.filename}
                </td>
                <td className="px-4 py-3">
                  <DrStageBadge
                    stage={r.drStage}
                    label={r.drLabel}
                    referable={r.referable}
                  />
                </td>
                <td className="nb-mono px-4 py-3 font-medium">
                  {r.confidence}%
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                      r.referable
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200",
                    )}
                  >
                    {r.referable ? "Refer" : "Routine"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(r.completedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
