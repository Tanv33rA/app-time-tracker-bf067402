import { useEffect, useState, useCallback } from "react";
import type { AppItem, Platform, TaskType } from "./devtrack-types";

export interface DeveloperItem {
  id: string;
  name: string;
}

export function totalMs(app: AppItem, nowMs: number): number {
  return app.sessions.reduce((sum, s) => {
    const end = s.end ?? (app.status === "Active" ? nowMs : s.start);
    return sum + Math.max(0, end - s.start);
  }, 0);
}

// ---- store ----
type Listener = () => void;
let state: AppItem[] = [];
let developersState: DeveloperItem[] = [];
let initialized = false;
const listeners = new Set<Listener>();

function init() {
  if (initialized) return;
  initialized = true;
  void syncFromServer();
}
function emit() {
  listeners.forEach((l) => l());
}
function setState(next: AppItem[]) {
  state = next;
  emit();
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.message === "string") return data.message;
  } catch {
    // Ignore parse failure.
  }
  return `Request failed with status ${res.status}`;
}

async function syncFromServer() {
  const [appsRes, developersRes] = await Promise.all([
    fetch("/api/apps"),
    fetch("/api/developers"),
  ]);
  if (!appsRes.ok) throw new Error(await parseErrorMessage(appsRes));
  if (!developersRes.ok) throw new Error(await parseErrorMessage(developersRes));

  const apps = (await appsRes.json()) as AppItem[];
  const developers = (await developersRes.json()) as DeveloperItem[];
  developersState = developers;
  setState(apps);
}

async function postAction(url: string, method: "POST" | "DELETE" = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  await syncFromServer();
}

export function useApps() {
  init();
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

export function useDevelopers() {
  init();
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return developersState;
}

export const appsApi = {
  async create(input: { name: string; platform: Platform; developer: string; taskType: TaskType }) {
    init();
    const name = input.name.trim();
    const res = await fetch("/api/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        platform: input.platform,
        developer: input.developer.trim(),
        taskType: input.taskType,
      }),
    });
    if (!res.ok) throw new Error(await parseErrorMessage(res));
    await syncFromServer();
  },
  async pause(id: string) {
    init();
    await postAction(`/api/apps/${id}/pause`);
  },
  async resume(id: string) {
    init();
    await postAction(`/api/apps/${id}/resume`);
  },
  async complete(id: string) {
    init();
    await postAction(`/api/apps/${id}/complete`);
  },
  async reopen(id: string) {
    init();
    await postAction(`/api/apps/${id}/reopen`);
  },
  async startNextTask(id: string, input: { taskType: TaskType; developer: string }) {
    init();
    const res = await fetch(`/api/apps/${id}/start-next-task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskType: input.taskType,
        developer: input.developer.trim(),
      }),
    });
    if (res.status === 404) {
      throw new Error("Next-task endpoint not found. Restart the API server (npm run api or npm run dev:full).");
    }
    if (!res.ok) throw new Error(await parseErrorMessage(res));
    await syncFromServer();
  },
  async remove(id: string) {
    init();
    await postAction(`/api/apps/${id}`, "DELETE");
  },
};

export const developersApi = {
  async create(input: { name: string }) {
    init();
    const res = await fetch("/api/developers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: input.name.trim() }),
    });
    if (!res.ok) throw new Error(await parseErrorMessage(res));
    await syncFromServer();
  },
};

/** Returns a `now` timestamp that ticks every `intervalMs` for live counters. */
export function useTicker(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function useFormattedDuration(app: AppItem) {
  // lightweight ticker per usage; cheap because just a number
  const interval = app.status === "Active" ? 1000 : 60000;
  const now = useTicker(interval);
  return useCallback(() => formatDuration(totalMs(app, now)), [app, now])();
}