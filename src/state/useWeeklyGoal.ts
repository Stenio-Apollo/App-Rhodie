import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type WeeklyGoal = {
    text: string;
    presetId: string | null;
    weekStartDate: string;
    updatedAt: string;
    achievedAt: string | null;
    lastCheckedAt: string | null;
};

export type WeeklyGoalPreset = {
    id: string;
    title: string;
    description: string;
};

export const WEEKLY_GOAL_PRESETS: WeeklyGoalPreset[] = [
    {
        id: "move-three-times",
        title: "Move 3 times",
        description: "Complete three intentional movement sessions.",
    },
    {
        id: "daily-plan",
        title: "Plan each day",
        description: "Set a simple plan before the day gets moving.",
    },
    {
        id: "one-priority",
        title: "Finish one priority",
        description: "Complete one meaningful task each day.",
    },
    {
        id: "journal-check-in",
        title: "Journal check-in",
        description: "Write one honest journal entry this week.",
    },
];

const STORAGE_PREFIX = "rhnative.weeklyGoal.v1";

function formatLocalISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function getCurrentWeekStartDate(date = new Date()): string {
    const start = new Date(date);
    const day = start.getDay();
    const distanceFromMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - distanceFromMonday);
    start.setHours(0, 0, 0, 0);
    return formatLocalISODate(start);
}

function storageKey(userId: string | null | undefined): string {
    return `${STORAGE_PREFIX}.${userId ?? "local"}`;
}

function parseWeeklyGoal(raw: string | null, weekStartDate: string): WeeklyGoal | null {
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as WeeklyGoal;
        if (
            typeof parsed.text !== "string" ||
            parsed.text.trim().length === 0 ||
            parsed.weekStartDate !== weekStartDate
        ) {
            return null;
        }

        return {
            text: parsed.text,
            presetId: typeof parsed.presetId === "string" ? parsed.presetId : null,
            weekStartDate: parsed.weekStartDate,
            updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
            achievedAt: typeof parsed.achievedAt === "string" ? parsed.achievedAt : null,
            lastCheckedAt: typeof parsed.lastCheckedAt === "string" ? parsed.lastCheckedAt : null,
        };
    } catch {
        return null;
    }
}

export async function clearWeeklyGoalStorage(userId: string | null | undefined): Promise<void> {
    await AsyncStorage.removeItem(storageKey(userId));
}

export function useWeeklyGoal(userId: string | null | undefined) {
    const weekStartDate = useMemo(() => getCurrentWeekStartDate(), []);
    const [goal, setGoal] = useState<WeeklyGoal | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const goalRef = useRef<WeeklyGoal | null>(null);

    useEffect(() => {
        goalRef.current = goal;
    }, [goal]);

    useEffect(() => {
        let mounted = true;

        async function hydrate() {
            setIsLoaded(false);
            const raw = await AsyncStorage.getItem(storageKey(userId));
            if (!mounted) return;
            setGoal(parseWeeklyGoal(raw, weekStartDate));
            setIsLoaded(true);
        }

        void hydrate();

        return () => {
            mounted = false;
        };
    }, [userId, weekStartDate]);

    const saveGoal = useCallback(
        async (payload: {text: string; presetId?: string | null}) => {
            const trimmed = payload.text.trim();
            if (!trimmed) return;

            const nextGoal: WeeklyGoal = {
                text: trimmed,
                presetId: payload.presetId ?? null,
                weekStartDate,
                updatedAt: new Date().toISOString(),
                achievedAt: null,
                lastCheckedAt: null,
            };

            setGoal(nextGoal);
            await AsyncStorage.setItem(storageKey(userId), JSON.stringify(nextGoal));
        },
        [userId, weekStartDate],
    );

    const recordGoalCheck = useCallback(
        async (achieved: boolean) => {
            const current = goalRef.current;
            if (!current) return;

            const checkedAt = new Date().toISOString();
            const nextGoal: WeeklyGoal = {
                ...current,
                achievedAt: achieved ? checkedAt : null,
                lastCheckedAt: checkedAt,
                updatedAt: checkedAt,
            };

            goalRef.current = nextGoal;
            setGoal(nextGoal);
            await AsyncStorage.setItem(storageKey(userId), JSON.stringify(nextGoal));
        },
        [userId],
    );

    const clearGoal = useCallback(async () => {
        setGoal(null);
        await clearWeeklyGoalStorage(userId);
    }, [userId]);

    return {
        goal,
        isLoaded,
        weekStartDate,
        presets: WEEKLY_GOAL_PRESETS,
        saveGoal,
        recordGoalCheck,
        clearGoal,
    };
}
