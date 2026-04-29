import { format } from "date-fns";
import type { AppItem } from "./devtrack-types";
import { totalMs, formatDuration } from "./devtrack-store";

function escape(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportAppsCsv(apps: AppItem[]) {
  const now = Date.now();
  const headers = [
    "Name",
    "Developer",
    "Platform",
    "Status",
    "Started",
    "Completed",
    "Sessions",
    "Total time",
    "Total minutes",
  ];
  const rows = apps.map((a) => {
    const ms = totalMs(a, now);
    return [
      a.name,
      a.developer,
      a.platform,
      a.status,
      format(a.createdAt, "yyyy-MM-dd HH:mm"),
      a.completedAt ? format(a.completedAt, "yyyy-MM-dd HH:mm") : "",
      a.sessions.length,
      formatDuration(ms),
      Math.round(ms / 60000),
    ].map(escape).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `devtrack-${format(now, "yyyyMMdd-HHmm")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}