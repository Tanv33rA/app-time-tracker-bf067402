import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import type { AppItem } from "@/lib/devtrack-types";
import { totalMs, useTicker, formatDuration } from "@/lib/devtrack-store";

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 shadow-card">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="h-[220px] w-full">{children}</div>
    </div>
  );
}

const PLATFORM_COLOR = "hsl(var(--primary))";
const DEV_COLOR = "hsl(var(--accent))";
const PIE_COLORS = ["hsl(var(--success))", "hsl(var(--primary))", "hsl(var(--warning))"];

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

function hours(ms: number) {
  return +(ms / 3_600_000).toFixed(1);
}

export function Analytics({ apps }: { apps: AppItem[] }) {
  const now = useTicker(60000);

  const byPlatform = useMemo(() => {
    const m = new Map<string, number>();
    apps.forEach((a) => m.set(a.platform, (m.get(a.platform) ?? 0) + totalMs(a, now)));
    return Array.from(m.entries()).map(([name, ms]) => ({ name, hours: hours(ms), ms }));
  }, [apps, now]);

  const byDeveloper = useMemo(() => {
    const m = new Map<string, number>();
    apps.forEach((a) => m.set(a.developer, (m.get(a.developer) ?? 0) + totalMs(a, now)));
    return Array.from(m.entries())
      .map(([name, ms]) => ({ name, hours: hours(ms), ms }))
      .sort((a, b) => b.ms - a.ms)
      .slice(0, 6);
  }, [apps, now]);

  const statusBreakdown = useMemo(() => {
    const c = { Active: 0, Paused: 0, Completed: 0 } as Record<string, number>;
    apps.forEach((a) => (c[a.status] += 1));
    return [
      { name: "Active", value: c.Active },
      { name: "Completed", value: c.Completed },
      { name: "Paused", value: c.Paused },
    ].filter((d) => d.value > 0);
  }, [apps]);

  const completedDurations = useMemo(() => {
    const completed = apps.filter((a) => a.status === "Completed");
    if (completed.length === 0) return { avgMs: 0, count: 0 };
    const total = completed.reduce((s, a) => s + totalMs(a, now), 0);
    return { avgMs: total / completed.length, count: completed.length };
  }, [apps, now]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel title="Time by platform" subtitle="Total hours tracked">
        <ResponsiveContainer>
          <BarChart data={byPlatform} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "hsl(var(--secondary) / 0.5)" }}
              formatter={(v: number) => [`${v}h`, "Hours"]}
            />
            <Bar dataKey="hours" fill={PLATFORM_COLOR} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Time by developer" subtitle="Top 6 by hours">
        <ResponsiveContainer>
          <BarChart data={byDeveloper} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "hsl(var(--secondary) / 0.5)" }}
              formatter={(v: number) => [`${v}h`, "Hours"]}
            />
            <Bar dataKey="hours" fill={DEV_COLOR} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel
        title="Status breakdown"
        subtitle={
          completedDurations.count > 0
            ? `Avg completion: ${formatDuration(completedDurations.avgMs)} across ${completedDurations.count} app${completedDurations.count !== 1 ? "s" : ""}`
            : "No completed apps yet"
        }
      >
        {statusBreakdown.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No data yet
          </div>
        ) : (
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={statusBreakdown}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={3}
                stroke="hsl(var(--card))"
              >
                {statusBreakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  );
}