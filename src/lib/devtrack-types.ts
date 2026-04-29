export type Platform = "iOS" | "Android" | "Web";
export type Status = "Active" | "Paused" | "Completed";
export type TaskType = "First Release" | "Update";
export const TASK_TYPES: TaskType[] = ["First Release", "Update"];

export type ActivityType =
  | "created"
  | "paused"
  | "resumed"
  | "completed"
  | "reopened"
  | "task_assigned"
  | "developer_changed";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  at: number; // ms epoch
  note?: string;
  taskType?: TaskType;
  developer?: string;
}

export interface WorkSession {
  id: string;
  start: number;
  end: number | null; // null = open session
  developer?: string;
  taskType?: TaskType;
}

export interface AppItem {
  id: string;
  name: string;
  platform: Platform;
  developer: string;
  taskType: TaskType;
  status: Status;
  createdAt: number;
  completedAt: number | null;
  sessions: WorkSession[]; // first session opens at createdAt
  activity: ActivityEvent[];
}

export const PLATFORMS: Platform[] = ["iOS", "Android", "Web"];
export const STATUSES: Status[] = ["Active", "Paused", "Completed"];