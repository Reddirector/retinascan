import { useMemo, useState } from "react";
import { AppShell, DrStageBadge, PageHeader } from "@/components/AppShell";
import { useScreeningHistory } from "@/context/ScreeningHistoryContext";
import { ArrowUpDown, Search, ScanEye } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "date" | "confidence" | "stage";

export default function Dashboard() {
  const { history } = useScreeningHistory();
  const [query, setQuery] = useState("");
  const [referralFilter, setReferralFilter] = useState<"all" | "refer" | "routine">("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let rows = [...history];

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.filename.toLowerCase().includes(q) ||
          r.matchedKey.toLowerCase().includes(q),
      );
    }

    if (referralFilter !== "all") {
      rows = rows.filter((r) =>
        referralFilter === "refer" ? r.referable : !r.referable,
      );
    }

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.completedAt - b.completedAt;
      if (sortKey === "confidence") cmp = a.confidence - b.confidence;
      if (sortKey === "stage") cmp = a.drStage - b.drStage;
      return sortAsc ? cmp : -cmp;
    });

    return rows;
  }, [history, query, referralFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((a) => !a);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const stats = useMemo(
    () => ({
      total: history.length,
      referrals: history.filter((r) => r.referable).length,
      avgConfidence:
        history.length > 0
          ? Math.round(
              history.reduce((acc, r) => acc + r.confidence, 0) / history.length,
            )
          : 0,
    }),
    [history],
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Screening History"
          subtitle="Auditable records of every AI screening run in this session"
        />

        {/* Summary stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="panel nb-pop p-5">
            <div className="text-3xl font-semibold tracking-tight text-foreground">
              {stats.total}
            </div>
            <div className="mt-1 text-xs font-medium text-muted-foreground">
              Screenings this session
            </div>
          </div>
          <div className="panel nb-pop p-5">
            <div className="text-3xl font-semibold tracking-tight text-red-600">
              {stats.referrals}
            </div>
            <div className="mt-1 text-xs font-medium text-muted-foreground">
              Referrals recommended
            </div>
          </div>
          <div className="panel nb-pop p-5">
            <div className="text-3xl font-semibold tracking-tight text-foreground">
              {stats.avgConfidence}%
            </div>
            <div className="mt-1 text-xs font-medium text-muted-foreground">
              Mean model confidence
            </div>
          </div>
        </div>

        {/* Search / filter / sort controls */}
        <div className="panel flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by filename or case ID…"
              className="w-full rounded-lg border bg-muted/40 py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-blue-300 focus:bg-card"
            />
          </div>
          <div className="flex overflow-hidden rounded-lg border text-xs font-medium">
            {(["all", "refer", "routine"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setReferralFilter(f)}
                className={cn(
                  "cursor-pointer px-3 py-2 capitalize transition-colors",
                  referralFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                {f === "all" ? "All cases" : f === "refer" ? "Referrals" : "Routine"}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowUpDown className="size-3.5" />
            Sort by
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="cursor-pointer rounded-lg border bg-card px-2 py-1.5 text-xs font-medium text-foreground outline-none"
            >
              <option value="date">Date</option>
              <option value="confidence">Confidence</option>
              <option value="stage">DR Stage</option>
            </select>
            <button
              type="button"
              onClick={() => setSortAsc((a) => !a)}
              className="cursor-pointer rounded-lg border bg-card px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              {sortAsc ? "Ascending" : "Descending"}
            </button>
          </div>
        </div>

        {/* Case table */}
        {filtered.length === 0 ? (
          <div className="panel p-8 text-center">
            {history.length === 0 ? (
              <>
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ScanEye className="size-6" />
                </span>
                <p className="mt-4 text-sm text-muted-foreground">
                  No screenings yet this session. Run eyescan1 / eyescan2 /
                  eyescan3 from New Screening — records appear here as results
                  complete.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No cases match the current search or filter.
              </p>
            )}
          </div>
        ) : (
          <div className="panel overflow-hidden nb-pop">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Case ID</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">File</th>
                    <th className="px-4 py-3 font-medium">DR Stage</th>
                    <th className="px-4 py-3 font-medium">Confidence</th>
                    <th className="px-4 py-3 font-medium">Referral</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b transition-colors last:border-b-0 hover:bg-muted/40"
                    >
                      <td className="nb-mono px-4 py-3 text-xs text-muted-foreground">
                        {r.matchedKey.toUpperCase()}-
                        {String(r.id).padStart(3, "0")}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(r.completedAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {r.referable ? "Refer" : "Routine"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Complete
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
