import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Platform, Status } from "@/lib/devtrack-types";

export type SortKey = "recent" | "oldest" | "duration" | "status" | "name";

export interface FilterState {
  query: string;
  platform: "all" | Platform;
  status: "all" | Status;
  developer: "all" | string;
  sort: SortKey;
}

interface Props {
  state: FilterState;
  developers: string[];
  onChange: (next: FilterState) => void;
}

export function Filters({ state, developers, onChange }: Props) {
  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    onChange({ ...state, [k]: v });

  const dirty =
    state.query !== "" ||
    state.platform !== "all" ||
    state.status !== "all" ||
    state.developer !== "all" ||
    state.sort !== "recent";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3 shadow-card md:flex-row md:items-center">
      <div className="relative flex-1 min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={state.query}
          onChange={(e) => set("query", e.target.value)}
          placeholder="Search apps or developers…"
          className="pl-9"
          maxLength={80}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
        <Select value={state.platform} onValueChange={(v) => set("platform", v as FilterState["platform"])}>
          <SelectTrigger className="md:w-[140px]"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            <SelectItem value="iOS">iOS</SelectItem>
            <SelectItem value="Android">Android</SelectItem>
            <SelectItem value="Web">Web</SelectItem>
          </SelectContent>
        </Select>
        <Select value={state.status} onValueChange={(v) => set("status", v as FilterState["status"])}>
          <SelectTrigger className="md:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Paused">Paused</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={state.developer} onValueChange={(v) => set("developer", v)}>
          <SelectTrigger className="md:w-[160px]"><SelectValue placeholder="Developer" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All developers</SelectItem>
            {developers.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={state.sort} onValueChange={(v) => set("sort", v as SortKey)}>
          <SelectTrigger className="md:w-[160px]"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="duration">Time spent</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
          </SelectContent>
        </Select>
        {dirty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ query: "", platform: "all", status: "all", developer: "all", sort: "recent" })}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}