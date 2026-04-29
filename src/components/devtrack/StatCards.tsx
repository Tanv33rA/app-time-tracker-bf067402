import { Activity, CheckCircle2, PauseCircle, Layers } from "lucide-react";
import type { AppItem } from "@/lib/devtrack-types";
import { totalMs, useTicker, formatDuration } from "@/lib/devtrack-store";

function Card({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 p-5 shadow-card transition-smooth hover:border-primary/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={`rounded-lg border border-border p-2 ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export function StatCards({ apps }: { apps: AppItem[] }) {
  const now = useTicker(60000);
  const active = apps.filter((a) => a.status === "Active").length;
  const paused = apps.filter((a) => a.status === "Paused").length;
  const completed = apps.filter((a) => a.status === "Completed");
  const totalAll = apps.reduce((s, a) => s + totalMs(a, now), 0);

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card
        label="Total apps"
        value={String(apps.length)}
        hint={`${active + paused} in progress`}
        icon={Layers}
        accent="bg-primary/10 text-primary"
      />
      <Card
        label="Active"
        value={String(active)}
        hint="Tracking now"
        icon={Activity}
        accent="bg-success/10 text-success"
      />
      <Card
        label="Paused"
        value={String(paused)}
        hint="Awaiting resume"
        icon={PauseCircle}
        accent="bg-warning/10 text-warning"
      />
      <Card
        label="Completed"
        value={String(completed.length)}
        hint={`${formatDuration(totalAll)} tracked total`}
        icon={CheckCircle2}
        accent="bg-primary/10 text-primary"
      />
    </div>
  );
}