import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useScreeningHistory } from "@/context/ScreeningHistoryContext";
import { History, LayoutDashboard, LogOut, ScanEye, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: LucideIcon;
  to: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "New Screening", icon: ScanEye, to: "/new-screening" },
  { label: "History", icon: History, to: "/dashboard" },
];

/** Severity color scale — flat solid blocks, no gradients. */
export function drStageClasses(stage: number, referable: boolean): string {
  if (stage === 0) return "bg-chart-2 text-card-foreground"; // green
  if (!referable) return "bg-chart-3 text-card-foreground"; // amber
  if (stage >= 4) return "bg-chart-5 text-card-foreground"; // red
  return "bg-chart-4 text-card-foreground"; // orange
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
        "inline-block border-2 px-2 py-0.5 text-xs font-bold uppercase tracking-wide",
        drStageClasses(stage, referable),
      )}
    >
      Stage {stage} — {label}
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { history } = useScreeningHistory();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r-2 bg-sidebar p-4 md:flex">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="nb-pop-hover mb-6 flex cursor-pointer items-center gap-2 p-1 text-left"
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

        <nav className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.to}
              type="button"
              variant="ghost"
              onClick={() => navigate(item.to)}
              className="nb-pop-hover w-full cursor-pointer justify-start gap-2 rounded-none border-2 border-transparent px-3 font-semibold"
            >
              <item.icon className="size-4" />
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="mt-auto border-t-2 pt-3">
          <div className="nb-mono mb-2 truncate px-1 text-xs text-muted-foreground">
            {user?.email ?? user?.name ?? "Signed in"}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleSignOut}
            className="nb-pop-hover w-full cursor-pointer gap-2 rounded-none border-2 font-semibold"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b-2 bg-sidebar px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex cursor-pointer items-center gap-2"
        >
          <div className="flex size-8 items-center justify-center border-2 bg-primary text-primary-foreground">
            <ScanEye className="size-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">RetinaScan</span>
        </button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate("/new-screening")}
            className="cursor-pointer rounded-none border-2"
            aria-label="New Screening"
          >
            <ScanEye className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="cursor-pointer rounded-none border-2"
            aria-label="History"
          >
            <History className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="cursor-pointer rounded-none border-2"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <main className="min-w-0 flex-1 px-4 pb-12 pt-20 md:px-10 md:py-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>

        <div className="mx-auto mt-16 w-full max-w-6xl">
          <section className="nb-border bg-card">
            <div className="flex items-center gap-2 border-b-2 bg-secondary px-4 py-3 text-secondary-foreground">
              <LayoutDashboard className="size-4" />
              <h2 className="text-sm font-bold uppercase tracking-wide">
                Case History
              </h2>
            </div>
            {history.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No screenings yet. Run a demo case from New Screening.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">Case</th>
                      <th className="px-4 py-2 font-semibold">File</th>
                      <th className="px-4 py-2 font-semibold">DR Stage</th>
                      <th className="px-4 py-2 font-semibold">Confidence</th>
                      <th className="px-4 py-2 font-semibold">Referral</th>
                      <th className="px-4 py-2 font-semibold">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((r) => (
                      <tr
                        key={r.id}
                        className="cursor-pointer border-b-2 last:border-b-0 hover:bg-muted/60"
                        onClick={() => navigate("/dashboard")}
                      >
                        <td className="nb-mono px-4 py-3 text-xs">{r.matchedKey}</td>
                        <td className="max-w-[10rem] truncate px-4 py-3">{r.filename}</td>
                        <td className="px-4 py-3">
                          <DrStageBadge
                            stage={r.drStage}
                            label={r.drLabel}
                            referable={r.referable}
                          />
                        </td>
                        <td className="nb-mono px-4 py-3">{r.confidence}%</td>
                        <td className="px-4 py-3">
                          {r.referable ? "Refer" : "Routine"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(r.completedAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
