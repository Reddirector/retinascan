import { DrStageBadge, AppShell } from "@/components/AppShell";
import { useScreeningHistory } from "@/context/ScreeningHistoryContext";
import { ScanEye } from "lucide-react";

export default function Dashboard() {
  const { history } = useScreeningHistory();

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Screening Workspace
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Dashboard</h1>
        </header>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="nb-border nb-pop bg-card p-5">
            <div className="flex size-9 items-center justify-center border-2 bg-secondary">
              <ScanEye className="size-4" />
            </div>
            <div className="nb-mono mt-4 text-3xl font-bold">
              {history.length}
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Screenings this session
            </div>
          </div>
          <div className="nb-border nb-pop bg-card p-5">
            <div className="nb-mono mt-0 text-3xl font-bold">6</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pipeline stages per run
            </div>
          </div>
          <div className="nb-border nb-pop bg-card p-5">
            <div className="nb-mono mt-0 text-3xl font-bold">90–96%</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Confidence range (demo)
            </div>
          </div>
        </div>

        <section className="nb-border bg-card">
          <div className="flex items-center justify-between border-b-2 bg-muted px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Recent Results
            </h2>
            <span className="nb-mono text-xs text-muted-foreground">
              demo data — per-session
            </span>
          </div>
          {history.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No screenings yet this session. Run eyescan1 / eyescan2 /
              eyescan3 from New Screening — the case-history table below fills
              in as results complete.
            </p>
          ) : (
            <ul className="flex flex-col">
              {history.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 border-b-2 px-4 py-3 last:border-b-0 hover:bg-muted/60"
                >
                  <span className="nb-mono text-xs">{r.matchedKey}</span>
                  <DrStageBadge
                    stage={r.drStage}
                    label={r.drLabel}
                    referable={r.referable}
                  />
                  <span className="nb-mono text-sm font-bold">
                    {r.confidence}%
                  </span>
                  <span className="max-w-[12rem] truncate text-xs text-muted-foreground">
                    {r.filename}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
