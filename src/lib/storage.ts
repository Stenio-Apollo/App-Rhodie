import AsyncStorage from "@react-native-async-storage/async-storage";
import type {Task} from "../types";
import {decryptString, encryptString, encryptedPlaceholder, type EncryptionKey, looksEncrypted} from "./e2ee";

const STORAGE_PREFIX = "rhnative.tasks.v2";
const LEGACY_STORAGE_KEY = "rhnative.tasks.v1";

type StoredTask = Task & {
    titleEncrypted?: string | null;
    descriptionEncrypted?: string | null;
};

function storageKey(userId: string | null | undefined): string {
    return `${STORAGE_PREFIX}.${userId ?? "local"}`;
}

function decryptTaskField(key: EncryptionKey | null | undefined, encrypted: string | null | undefined, fallback: string): string {
    if (key && encrypted && looksEncrypted(encrypted)) {
        try {
            return decryptString(key, encrypted);
        } catch (error) {
            console.warn("Task storage decrypt error", error);
        }
    }
    return fallback;
}

function serializeTasks(tasks: Task[], key?: EncryptionKey | null): StoredTask[] {
    return tasks.map((task) => {
        const titleEncrypted = key ? encryptString(key, task.title) : null;
        const descriptionEncrypted = key && task.description ? encryptString(key, task.description) : null;
        return {
            ...task,
            title: titleEncrypted ? encryptedPlaceholder("encrypted task") : task.title,
            titleEncrypted,
            description: descriptionEncrypted ? encryptedPlaceholder("encrypted task description") : task.description,
            descriptionEncrypted,
        };
    });
}

function parseTasks(raw: string, key?: EncryptionKey | null): Task[] {
    const parsed = JSON.parse(raw) as StoredTask[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((task) => ({
        ...task,
        title: decryptTaskField(key, task.titleEncrypted, typeof task.title === "string" ? task.title : ""),
        description: decryptTaskField(key, task.descriptionEncrypted, typeof task.description === "string" ? task.description : ""),
    }));
}

export async function loadTasks(userId?: string | null, key?: EncryptionKey | null): Promise<Task[]> {
    const scopedKey = storageKey(userId ?? null);
    const [scopedRaw, legacyRaw] = await Promise.all([
        AsyncStorage.getItem(scopedKey),
        AsyncStorage.getItem(LEGACY_STORAGE_KEY),
    ]);
    const raw = scopedRaw ?? legacyRaw;
    if (!raw) return [];

    try {
        const parsed = parseTasks(raw, key);
        if (!scopedRaw && legacyRaw) {
            await AsyncStorage.setItem(scopedKey, JSON.stringify(serializeTasks(parsed, key)));
            await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
        }
        return parsed;
    } catch {
        return [];
    }
}

export async function saveTasks(tasks: Task[], userId?: string | null, key?: EncryptionKey | null): Promise<void> {
    await AsyncStorage.setItem(storageKey(userId ?? null), JSON.stringify(serializeTasks(tasks, key)));
}

export async function clearTasksStorage(userId?: string | null): Promise<void> {
    await Promise.all([
        AsyncStorage.removeItem(storageKey(userId ?? null)),
        AsyncStorage.removeItem(LEGACY_STORAGE_KEY),
    ]);
}
