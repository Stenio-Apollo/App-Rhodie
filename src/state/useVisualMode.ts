import AsyncStorage from "@react-native-async-storage/async-storage";
import {useCallback, useEffect, useState} from "react";

const STORAGE_PREFIX = "rhnative.visual-mode.v1";

export type VisualMode = "cool" | "warm";

function storageKey(userId: string | null | undefined): string {
    return `${STORAGE_PREFIX}.${userId ?? "local"}`;
}

function normalizeVisualMode(value: string | null): VisualMode {
    return value === "warm" ? "warm" : "cool";
}

export async function clearVisualModeStorage(userId?: string | null): Promise<void> {
    await AsyncStorage.removeItem(storageKey(userId ?? null));
}

export function useVisualMode(userId?: string | null) {
    const [mode, setModeState] = useState<VisualMode>("cool");
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function hydrate() {
            const raw = await AsyncStorage.getItem(storageKey(userId ?? null));
            if (!mounted) return;
            setModeState(normalizeVisualMode(raw));
            setIsLoaded(true);
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
