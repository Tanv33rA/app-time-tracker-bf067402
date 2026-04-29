import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { PlatformIcon } from "./PlatformIcon";
import { LiveDuration } from "./LiveDuration";
import { AppRowActions } from "./AppRowActions";
import { ActivityDrawer } from "./ActivityDrawer";
import type { AppItem } from "@/lib/devtrack-types";

interface Props {
  apps: AppItem[];
}

export function AppsTable({ apps }: Props) {
  const [historyId, setHistoryId] = useState<string | null>(null);
  const historyApp = apps.find((a) => a.id === historyId) ?? null;

  if (apps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No apps match your filters. Try clearing them or adding a new app.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card/60 shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[26%]">App</TableHead>
              <TableHead>Developer</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Time spent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map((app) => (
              <TableRow
                key={app.id}
                className="group cursor-pointer transition-smooth hover:bg-secondary/40"
                onClick={() => setHistoryId(app.id)}
              >
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{app.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {app.sessions.length} session{app.sessions.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{app.developer}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <PlatformIcon platform={app.platform} />
                    {app.platform}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(app.createdAt, "MMM d, yyyy")}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  <LiveDuration app={app} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={app.status} />
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <AppRowActions app={app} onShowHistory={() => setHistoryId(app.id)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ActivityDrawer
        app={historyApp}
        open={!!historyApp}
        onOpenChange={(o) => !o && setHistoryId(null)}
      />
    </>
  );
}