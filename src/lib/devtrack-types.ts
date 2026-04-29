export type Platform = "iOS" | "Android" | "Web";
export type Status = "Active" | "Paused" | "Completed";

export type ActivityType =
  | "created"
  | "paused"
  | "resumed"
  | "completed"
  | "reopened";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  at: number; // ms epoch
  note?: string;
}

export interface WorkSession {
  id: string;
  start: number;
  end: number | null; // null = open session
}

export interface AppItem {
  id: string;
  name: string;
  platform: Platform;
  developer: string;
  status: Status;
  createdAt: number;
  completedAt: number | null;
  sessions: WorkSession[]; // first session opens at createdAt
  activity: ActivityEvent[];
}

export const PLATFORMS: Platform[] = ["iOS", "Android", "Web"];
export const STATUSES: Status[] = ["Active", "Paused", "Completed"];