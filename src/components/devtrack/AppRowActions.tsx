import { useState } from "react";
import { MoreHorizontal, Pause, Play, CheckCircle2, RotateCcw, Trash2, History } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { appsApi, useDevelopers } from "@/lib/devtrack-store";
import type { AppItem, TaskType } from "@/lib/devtrack-types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  app: AppItem;
  onShowHistory: () => void;
}

export function AppRowActions({ app, onShowHistory }: Props) {
  const developers = useDevelopers();
  const developerOptions =
    developers.some((d) => d.name === app.developer)
      ? developers
      : [{ id: `archived-${app.id}`, name: app.developer }, ...developers];
  const [open, setOpen] = useState(false);
  const [taskType, setTaskType] = useState<TaskType>("");
  const [developer, setDeveloper] = useState<string>(app.developer);

  function submitNextTask() {
    const cleanTask = taskType.trim();
    if (!cleanTask) {
      toast.error("Enter task name");
      return;
    }
    if (!developer) {
      toast.error("Select a developer");
      return;
    }
    void appsApi.startNextTask(app.id, { taskType: cleanTask, developer }).then(
      () => {
        toast.success(`Started ${cleanTask} for "${app.name}"`);
        setOpen(false);
      },
      (error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Could not start next task"),
    );
  }

  return (
    <>
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
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onShowHistory}>
              <History className="h-4 w-4" /> Activity & sessions
            </DropdownMenuItem>
            {app.status === "Completed" && (
              <DropdownMenuItem
                onClick={() => {
                  setDeveloper(app.developer);
                  setTaskType("");
                  setOpen(true);
                }}
              >
                <RotateCcw className="h-4 w-4" /> Start next task
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start next task cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`next-task-${app.id}`}>Task name</Label>
              <Input
                id={`next-task-${app.id}`}
                placeholder="e.g. Bug fixes, v2 redesign"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Developer</Label>
              <Select value={developer} onValueChange={setDeveloper}>
                <SelectTrigger>
                  <SelectValue placeholder="Select developer" />
                </SelectTrigger>
                <SelectContent>
                  {developerOptions.map((d) => (
                    <SelectItem key={d.id} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="hero" onClick={submitNextTask}>
              Start task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}