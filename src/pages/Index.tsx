import { useMemo, useState } from "react";
import { Activity, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApps, totalMs } from "@/lib/devtrack-store";
import { Filters, type FilterState } from "@/components/devtrack/Filters";
import { AppsTable } from "@/components/devtrack/AppsTable";
import { StatCards } from "@/components/devtrack/StatCards";
import { Analytics } from "@/components/devtrack/Analytics";
import { NewAppDialog } from "@/components/devtrack/NewAppDialog";
import { exportAppsCsv } from "@/lib/devtrack-export";
import { toast } from "sonner";

const STATUS_ORDER = { Active: 0, Paused: 1, Completed: 2 } as const;

const Index = () => {
  const apps = useApps();
  const [filters, setFilters] = useState<FilterState>({
    query: "",
    platform: "all",
    status: "all",
    developer: "all",
    sort: "recent",
  });

  const developers = useMemo(
    () => Array.from(new Set(apps.map((a) => a.developer))).sort(),
    [apps],
  );

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const now = Date.now();
    let list = apps.filter((a) => {
      if (filters.platform !== "all" && a.platform !== filters.platform) return false;
      if (filters.status !== "all" && a.status !== filters.status) return false;
      if (filters.developer !== "all" && a.developer !== filters.developer) return false;
      if (q && !a.name.toLowerCase().includes(q) && !a.developer.toLowerCase().includes(q))
        return false;
      return true;
    });
    switch (filters.sort) {
      case "recent":
        list = list.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "oldest":
        list = list.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "duration":
        list = list.sort((a, b) => totalMs(b, now) - totalMs(a, now));
        break;
      case "status":
        list = list.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
        break;
      case "name":
        list = list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return list;
  }, [apps, filters]);

  function handleExport() {
    if (filtered.length === 0) {
      toast.error("Nothing to export with the current filters");
      return;
    }
    exportAppsCsv(filtered);
    toast.success(`Exported ${filtered.length} app${filtered.length !== 1 ? "s" : ""} to CSV`);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-background/60 backdrop-blur-md sticky top-0 z-30">
        <div className="container flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-semibold tracking-tight">Devtrack</h1>
              <p className="text-[11px] text-muted-foreground">App development progress tracker</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="soft" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <NewAppDialog />
          </div>
        </div>
      </header>

      <main className="container space-y-8 py-8 animate-fade-in">
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Track <span className="text-gradient-primary">when, how long,</span> and what's shipping.
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A focused dashboard for monitoring app development — start times, live duration, and status.
            No tasks, no boards, no noise.
          </p>
        </section>

        <StatCards apps={apps} />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Apps
            </h3>
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {apps.length}
            </p>
          </div>
          <Filters state={filters} developers={developers} onChange={setFilters} />
          <AppsTable apps={filtered} />
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Analytics
          </h3>
          <Analytics apps={apps} />
        </section>

        <footer className="pt-8 pb-4 text-center text-xs text-muted-foreground">
          Devtrack — designed to stay simple. Data is stored locally in your browser.
        </footer>
      </main>
    </div>
  );
};

export default Index;
