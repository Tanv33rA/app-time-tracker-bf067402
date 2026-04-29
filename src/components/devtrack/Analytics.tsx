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
  contentHeight,
  children,
}: {
  title: string;
  subtitle?: string;
  contentHeight?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 shadow-card">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="w-full" style={{ height: contentHeight ?? 220 }}>
        {children}
      </div>
    </div>
  );
}

const PLATFORM_COLORS: Record<string, string> = {
  iOS: "hsl(var(--primary))",
  Android: "hsl(var(--warning))",
};
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

export function Analytics({ apps, developers }: { apps: AppItem[]; developers: string[] }) {
  const now = useTicker(60000);

  const byPlatform = useMemo(() => {
    const m = new Map<string, number>();
    apps.forEach((a) => m.set(a.platform, (m.get(a.platform) ?? 0) + totalMs(a, now)));
    return Array.from(m.entries()).map(([name, ms]) => ({ name, hours: hours(ms), ms }));
  }, [apps, now]);

  const byDeveloper = useMemo(() => {
    const m = new Map<string, number>();
    developers.forEach((name) => m.set(name, 0));
    apps.forEach((a) => {
      a.sessions.forEach((s) => {
        const owner = s.developer ?? a.developer;
        const end = s.end ?? (a.status === "Active" ? now : s.start);
        const ms = Math.max(0, end - s.start);
        m.set(owner, (m.get(owner) ?? 0) + ms);
      });
    });
    return Array.from(m.entries())
      .map(([name, ms]) => ({ name, hours: hours(ms), ms }))
      .sort((a, b) => b.ms - a.ms || a.name.localeCompare(b.name));
  }, [apps, developers, now]);

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

  const latestWorkedApps = useMemo(() => {
    return apps
      .map((app) => {
        const lastWorkedAt = app.sessions.reduce((latest, session) => {
          const end = session.end ?? (app.status === "Active" ? now : session.start);
          return Math.max(latest, end);
        }, app.createdAt);

        return {
          name: app.name,
          taskType: app.taskType,
          lastWorkedAt,
          lastWorkedLabel: new Date(lastWorkedAt).toLocaleString(),
        };
      })
      .sort((a, b) => b.lastWorkedAt - a.lastWorkedAt);
  }, [apps, now]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Time by platform" subtitle="Total hours tracked">
        <ResponsiveContainer>
          <BarChart
            data={byPlatform}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
            barCategoryGap="2%"
          >
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              padding={{ left: 90, right: 90 }}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "hsl(var(--secondary) / 0.5)" }}
              formatter={(v: number) => [`${v}h`, "Hours"]}
            />
            <Bar dataKey="hours" radius={[10, 10, 2, 2]} barSize={24}>
              {byPlatform.map((entry, i) => (
                <Cell
                  key={`${entry.name}-${i}`}
                  fill={PLATFORM_COLORS[entry.name] ?? "hsl(var(--primary))"}
                />
              ))}
            </Bar>
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

      <Panel
        title="Time by developer"
        subtitle="Includes developers with 0h"
        contentHeight={Math.max(220, byDeveloper.length * 32)}
      >
        <ResponsiveContainer>
          <BarChart data={byDeveloper} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 16 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={160}
              interval={0}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "hsl(var(--secondary) / 0.5)" }}
              formatter={(v: number) => [`${v}h`, "Hours"]}
            />
            <Bar dataKey="hours" fill={DEV_COLOR} radius={[0, 6, 6, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel
        title="Latest worked apps"
        subtitle="Newest work (First Release or Update) on top"
      >
        {latestWorkedApps.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No app activity yet
          </div>
        ) : (
          <div className={latestWorkedApps.length > 10 ? "max-h-[360px] overflow-y-auto pr-1" : ""}>
            <div style={{ height: Math.max(220, latestWorkedApps.length * 32) }}>
              <ResponsiveContainer>
                <BarChart
                  data={latestWorkedApps}
                  layout="vertical"
                  margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
                >
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide domain={["dataMin", "dataMax"]} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={110}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "hsl(var(--secondary) / 0.5)" }}
                    formatter={(_, __, item) => {
                      const payload = item.payload as {
                        taskType: string;
                        lastWorkedLabel: string;
                      };
                      return [payload.lastWorkedLabel, payload.taskType];
                    }}
                    labelFormatter={(label) => `App: ${label}`}
                  />
                  <Bar dataKey="lastWorkedAt" fill="hsl(var(--warning))" radius={[0, 6, 6, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}