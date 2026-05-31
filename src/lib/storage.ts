import AsyncStorage from "@react-native-async-storage/async-storage";
import type {Task} from "../types";

const STORAGE_PREFIX = "rhnative.tasks.v2";
const LEGACY_STORAGE_KEY = "rhnative.tasks.v1";

function storageKey(userId: string | null | undefined): string {
    return `${STORAGE_PREFIX}.${userId ?? "local"}`;
}

export async function loadTasks(userId?: string | null): Promise<Task[]> {
    const scopedKey = storageKey(userId ?? null);
    const [scopedRaw, legacyRaw] = await Promise.all([
        AsyncStorage.getItem(scopedKey),
        AsyncStorage.getItem(LEGACY_STORAGE_KEY),
    ]);
    const raw = scopedRaw ?? legacyRaw;
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw) as Task[];
        if (!Array.isArray(parsed)) return [];
        if (!scopedRaw && legacyRaw) {
            await AsyncStorage.setItem(scopedKey, legacyRaw);
            await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
        }
        return parsed;
    } catch {
        return [];
    }
}

export async function saveTasks(tasks: Task[], userId?: string | null): Promise<void> {
    await AsyncStorage.setItem(storageKey(userId ?? null), JSON.stringify(tasks));
}

export async function clearTasksStorage(userId?: string | null): Promise<void> {
    await Promise.all([
        AsyncStorage.removeItem(storageKey(userId ?? null)),
        AsyncStorage.removeItem(LEGACY_STORAGE_KEY),
    ]);
}
