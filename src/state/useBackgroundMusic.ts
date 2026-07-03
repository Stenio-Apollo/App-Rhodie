import AsyncStorage from "@react-native-async-storage/async-storage";
import {useCallback, useEffect, useState} from "react";

const STORAGE_PREFIX = "rhnative.background-music.v1";

export type BackgroundMusicTrackId = "silent" | "forest" | "alpine" | "thunder" | "waves";

export interface BackgroundMusicOption {
    id: BackgroundMusicTrackId;
    label: string;
    icon: "leaf" | "paw" | "flash" | "water" | "volume-mute";
}

export const BACKGROUND_MUSIC_OPTIONS: BackgroundMusicOption[] = [
    {id: "forest", label: "Forest", icon: "leaf"},
    {id: "alpine", label: "Alpine", icon: "paw"},
    {id: "thunder", label: "Thunder", icon: "flash"},
    {id: "waves", label: "Waves", icon: "water"},
    {id: "silent", label: "Silent", icon: "volume-mute"},
];

const DEFAULT_BACKGROUND_MUSIC_TRACK: BackgroundMusicTrackId = "forest";

function storageKey(userId: string | null | undefined): string {
    return `${STORAGE_PREFIX}.${userId ?? "local"}`;
}

function normalizeTrackId(value: string | null): BackgroundMusicTrackId {
    if (value === "silent" || value === "forest" || value === "alpine" || value === "thunder" || value === "waves") {
        return value;
    }
    return DEFAULT_BACKGROUND_MUSIC_TRACK;
}

export async function clearBackgroundMusicStorage(userId?: string | null): Promise<void> {
    await AsyncStorage.removeItem(storageKey(userId ?? null));
}

export function useBackgroundMusic(userId?: string | null) {
    const [trackId, setTrackIdState] = useState<BackgroundMusicTrackId>(DEFAULT_BACKGROUND_MUSIC_TRACK);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function hydrate() {
            try {
                const raw = await AsyncStorage.getItem(storageKey(userId ?? null));
                if (!mounted) return;
                setTrackIdState(normalizeTrackId(raw));
            } catch (error) {
                console.warn("Background music hydrate error", error);
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

    const setTrackId = useCallback(
        (nextTrackId: BackgroundMusicTrackId) => {
            setTrackIdState(nextTrackId);
            void AsyncStorage.setItem(storageKey(userId ?? null), nextTrackId);
        },
        [userId],
    );

    return {
        trackId,
        isLoaded,
        setTrackId,
    };
}
