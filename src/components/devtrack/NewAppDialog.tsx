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
import { appsApi } from "@/lib/devtrack-store";
import type { Platform } from "@/lib/devtrack-types";
import { PLATFORMS } from "@/lib/devtrack-types";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(1, "App name required").max(80, "Max 80 chars"),
  developer: z.string().trim().min(1, "Developer name required").max(60, "Max 60 chars"),
  platform: z.enum(["iOS", "Android", "Web"]),
});

export function NewAppDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [developer, setDeveloper] = useState("");
  const [platform, setPlatform] = useState<Platform>("iOS");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setName("");
    setDeveloper("");
    setPlatform("iOS");
    setErrors({});
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ name, developer, platform });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        fe[i.path[0] as string] = i.message;
      });
      setErrors(fe);
      return;
    }
    appsApi.create(parsed.data);
    toast.success(`Created "${parsed.data.name}" — tracking started`);
    reset();
    setOpen(false);
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
        <Button variant="hero" size="lg">
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
            <Label htmlFor="developer">Developer</Label>
            <Input
              id="developer"
              placeholder="e.g. Maya Chen"
              value={developer}
              onChange={(e) => setDeveloper(e.target.value)}
              maxLength={60}
            />
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
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero">
              Start tracking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}