import { useEffect, useState } from "react";
import type { AppItem } from "@/lib/devtrack-types";
import { currentTaskMs, formatDuration, totalMs } from "@/lib/devtrack-store";

export function LiveDuration({
  app,
  className,
  mode = "total",
}: {
  app: AppItem;
  className?: string;
  mode?: "total" | "current";
}) {
  const interval = app.status === "Active" ? 1000 : 60000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  const ms = mode === "current" ? currentTaskMs(app, now) : totalMs(app, now);
  return (
    <span className={className}>
      {formatDuration(ms)}
    </span>
  );
}