import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Task } from "../types";

const STORAGE_KEY = "rhnative.tasks.v1";

const seedTasks: Task[] = [
  {
    id: "seed-1",
    title: "Set project goals",
    description: "Define MVP scope and timeline",
    dueDate: null,
    priority: "medium",
    status: "todo",
    order: 0,
    createdAt: new Date().toISOString(),
    source: "manual",
    externalId: null,
    externalUpdatedAt: null,
  },
  {
    id: "seed-2",
    title: "Design board cards",
    description: "Apply modern card visuals and spacing",
    dueDate: null,
    priority: "high",
    status: "in_progress",
    order: 0,
    createdAt: new Date().toISOString(),
    source: "manual",
    externalId: null,
    externalUpdatedAt: null,
  },
];

export async function loadTasks(): Promise<Task[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return seedTasks;

  try {
    const parsed = JSON.parse(raw) as Task[];
    if (!Array.isArray(parsed)) return seedTasks;
    return parsed;
  } catch {
    return seedTasks;
  }
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
