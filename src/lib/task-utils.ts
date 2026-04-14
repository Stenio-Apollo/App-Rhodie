import type { Task, TaskStatus } from "../types";

export const STATUS_ORDER: TaskStatus[] = ["todo", "completed"];

export function statusLabel(status: TaskStatus): string {
  if (status === "todo") return "To Do";
  return "Completed";
}

export function createTaskId(): string {
  // UUID v4-ish generator to satisfy text/uuid-compatible ids
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function tasksForStatus(tasks: Task[], status: TaskStatus): Task[] {
  return tasks
    .filter((task) => task.status === status)
    .sort((a, b) => a.order - b.order);
}

function clampIndex(index: number, length: number): number {
  if (index < 0) return 0;
  if (index > length) return length;
  return index;
}

export function moveTask(
  tasks: Task[],
  taskId: string,
  toStatus: TaskStatus,
  toIndex: number,
): Task[] {
  const moving = tasks.find((task) => task.id === taskId);
  if (!moving) return tasks;

  const fromStatus = moving.status;

  if (fromStatus === toStatus) {
    const list = tasksForStatus(tasks, fromStatus).filter((task) => task.id !== taskId);
    const idx = clampIndex(toIndex, list.length);
    list.splice(idx, 0, moving);

    return [
      ...tasks.filter((task) => task.status !== fromStatus),
      ...list.map((task, order) => ({ ...task, order, status: fromStatus })),
    ];
  }

  const source = tasksForStatus(tasks, fromStatus).filter((task) => task.id !== taskId);
  const destination = tasksForStatus(tasks, toStatus);
  const idx = clampIndex(toIndex, destination.length);

  destination.splice(idx, 0, { ...moving, status: toStatus });

  return [
    ...tasks.filter((task) => task.status !== fromStatus && task.status !== toStatus),
    ...source.map((task, order) => ({ ...task, order, status: fromStatus })),
    ...destination.map((task, order) => ({ ...task, order, status: toStatus })),
  ];
}
