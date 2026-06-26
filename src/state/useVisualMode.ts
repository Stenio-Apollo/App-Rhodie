import AsyncStorage from "@react-native-async-storage/async-storage";
import {useCallback, useEffect, useState} from "react";

const STORAGE_PREFIX = "rhnative.visual-mode.v1";

export type VisualMode = "overcast" | "sunset";

function storageKey(userId: string | null | undefined): string {
    return `${STORAGE_PREFIX}.${userId ?? "local"}`;
}

function normalizeVisualMode(value: string | null): VisualMode {
    return value === "sunset" || value === "warm" ? "sunset" : "overcast";
}

export async function clearVisualModeStorage(userId?: string | null): Promise<void> {
    await AsyncStorage.removeItem(storageKey(userId ?? null));
}

export function useVisualMode(userId?: string | null) {
    const [mode, setModeState] = useState<VisualMode>("overcast");
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function hydrate() {
            try {
                const raw = await AsyncStorage.getItem(storageKey(userId ?? null));
                if (!mounted) return;
                setModeState(normalizeVisualMode(raw));
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
