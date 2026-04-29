import { MoreHorizontal, Pause, Play, CheckCircle2, RotateCcw, Trash2, History } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { appsApi } from "@/lib/devtrack-store";
import type { AppItem } from "@/lib/devtrack-types";
import { toast } from "sonner";

interface Props {
  app: AppItem;
  onShowHistory: () => void;
}

export function AppRowActions({ app, onShowHistory }: Props) {
  return (
    <div className="flex items-center justify-end gap-1">
      {app.status === "Active" && (
        <Button
          size="sm"
          variant="soft"
          onClick={() => {
            void appsApi.pause(app.id).then(
              () => toast(`Paused "${app.name}"`),
              (error: unknown) =>
                toast.error(error instanceof Error ? error.message : "Could not pause app"),
            );
          }}
        >
          <Pause className="h-4 w-4" /> Pause
        </Button>
      )}
      {app.status === "Paused" && (
        <Button
          size="sm"
          variant="hero"
          onClick={() => {
            void appsApi.resume(app.id).then(
              () => toast.success(`Resumed "${app.name}"`),
              (error: unknown) =>
                toast.error(error instanceof Error ? error.message : "Could not resume app"),
            );
          }}
        >
          <Play className="h-4 w-4" /> Resume
        </Button>
      )}
      {app.status !== "Completed" && (
        <Button
          size="sm"
          variant="soft"
          onClick={() => {
            void appsApi.complete(app.id).then(
              () => toast.success(`Completed "${app.name}"`),
              (error: unknown) =>
                toast.error(error instanceof Error ? error.message : "Could not complete app"),
            );
          }}
        >
          <CheckCircle2 className="h-4 w-4" /> Complete
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="More actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={onShowHistory}>
            <History className="h-4 w-4" /> Activity & sessions
          </DropdownMenuItem>
          {app.status === "Completed" && (
            <DropdownMenuItem
              onClick={() => {
                void appsApi.reopen(app.id).then(
                  () => toast(`Reopened "${app.name}"`),
                  (error: unknown) =>
                    toast.error(error instanceof Error ? error.message : "Could not reopen app"),
                );
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reopen
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {
              void appsApi.remove(app.id).then(
                () => toast(`Deleted "${app.name}"`),
                (error: unknown) =>
                  toast.error(error instanceof Error ? error.message : "Could not delete app"),
              );
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}