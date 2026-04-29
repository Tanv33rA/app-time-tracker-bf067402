import { useState } from "react";
import { UserPlus } from "lucide-react";
import { z } from "zod";
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
import { developersApi } from "@/lib/devtrack-store";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(1, "Developer name required").max(60, "Max 60 chars"),
});

export function AddDeveloperDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setName("");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid developer name");
      return;
    }
    try {
      await developersApi.create({ name: parsed.data.name });
      toast.success(`Added developer "${parsed.data.name}"`);
      reset();
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add developer";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="soft" size="sm">
          <UserPlus className="h-4 w-4" /> Add Developer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add developer</DialogTitle>
          <DialogDescription>Developer name must be unique.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="developer-name">Developer name</Label>
            <Input
              id="developer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya Chen"
              maxLength={60}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero">
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
