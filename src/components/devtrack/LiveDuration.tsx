import { useEffect, useState } from "react";
import type { AppItem } from "@/lib/devtrack-types";
import { formatDuration, totalMs } from "@/lib/devtrack-store";

export function LiveDuration({ app, className }: { app: AppItem; className?: string }) {
  const interval = app.status === "Active" ? 1000 : 60000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return (
    <span className={className}>
      {formatDuration(totalMs(app, now))}
    </span>
  );
}