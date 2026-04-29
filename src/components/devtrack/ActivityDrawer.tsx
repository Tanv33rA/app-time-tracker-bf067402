import { format, formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "./StatusBadge";
import { PlatformIcon } from "./PlatformIcon";
import { LiveDuration } from "./LiveDuration";
import { formatDuration } from "@/lib/devtrack-store";
import type { ActivityType, AppItem } from "@/lib/devtrack-types";
import { CheckCircle2, Pause, Play, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  created: Plus,
  paused: Pause,
  resumed: Play,
  completed: CheckCircle2,
  reopened: RotateCcw,
};

const COLORS: Record<ActivityType, string> = {
  created: "text-primary bg-primary/15",
  paused: "text-warning bg-warning/15",
  resumed: "text-success bg-success/15",
  completed: "text-primary bg-primary/15",
  reopened: "text-muted-foreground bg-muted",
};

interface Props {
  app: AppItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityDrawer({ app, open, onOpenChange }: Props) {
  if (!app) return null;
  const events = [...app.activity].sort((a, b) => b.at - a.at);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-hidden p-0 sm:max-w-lg">
        <div className="flex h-full flex-col">
          <SheetHeader className="space-y-3 border-b border-border p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="truncate text-xl">{app.name}</SheetTitle>
                <SheetDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <PlatformIcon platform={app.platform} className="h-3.5 w-3.5" />
                    {app.platform}
                  </span>
                  <span>•</span>
                  <span>{app.developer}</span>
                  <span>•</span>
                  <span>Started {format(app.createdAt, "MMM d, yyyy")}</span>
                </SheetDescription>
              </div>
              <StatusBadge status={app.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <p className="text-xs text-muted-foreground">Total time</p>
                <p className="mt-1 font-mono text-lg">
                  <LiveDuration app={app} />
                </p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <p className="text-xs text-muted-foreground">Sessions</p>
                <p className="mt-1 text-lg">{app.sessions.length}</p>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-6 p-6">
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Activity
                </h3>
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {events.map((ev) => {
                    const Icon = ICONS[ev.type];
                    return (
                      <li key={ev.id} className="relative">
                        <span
                          className={cn(
                            "absolute -left-[30px] flex h-6 w-6 items-center justify-center rounded-full border border-border",
                            COLORS[ev.type],
                          )}
                        >
                          <Icon className="h-3 w-3" />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm capitalize">{ev.type}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(ev.at, "MMM d, yyyy 'at' h:mm a")} ·{" "}
                            {formatDistanceToNow(ev.at, { addSuffix: true })}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Time log
                </h3>
                <div className="space-y-2">
                  {app.sessions.map((s, i) => {
                    const end = s.end ?? Date.now();
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">
                            Session {i + 1}
                          </span>
                          <span>
                            {format(s.start, "MMM d, h:mm a")} →{" "}
                            {s.end ? format(s.end, "MMM d, h:mm a") : (
                              <span className="text-success">in progress</span>
                            )}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatDuration(end - s.start)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}