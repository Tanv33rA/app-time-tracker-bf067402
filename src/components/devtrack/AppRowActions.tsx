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
            appsApi.pause(app.id);
            toast(`Paused "${app.name}"`);
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
            appsApi.resume(app.id);
            toast.success(`Resumed "${app.name}"`);
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
            appsApi.complete(app.id);
            toast.success(`Completed "${app.name}"`);
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
                appsApi.reopen(app.id);
                toast(`Reopened "${app.name}"`);
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reopen
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {
              appsApi.remove(app.id);
              toast(`Deleted "${app.name}"`);
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}