import { useState } from "react";
import { z } from "zod";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appsApi, useDevelopers } from "@/lib/devtrack-store";
import type { Platform, TaskType } from "@/lib/devtrack-types";
import { PLATFORMS, TASK_TYPES } from "@/lib/devtrack-types";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(1, "App name required").max(80, "Max 80 chars"),
  developer: z.string().trim().min(1, "Developer name required").max(60, "Max 60 chars"),
  platform: z.enum(["iOS", "Android", "Web"]),
  taskType: z.enum(["First Release", "Update"]),
});

export function NewAppDialog() {
  const developers = useDevelopers();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [developer, setDeveloper] = useState<string>("");
  const [platform, setPlatform] = useState<Platform>("iOS");
  const [taskType, setTaskType] = useState<TaskType>("First Release");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setName("");
    setDeveloper("");
    setPlatform("iOS");
    setTaskType("First Release");
    setErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ name, developer, platform, taskType });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        fe[i.path[0] as string] = i.message;
      });
      setErrors(fe);
      return;
    }
    try {
      await appsApi.create({
        name: parsed.data.name as string,
        developer: parsed.data.developer as string,
        platform: parsed.data.platform as Platform,
        taskType: parsed.data.taskType as TaskType,
      });
      toast.success(`Created "${parsed.data.name}" — tracking started`);
      reset();
      setOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create app. Please try again.";
      setErrors((prev) => ({ ...prev, name: message }));
      toast.error(message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="hero" size="sm">
          <Plus className="h-4 w-4" />
          New App
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Track a new app</DialogTitle>
          <DialogDescription>
            Time tracking starts immediately. You can pause or complete anytime.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">App name</Label>
            <Input
              id="name"
              placeholder="e.g. Aurora Wallet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoFocus
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Developer</Label>
            <Select value={developer} onValueChange={setDeveloper}>
              <SelectTrigger>
                <SelectValue placeholder="Select developer" />
              </SelectTrigger>
              <SelectContent>
                {developers.map((d) => (
                  <SelectItem key={d.id} value={d.name}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {developers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Add a developer first from the top bar.
              </p>
            )}
            {errors.developer && <p className="text-xs text-destructive">{errors.developer}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Task</Label>
            <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((task) => (
                  <SelectItem key={task} value={task}>
                    {task}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.taskType && <p className="text-xs text-destructive">{errors.taskType}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={developers.length === 0}>
              Start tracking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}