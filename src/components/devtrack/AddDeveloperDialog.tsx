import { useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
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
import { developersApi, useDevelopers } from "@/lib/devtrack-store";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(1, "Developer name required").max(60, "Max 60 chars"),
});

export function AddDeveloperDialog() {
  const developers = useDevelopers();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add developer";
      setError(message);
      toast.error(message);
    }
  }

  async function removeDeveloper(id: string, developerName: string) {
    try {
      setRemovingId(id);
      await developersApi.archive(id);
      toast.success(`Removed "${developerName}" from active developers`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not remove developer";
      toast.error(message);
    } finally {
      setRemovingId(null);
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
          <DialogDescription>
            Manage active developers. Removing keeps historical app data unchanged.
          </DialogDescription>
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
          <div className="space-y-2">
            <Label>Active developers</Label>
            {developers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active developers yet.</p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                {developers.map((developer) => {
                  const isRemoving = removingId === developer.id;
                  return (
                    <div key={developer.id} className="flex items-center justify-between gap-2 rounded-sm px-2 py-1">
                      <span className="text-sm">{developer.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        disabled={isRemoving}
                        onClick={() => removeDeveloper(developer.id, developer.name)}
                      >
                        {isRemoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
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
