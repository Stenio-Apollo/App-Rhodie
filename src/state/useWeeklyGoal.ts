import {useCallback, useEffect, useRef, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {toLocalISODate} from "../lib/date-utils";
import {supabase} from "../lib/supabase";

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

type WeeklyGoalRow = {
    user_id: string;
    text: string;
    preset_id: string | null;
    week_start_date: string;
    updated_at: string;
    achieved_at: string | null;
    last_checked_at: string | null;
};

type WeeklyGoalProgressRow = {
    user_id: string;
    points: number;
    updated_at: string;
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

export function getCurrentWeekStartDate(date = new Date()): string {
    const start = new Date(date);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return toLocalISODate(start);
}

function goalStorageKey(userId: string | null | undefined): string {
    return `${GOAL_STORAGE_PREFIX}.${userId ?? "local"}`;
}

function progressStorageKey(userId: string | null | undefined): string {
    return `${PROGRESS_STORAGE_PREFIX}.${userId ?? "local"}`;
}

function normalizeGoalForWeek(goal: WeeklyGoal, weekStartDate: string): {goal: WeeklyGoal; didNormalize: boolean} {
    const isCurrentWeek = goal.weekStartDate === weekStartDate;
    if (isCurrentWeek) return {goal, didNormalize: false};
    const normalizedNow = new Date().toISOString();
    return {
        goal: {
            text: goal.text,
            presetId: goal.presetId,
            weekStartDate,
            updatedAt: normalizedNow,
            achievedAt: null,
            lastCheckedAt: null,
        },
        didNormalize: true,
    };
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

        const candidate: WeeklyGoal = {
            text: parsed.text,
            presetId: typeof parsed.presetId === "string" ? parsed.presetId : null,
            weekStartDate: typeof parsed.weekStartDate === "string" ? parsed.weekStartDate : weekStartDate,
            updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
            achievedAt: typeof parsed.achievedAt === "string" ? parsed.achievedAt : null,
            lastCheckedAt: typeof parsed.lastCheckedAt === "string" ? parsed.lastCheckedAt : null,
        };
        return normalizeGoalForWeek(candidate, weekStartDate);
    } catch {
        return {goal: null, didNormalize: false};
    }
}

function mapGoalRow(row: WeeklyGoalRow): WeeklyGoal {
    return {
        text: row.text,
        presetId: row.preset_id,
        weekStartDate: row.week_start_date,
        updatedAt: row.updated_at,
        achievedAt: row.achieved_at,
        lastCheckedAt: row.last_checked_at,
    };
}

function goalToRow(userId: string, goal: WeeklyGoal): WeeklyGoalRow {
    return {
        user_id: userId,
        text: goal.text,
        preset_id: goal.presetId,
        week_start_date: goal.weekStartDate,
        updated_at: goal.updatedAt,
        achieved_at: goal.achievedAt,
        last_checked_at: goal.lastCheckedAt,
    };
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

function makeProgress(points: number): WeeklyGoalProgress {
    const safePoints = Math.max(0, Math.floor(points));
    return {
        points: safePoints,
        badges: Math.floor(safePoints / 3),
        updatedAt: new Date().toISOString(),
    };
}

async function pushGoalToRemote(userId: string, goal: WeeklyGoal): Promise<void> {
    const row = goalToRow(userId, goal);
    console.log("[weeklyGoal] pushGoalToRemote start", JSON.stringify(row));
    const {error} = await supabase
        .from("weekly_goals")
        .upsert(row, {onConflict: "user_id,week_start_date"});
    if (error) {
        console.warn("[weeklyGoal] upsert error", JSON.stringify(error));
        throw error;
    } else {
        console.log("[weeklyGoal] upsert ok");
    }
}

async function pushProgressToRemote(userId: string, progress: WeeklyGoalProgress): Promise<void> {
    const row = {
        user_id: userId,
        points: progress.points,
        updated_at: progress.updatedAt,
    };
    console.log("[weeklyGoal] pushProgressToRemote start", JSON.stringify(row));
    const {error} = await supabase.from("weekly_goal_progress").upsert(row, {onConflict: "user_id"});
    if (error) {
        console.warn("[weeklyGoal] progress upsert error", JSON.stringify(error));
        throw error;
    } else {
        console.log("[weeklyGoal] progress upsert ok");
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
            console.log("[weeklyGoal] hydrate start", {userId, weekStartDate});
            setIsLoaded(false);

            // 1. Load local immediately (offline-first)
            const [goalRaw, progressRaw] = await Promise.all([
                AsyncStorage.getItem(goalStorageKey(userId)),
                AsyncStorage.getItem(progressStorageKey(userId)),
            ]);
            if (!mounted) return;
            const parsedGoal = parseWeeklyGoal(goalRaw, weekStartDate);
            const localProgress = parseWeeklyGoalProgress(progressRaw);
            console.log("[weeklyGoal] hydrate: local loaded", {
                hasGoal: Boolean(parsedGoal.goal),
                localPoints: localProgress.points,
            });
            setGoal(parsedGoal.goal);
            setProgress(localProgress);
            if (parsedGoal.goal && parsedGoal.didNormalize) {
                await AsyncStorage.setItem(goalStorageKey(userId), JSON.stringify(parsedGoal.goal));
            }

            // 2. If signed out, nothing to sync
            if (!userId) {
                console.log("[weeklyGoal] hydrate: no userId, skipping remote sync");
                if (!mounted) return;
                setIsLoaded(true);
                return;
            }

            // 3. Pull from Supabase
            console.log("[weeklyGoal] hydrate: pulling from Supabase");
            const [goalResult, progressResult] = await Promise.all([
                supabase
                    .from("weekly_goals")
                    .select("*")
                    .eq("user_id", userId)
                    .eq("week_start_date", weekStartDate)
                    .maybeSingle(),
                supabase.from("weekly_goal_progress").select("*").eq("user_id", userId).maybeSingle(),
            ]);
            if (!mounted) return;

            // 4. Reconcile goal — most-recently-updated wins
            const remoteGoal = goalResult.error
                ? null
                : (goalResult.data as WeeklyGoalRow | null);
            if (goalResult.error) {
                console.warn("Weekly goal load error", goalResult.error.message);
            }

            if (remoteGoal) {
                const remoteParsed = normalizeGoalForWeek(mapGoalRow(remoteGoal), weekStartDate);
                const remoteUpdatedAt = remoteParsed.goal.updatedAt;
                const localUpdatedAt = parsedGoal.goal?.updatedAt ?? "";

                if (parsedGoal.goal && localUpdatedAt > remoteUpdatedAt) {
                    // Local is newer — push up
                    void pushGoalToRemote(userId, parsedGoal.goal).catch((error) => {
                        console.warn("Weekly goal push error", error.message);
                    });
                } else {
                    // Remote wins (or local missing) — adopt it
                    setGoal(remoteParsed.goal);
                    await AsyncStorage.setItem(goalStorageKey(userId), JSON.stringify(remoteParsed.goal));
                    if (remoteParsed.didNormalize) {
                        // We normalized a stale-week goal; persist the normalized form remotely too
                        void pushGoalToRemote(userId, remoteParsed.goal).catch((error) => {
                            console.warn("Weekly goal normalized push error", error.message);
                        });
                    }
                }
            } else if (parsedGoal.goal) {
                // No remote yet — migrate local up
                void pushGoalToRemote(userId, parsedGoal.goal).catch((error) => {
                    console.warn("Weekly goal migration push error", error.message);
                });
            }

            // 5. Reconcile progress — max points wins (prevents losing badges)
            const remoteProgressRow = progressResult.error
                ? null
                : (progressResult.data as WeeklyGoalProgressRow | null);
            if (progressResult.error) {
                console.warn("Weekly goal progress load error", progressResult.error.message);
            }
            const remotePoints = remoteProgressRow?.points ?? 0;
            const winningPoints = Math.max(localProgress.points, remotePoints);
            if (winningPoints !== localProgress.points || winningPoints !== remotePoints || !remoteProgressRow) {
                const winningProgress = makeProgress(winningPoints);
                setProgress(winningProgress);
                await AsyncStorage.setItem(progressStorageKey(userId), JSON.stringify(winningProgress));
                if (winningPoints !== remotePoints || !remoteProgressRow) {
                    void pushProgressToRemote(userId, winningProgress).catch((error) => {
                        console.warn("Weekly goal progress push error", error.message);
                    });
                }
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
            if (userId) {
                console.log("[weeklyGoal] saveGoal: pushing to remote", {userId});
                void pushGoalToRemote(userId, nextGoal).catch((error) => {
                    console.warn("Weekly goal background push error", error.message);
                });
            } else {
                console.warn("[weeklyGoal] saveGoal: no userId, remote push SKIPPED");
            }
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
            if (userId) {
                console.log("[weeklyGoal] recordGoalCheck: pushing to remote", {userId, achieved, points: nextPoints});
                await Promise.all([
                    pushGoalToRemote(userId, nextGoal),
                    pushProgressToRemote(userId, nextProgress),
                ]);
            } else {
                console.warn("[weeklyGoal] recordGoalCheck: no userId, remote push SKIPPED");
            }
        },
        [userId],
    );

    const clearGoal = useCallback(async () => {
        setGoal(null);
        await AsyncStorage.removeItem(goalStorageKey(userId));
        if (userId) {
            const {error} = await supabase.from("weekly_goals").delete().eq("user_id", userId);
            if (error) console.warn("Weekly goal delete error", error.message);
        }
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
