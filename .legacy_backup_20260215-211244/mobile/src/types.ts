export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  due_date: string | null;
  priority: TaskPriority;
  sort_order: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  title: string;
  sort_order: number;
  user_id: string;
  created_at: string;
  tasks: Task[];
}

export interface Board {
  id: string;
  title: string;
  description: string;
  color: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}
