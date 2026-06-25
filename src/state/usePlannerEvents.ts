import {useCallback, useEffect, useRef, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {Session} from "@supabase/supabase-js";
import {supabase} from "../lib/supabase";
import {createId} from "../lib/id";
import {isPlannerEventColor, type PlannerEventColor} from "../lib/planner-colors";
import {syncPlannerEventReminderNotifications} from "../lib/notifications";
import {decryptString, encryptString, encryptedPlaceholder, type EncryptionKey, looksEncrypted} from "../lib/e2ee";
import type {EncryptionState} from "./useEncryption";

export type PlannerEvent = {
    id: string;
    title: string;
    description: string | null;
    startAt: string;
    endAt: string;
    color: PlannerEventColor;
    notifyMinutesBefore: number | null;
    recurrenceRule: string | null;
    recurrenceUntil: string | null;
    createdAt: string;
    updatedAt: string;
};

type PlannerEventRow = {
    id: string;
    user_id: string;
    title: string;
    title_encrypted: string | null;
    description: string | null;
    description_encrypted: string | null;
    start_at: string;
    end_at: string;
    color: string;
    notify_minutes_before: number | null;
    recurrence_rule: string | null;
    recurrence_until: string | null;
    created_at: string;
    updated_at: string;
};

type StoredPlannerEvent = PlannerEvent & {
    titleEncrypted?: string | null;
    descriptionEncrypted?: string | null;
};

export type CreatePlannerEventInput = {
    title: string;
    description?: string | null;
    startAt: string;
    endAt: string;
    color: PlannerEventColor;
    notifyMinutesBefore?: number | null;
};

export type UpdatePlannerEventInput = Partial<{
    title: string;
    description: string | null;
    startAt: string;
    endAt: string;
    color: PlannerEventColor;
    notifyMinutesBefore: number | null;
}>;

const STORAGE_PREFIX = "rhnative.planner.v1";
const DEFAULT_NOTIFY_MINUTES_BEFORE = 15;

function storageKey(userId: string | null | undefined): string {
    return `${STORAGE_PREFIX}.${userId ?? "local"}`;
}

function decryptPlannerText(key: EncryptionKey | null, encrypted: string | null | undefined, fallback: string): string {
    if (key && encrypted && looksEncrypted(encrypted)) {
        try {
            return decryptString(key, encrypted);
        } catch (error) {
            console.warn("[planner] decrypt error", error);
        }
    }
    return fallback;
}

function mapRowToEvent(row: PlannerEventRow, key: EncryptionKey | null = null): PlannerEvent {
    return {
        id: row.id,
        title: decryptPlannerText(key, row.title_encrypted, row.title),
        description: row.description || row.description_encrypted
            ? decryptPlannerText(key, row.description_encrypted, row.description ?? "")
            : null,
        startAt: row.start_at,
        endAt: row.end_at,
        color: isPlannerEventColor(row.color) ? row.color : "other",
        notifyMinutesBefore: row.notify_minutes_before,
        recurrenceRule: row.recurrence_rule,
        recurrenceUntil: row.recurrence_until,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function eventToRow(userId: string, event: PlannerEvent, key: EncryptionKey | null = null): PlannerEventRow {
    const encryptedTitle = key ? encryptString(key, event.title) : null;
    const encryptedDescription = key && event.description ? encryptString(key, event.description) : null;

    return {
        id: event.id,
        user_id: userId,
        title: encryptedTitle ? encryptedPlaceholder("encrypted planner event") : event.title,
        title_encrypted: encryptedTitle,
        description: encryptedDescription ? encryptedPlaceholder("encrypted planner description") : event.description,
        description_encrypted: encryptedDescription,
        start_at: event.startAt,
        end_at: event.endAt,
        color: event.color,
        notify_minutes_before: event.notifyMinutesBefore,
        recurrence_rule: event.recurrenceRule,
        recurrence_until: event.recurrenceUntil,
        created_at: event.createdAt,
        updated_at: event.updatedAt,
    };
}

async function getAuthenticatedUserId(fallbackUserId: string): Promise<string> {
    const {data, error} = await supabase.auth.getUser();
    const authenticatedUserId = data.user?.id ?? null;

    if (error || !authenticatedUserId) {
        throw new Error(error?.message ?? "No authenticated Supabase user found.");
    }

    if (authenticatedUserId !== fallbackUserId) {
        console.warn("[planner] session user id mismatch", {stateUserId: fallbackUserId, authenticatedUserId});
    }

    return authenticatedUserId;
}

function serializeLocalEvents(key: EncryptionKey | null, events: PlannerEvent[]): StoredPlannerEvent[] {
    return events.map((event) => {
        const titleEncrypted = key ? encryptString(key, event.title) : null;
        const descriptionEncrypted = key && event.description ? encryptString(key, event.description) : null;
        return {
            ...event,
            title: titleEncrypted ? encryptedPlaceholder("encrypted planner event") : event.title,
            titleEncrypted,
            description: descriptionEncrypted ? encryptedPlaceholder("encrypted planner description") : event.description,
            descriptionEncrypted,
        };
    });
}

function parseLocalEvents(raw: string | null, key: EncryptionKey | null = null): PlannerEvent[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((e): e is Partial<StoredPlannerEvent> => Boolean(e) && typeof e === "object")
            .map((e) => ({
                id: typeof e.id === "string" ? e.id : createId(),
                title: decryptPlannerText(key, e.titleEncrypted, typeof e.title === "string" ? e.title : ""),
                description: typeof e.description === "string" || e.descriptionEncrypted
                    ? decryptPlannerText(key, e.descriptionEncrypted, typeof e.description === "string" ? e.description : "")
                    : null,
                startAt: typeof e.startAt === "string" ? e.startAt : new Date().toISOString(),
                endAt: typeof e.endAt === "string" ? e.endAt : new Date().toISOString(),
                color: isPlannerEventColor(e.color) ? e.color : "other",
                notifyMinutesBefore: typeof e.notifyMinutesBefore === "number" ? e.notifyMinutesBefore : null,
                recurrenceRule: typeof e.recurrenceRule === "string" ? e.recurrenceRule : null,
                recurrenceUntil: typeof e.recurrenceUntil === "string" ? e.recurrenceUntil : null,
                createdAt: typeof e.createdAt === "string" ? e.createdAt : new Date().toISOString(),
                updatedAt: typeof e.updatedAt === "string" ? e.updatedAt : new Date().toISOString(),
            }));
    } catch {
        return [];
    }
}

export async function clearPlannerEventsStorage(userId: string | null | undefined): Promise<void> {
    await AsyncStorage.removeItem(storageKey(userId));
}

export function usePlannerEvents(session: Session | null, encryption?: EncryptionState) {
    const userId = session?.user.id ?? null;
    const [events, setEvents] = useState<PlannerEvent[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const eventsRef = useRef<PlannerEvent[]>([]);
    const encryptionKey = encryption?.key ?? null;

    useEffect(() => {
        eventsRef.current = events;
    }, [events]);

    useEffect(() => {
        if (!isLoaded) return;
        if (userId && !encryptionKey) return;
        void syncPlannerEventReminderNotifications(events);
    }, [encryptionKey, events, isLoaded, userId]);

    const persistLocal = useCallback(
        async (next: PlannerEvent[]) => {
            try {
                await AsyncStorage.setItem(storageKey(userId), JSON.stringify(serializeLocalEvents(encryptionKey, next)));
            } catch (err) {
                console.warn("[planner] AsyncStorage save error", err);
            }
        },
        [encryptionKey, userId],
    );

    useEffect(() => {
        let mounted = true;

        async function hydrate() {
            setIsLoaded(false);
            try {
                if (userId && !encryptionKey) {
                    setEvents([]);
                    return;
                }

                const localRaw = await AsyncStorage.getItem(storageKey(userId));
                if (!mounted) return;
                const local = parseLocalEvents(localRaw, encryptionKey);
                setEvents(local);

                if (!userId) {
                    return;
                }

                const {data, error} = await supabase
                    .from("planner_events")
                    .select("*")
                    .eq("user_id", userId)
                    .order("start_at", {ascending: true});

                if (!mounted) return;

                if (error) {
                    console.warn("[planner] load error", error.message);
                    return;
                }

                const remote = ((data ?? []) as PlannerEventRow[]).map((row) => mapRowToEvent(row, encryptionKey));
                const remoteById = new Map(remote.map((e) => [e.id, e]));
                const localOnly = local.filter((e) => !remoteById.has(e.id));

                // Push any local-only events up to Supabase
                if (localOnly.length > 0) {
                    try {
                        const authenticatedUserId = await getAuthenticatedUserId(userId);
                        const rows = localOnly.map((e) => eventToRow(authenticatedUserId, e, encryptionKey));
                        const {error: upsertErr} = await supabase.from("planner_events").upsert(rows);
                        if (upsertErr) {
                            console.warn("[planner] migrate local-up error", upsertErr.message);
                        }
                    } catch (err) {
                        console.warn("[planner] auth check before local-up error", err);
                    }
                }

                // Merge: remote is canonical; preserve any local-only that just got pushed
                const merged = [...remote, ...localOnly];
                setEvents(merged);
                await persistLocal(merged);
                if (encryptionKey) {
                    const plaintextRows = ((data ?? []) as PlannerEventRow[]).filter((row) => row.title && !row.title_encrypted);
                    if (plaintextRows.length > 0) {
                        void supabase.from("planner_events").upsert(
                            plaintextRows.map((row) => eventToRow(userId, mapRowToEvent(row, encryptionKey), encryptionKey)),
                        );
                    }
                }
            } catch (error) {
                console.warn("[planner] hydrate error", error);
            } finally {
                if (mounted) setIsLoaded(true);
            }
        }

        void hydrate();

        return () => {
            mounted = false;
        };
    }, [encryptionKey, persistLocal, userId]);

    const createEvent = useCallback(
        async (input: CreatePlannerEventInput): Promise<PlannerEvent | null> => {
            const title = input.title.trim();
            if (!title) return null;
            const now = new Date().toISOString();
            const event: PlannerEvent = {
                id: createId(),
                title,
                description: input.description?.trim() || null,
                startAt: input.startAt,
                endAt: input.endAt,
                color: input.color,
                notifyMinutesBefore: input.notifyMinutesBefore ?? DEFAULT_NOTIFY_MINUTES_BEFORE,
                recurrenceRule: null,
                recurrenceUntil: null,
                createdAt: now,
                updatedAt: now,
            };

            const previous = eventsRef.current;
            const next = [...previous, event];
            setEvents(next);
            void persistLocal(next);

            if (userId) {
                const authenticatedUserId = await getAuthenticatedUserId(userId);
                const {error} = await supabase.from("planner_events").insert(eventToRow(authenticatedUserId, event, encryptionKey));
                if (error) {
                    console.warn("[planner] insert error", error.message);
                    setEvents(previous);
                    void persistLocal(previous);
                    throw error;
                }
            }
            return event;
        },
        [encryptionKey, persistLocal, userId],
    );

    const updateEvent = useCallback(
        async (id: string, patch: UpdatePlannerEventInput): Promise<void> => {
            const current = eventsRef.current.find((e) => e.id === id);
            if (!current) return;
            const updatedAt = new Date().toISOString();
            const merged: PlannerEvent = {
                ...current,
                ...(patch.title !== undefined ? {title: patch.title.trim()} : {}),
                ...(patch.description !== undefined ? {description: patch.description?.trim() || null} : {}),
                ...(patch.startAt !== undefined ? {startAt: patch.startAt} : {}),
                ...(patch.endAt !== undefined ? {endAt: patch.endAt} : {}),
                ...(patch.color !== undefined ? {color: patch.color} : {}),
                ...(patch.notifyMinutesBefore !== undefined ? {notifyMinutesBefore: patch.notifyMinutesBefore} : {}),
                updatedAt,
            };

            const next = eventsRef.current.map((e) => (e.id === id ? merged : e));
            const previous = eventsRef.current;
            setEvents(next);
            void persistLocal(next);

            if (userId) {
                const {error} = await supabase
                    .from("planner_events")
                    .update({
                        title: encryptionKey ? encryptedPlaceholder("encrypted planner event") : merged.title,
                        title_encrypted: encryptionKey ? encryptString(encryptionKey, merged.title) : null,
                        description: encryptionKey && merged.description ? encryptedPlaceholder("encrypted planner description") : merged.description,
                        description_encrypted: encryptionKey && merged.description ? encryptString(encryptionKey, merged.description) : null,
                        start_at: merged.startAt,
                        end_at: merged.endAt,
                        color: merged.color,
                        notify_minutes_before: merged.notifyMinutesBefore,
                        updated_at: updatedAt,
                    })
                    .eq("id", id)
                    .eq("user_id", userId);
                if (error) {
                    console.warn("[planner] update error", error.message);
                    setEvents(previous);
                    void persistLocal(previous);
                    throw error;
                }
            }
        },
        [encryptionKey, persistLocal, userId],
    );

    const deleteEvent = useCallback(
        async (id: string): Promise<void> => {
            const next = eventsRef.current.filter((e) => e.id !== id);
            setEvents(next);
            void persistLocal(next);

            if (userId) {
                const {error} = await supabase
                    .from("planner_events")
                    .delete()
                    .eq("id", id)
                    .eq("user_id", userId);
                if (error) {
                    console.warn("[planner] delete error", error.message);
                    throw error;
                }
            }
        },
        [persistLocal, userId],
    );

    return {
        events,
        isLoaded,
        createEvent,
        updateEvent,
        deleteEvent,
    };
}

export type PlannerEventsState = ReturnType<typeof usePlannerEvents>;
