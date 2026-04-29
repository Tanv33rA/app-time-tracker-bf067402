import { useEffect, useState, useCallback } from "react";
import type { AppItem, Platform, Status } from "./devtrack-types";

const KEY = "devtrack.apps.v1";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

function load(): AppItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

function save(apps: AppItem[]) {
  localStorage.setItem(KEY, JSON.stringify(apps));
}

function seed(): AppItem[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const mk = (
    name: string,
    platform: Platform,
    developer: string,
    daysAgo: number,
    status: Status,
    completedDaysAgo?: number,
  ): AppItem => {
    const createdAt = now - daysAgo * day;
    const completedAt =
      status === "Completed" && completedDaysAgo != null
        ? now - completedDaysAgo * day
        : null;
    const sessionEnd =
      status === "Active" ? null : completedAt ?? now - 1 * day;
    return {
      id: uid(),
      name,
      platform,
      developer,
      status,
      createdAt,
      completedAt,
      sessions: [{ id: uid(), start: createdAt, end: sessionEnd }],
      activity: [
        { id: uid(), type: "created", at: createdAt },
        ...(status === "Paused"
          ? [{ id: uid(), type: "paused" as const, at: sessionEnd ?? now }]
          : []),
        ...(status === "Completed" && completedAt
          ? [{ id: uid(), type: "completed" as const, at: completedAt }]
          : []),
      ],
    };
  };
  return [
    mk("Aurora Wallet", "iOS", "Maya Chen", 22, "Active"),
    mk("Pulse Fitness", "Android", "Daniel Park", 14, "Active"),
    mk("Lumen Notes", "Web", "Sara Ali", 40, "Completed", 5),
    mk("Nimbus Chat", "iOS", "Daniel Park", 9, "Paused"),
    mk("Forge Analytics", "Web", "Maya Chen", 60, "Completed", 12),
    mk("Tide Travel", "Android", "Jonas Weber", 4, "Active"),
  ];
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
let initialized = false;
const listeners = new Set<Listener>();

function init() {
  if (initialized) return;
  state = load();
  initialized = true;
}
function emit() {
  save(state);
  listeners.forEach((l) => l());
}
function setState(next: AppItem[]) {
  state = next;
  emit();
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

export const appsApi = {
  create(input: { name: string; platform: Platform; developer: string }) {
    init();
    const now = Date.now();
    const item: AppItem = {
      id: uid(),
      name: input.name.trim(),
      platform: input.platform,
      developer: input.developer.trim(),
      status: "Active",
      createdAt: now,
      completedAt: null,
      sessions: [{ id: uid(), start: now, end: null }],
      activity: [{ id: uid(), type: "created", at: now }],
    };
    setState([item, ...state]);
    return item;
  },
  pause(id: string) {
    init();
    const now = Date.now();
    setState(
      state.map((a) => {
        if (a.id !== id || a.status !== "Active") return a;
        const sessions = a.sessions.map((s) =>
          s.end == null ? { ...s, end: now } : s,
        );
        return {
          ...a,
          status: "Paused",
          sessions,
          activity: [...a.activity, { id: uid(), type: "paused", at: now }],
        };
      }),
    );
  },
  resume(id: string) {
    init();
    const now = Date.now();
    setState(
      state.map((a) => {
        if (a.id !== id || a.status !== "Paused") return a;
        return {
          ...a,
          status: "Active",
          sessions: [...a.sessions, { id: uid(), start: now, end: null }],
          activity: [...a.activity, { id: uid(), type: "resumed", at: now }],
        };
      }),
    );
  },
  complete(id: string) {
    init();
    const now = Date.now();
    setState(
      state.map((a) => {
        if (a.id !== id || a.status === "Completed") return a;
        const sessions = a.sessions.map((s) =>
          s.end == null ? { ...s, end: now } : s,
        );
        return {
          ...a,
          status: "Completed",
          completedAt: now,
          sessions,
          activity: [...a.activity, { id: uid(), type: "completed", at: now }],
        };
      }),
    );
  },
  reopen(id: string) {
    init();
    const now = Date.now();
    setState(
      state.map((a) => {
        if (a.id !== id || a.status !== "Completed") return a;
        return {
          ...a,
          status: "Active",
          completedAt: null,
          sessions: [...a.sessions, { id: uid(), start: now, end: null }],
          activity: [...a.activity, { id: uid(), type: "reopened", at: now }],
        };
      }),
    );
  },
  remove(id: string) {
    init();
    setState(state.filter((a) => a.id !== id));
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