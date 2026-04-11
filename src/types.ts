export type TaskStatus = "todo" | "in_progress" | "completed";

export type TaskPriority = "low" | "medium" | "high";
export type TaskSource = "manual" | "google_calendar";

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  order: number;
  createdAt: string;
  source: TaskSource;
  externalId: string | null;
  externalUpdatedAt: string | null;
}
