import AsyncStorage from "@react-native-async-storage/async-storage";
import {useCallback, useEffect, useState} from "react";

const LEGACY_STORAGE_PREFIX = "rhnative.visual-mode.v1";
const STORAGE_PREFIX = "rhnative.visual-mode.v2";

export type VisualMode = "georgia" | "river" | "sonny" | "evergreen" | "navy";

function storageKey(userId: string | null | undefined, prefix = STORAGE_PREFIX): string {
    return `${prefix}.${userId ?? "local"}`;
}

function normalizeVisualMode(value: string | null): VisualMode {
    if (value === "georgia" || value === "river" || value === "sonny" || value === "evergreen" || value === "navy") return value;
    return "river";
}

function normalizeLegacyVisualMode(value: string | null): VisualMode {
    if (value === "georgia") return "sonny";
    if (value === "sunset" || value === "warm") return "georgia";
    if (value === "surfSide" || value === "copper") return "river";
    return "river";
}

export async function clearVisualModeStorage(userId?: string | null): Promise<void> {
    await Promise.all([
        AsyncStorage.removeItem(storageKey(userId ?? null)),
        AsyncStorage.removeItem(storageKey(userId ?? null, LEGACY_STORAGE_PREFIX)),
    ]);
}

export function useVisualMode(userId?: string | null) {
    const [mode, setModeState] = useState<VisualMode>("river");
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function hydrate() {
            try {
                const raw = await AsyncStorage.getItem(storageKey(userId ?? null));
                const legacyRaw = raw === null
                    ? await AsyncStorage.getItem(storageKey(userId ?? null, LEGACY_STORAGE_PREFIX))
                    : null;
                if (!mounted) return;
                const nextMode = raw === null ? normalizeLegacyVisualMode(legacyRaw) : normalizeVisualMode(raw);
                setModeState(nextMode);
                if (raw === null && legacyRaw !== null) {
                    void AsyncStorage.setItem(storageKey(userId ?? null), nextMode);
                }
            } catch (error) {
                console.warn("Visual mode hydrate error", error);
            } finally {
                if (mounted) setIsLoaded(true);
            }
        }

        setIsLoaded(false);
        void hydrate();

        return () => {
            mounted = false;
        };
    }, [userId]);

    const setMode = useCallback(
        (nextMode: VisualMode) => {
            setModeState(nextMode);
            void AsyncStorage.setItem(storageKey(userId ?? null), nextMode);
        },
        [userId],
    );

    return {
        mode,
        isLoaded,
        setMode,
    };
}
