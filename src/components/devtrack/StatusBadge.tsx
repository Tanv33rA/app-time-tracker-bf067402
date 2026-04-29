import { cn } from "@/lib/utils";
import type { Status } from "@/lib/devtrack-types";

const styles: Record<Status, string> = {
  Active:
    "bg-success/15 text-success border-success/30",
  Paused:
    "bg-warning/15 text-warning border-warning/30",
  Completed:
    "bg-primary/15 text-primary border-primary/30",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status],
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "Active" && "bg-success animate-pulse-dot",
          status === "Paused" && "bg-warning",
          status === "Completed" && "bg-primary",
        )}
      />
      {status}
    </span>
  );
}