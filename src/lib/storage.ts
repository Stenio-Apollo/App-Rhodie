import AsyncStorage from "@react-native-async-storage/async-storage";
import type {Task} from "../types";

const STORAGE_KEY = "rhnative.tasks.v1";

export async function loadTasks(): Promise<Task[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw) as Task[];
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch {
        return [];
    }
}

export async function saveTasks(tasks: Task[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export async function clearTasksStorage(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
}
