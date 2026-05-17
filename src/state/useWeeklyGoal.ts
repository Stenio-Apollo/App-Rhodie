import {useCallback, useEffect, useRef, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type WeeklyGoal = {
    text: string;
    presetId: string | null;
    weekStartDate: string;
    updatedAt: string;
    achievedAt: string | null;
    lastCheckedAt: string | null;
};

export type WeeklyGoalProgress = {
    points: number;
    badges: number;
    updatedAt: string;
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

const GOAL_STORAGE_PREFIX = "rhnative.weeklyGoal.v1";
const PROGRESS_STORAGE_PREFIX = "rhnative.weeklyGoal.progress.v1";

function formatLocalISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function getCurrentWeekStartDate(date = new Date()): string {
    const start = new Date(date);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return formatLocalISODate(start);
}

function goalStorageKey(userId: string | null | undefined): string {
    return `${GOAL_STORAGE_PREFIX}.${userId ?? "local"}`;
}

function progressStorageKey(userId: string | null | undefined): string {
    return `${PROGRESS_STORAGE_PREFIX}.${userId ?? "local"}`;
}

function parseWeeklyGoal(raw: string | null, weekStartDate: string): {goal: WeeklyGoal | null; didNormalize: boolean} {
    if (!raw) return {goal: null, didNormalize: false};

    try {
        const parsed = JSON.parse(raw) as WeeklyGoal;
        if (
            typeof parsed.text !== "string" ||
            parsed.text.trim().length === 0
        ) {
            return {goal: null, didNormalize: false};
        }

        const isCurrentWeek = parsed.weekStartDate === weekStartDate;
        const normalizedNow = new Date().toISOString();
        return {
            goal: {
                text: parsed.text,
                presetId: typeof parsed.presetId === "string" ? parsed.presetId : null,
                weekStartDate,
                updatedAt: isCurrentWeek && typeof parsed.updatedAt === "string" ? parsed.updatedAt : normalizedNow,
                achievedAt: isCurrentWeek && typeof parsed.achievedAt === "string" ? parsed.achievedAt : null,
                lastCheckedAt: isCurrentWeek && typeof parsed.lastCheckedAt === "string" ? parsed.lastCheckedAt : null,
            },
            didNormalize: !isCurrentWeek,
        };
    } catch {
        return {goal: null, didNormalize: false};
    }
}

export async function clearWeeklyGoalStorage(userId: string | null | undefined): Promise<void> {
    await Promise.all([
        AsyncStorage.removeItem(goalStorageKey(userId)),
        AsyncStorage.removeItem(progressStorageKey(userId)),
    ]);
}

function parseWeeklyGoalProgress(raw: string | null): WeeklyGoalProgress {
    if (!raw) {
        return {points: 0, badges: 0, updatedAt: new Date().toISOString()};
    }

    try {
        const parsed = JSON.parse(raw) as Partial<WeeklyGoalProgress>;
        const points = typeof parsed.points === "number" && parsed.points > 0 ? Math.floor(parsed.points) : 0;
        return {
            points,
            badges: Math.floor(points / 3),
            updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
        };
    } catch {
        return {points: 0, badges: 0, updatedAt: new Date().toISOString()};
    }
}

export function useWeeklyGoal(userId: string | null | undefined) {
    const [weekStartDate, setWeekStartDate] = useState(() => getCurrentWeekStartDate());
    const [goal, setGoal] = useState<WeeklyGoal | null>(null);
    const [progress, setProgress] = useState<WeeklyGoalProgress>({points: 0, badges: 0, updatedAt: new Date().toISOString()});
    const [isLoaded, setIsLoaded] = useState(false);
    const goalRef = useRef<WeeklyGoal | null>(null);
    const progressRef = useRef<WeeklyGoalProgress>(progress);

    useEffect(() => {
        goalRef.current = goal;
    }, [goal]);

    useEffect(() => {
        progressRef.current = progress;
    }, [progress]);

    useEffect(() => {
        const interval = setInterval(() => {
            const nextWeekStartDate = getCurrentWeekStartDate();
            setWeekStartDate((current) => (current === nextWeekStartDate ? current : nextWeekStartDate));
        }, 60_000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let mounted = true;

        async function hydrate() {
            setIsLoaded(false);
            const [goalRaw, progressRaw] = await Promise.all([
                AsyncStorage.getItem(goalStorageKey(userId)),
                AsyncStorage.getItem(progressStorageKey(userId)),
            ]);
            if (!mounted) return;
            const parsedGoal = parseWeeklyGoal(goalRaw, weekStartDate);
            setGoal(parsedGoal.goal);
            setProgress(parseWeeklyGoalProgress(progressRaw));
            if (parsedGoal.goal && parsedGoal.didNormalize) {
                await AsyncStorage.setItem(goalStorageKey(userId), JSON.stringify(parsedGoal.goal));
            }
            if (!mounted) return;
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
            await AsyncStorage.setItem(goalStorageKey(userId), JSON.stringify(nextGoal));
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

            const currentProgress = progressRef.current;
            const canAwardPoint = achieved && !current.achievedAt;
            const nextPoints = canAwardPoint ? currentProgress.points + 1 : currentProgress.points;
            const nextProgress: WeeklyGoalProgress = {
                points: nextPoints,
                badges: Math.floor(nextPoints / 3),
                updatedAt: checkedAt,
            };

            goalRef.current = nextGoal;
            setGoal(nextGoal);
            progressRef.current = nextProgress;
            setProgress(nextProgress);
            await Promise.all([
                AsyncStorage.setItem(goalStorageKey(userId), JSON.stringify(nextGoal)),
                AsyncStorage.setItem(progressStorageKey(userId), JSON.stringify(nextProgress)),
            ]);
        },
        [userId],
    );

    const clearGoal = useCallback(async () => {
        setGoal(null);
        await AsyncStorage.removeItem(goalStorageKey(userId));
    }, [userId]);

    return {
        goal,
        progress,
        isLoaded,
        weekStartDate,
        presets: WEEKLY_GOAL_PRESETS,
        saveGoal,
        recordGoalCheck,
        clearGoal,
    };
}
