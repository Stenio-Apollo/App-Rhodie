import {useEffect, useState, useCallback, useMemo} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {supabase} from "../lib/supabase";
import type {Session} from "@supabase/supabase-js";

const STORAGE_PREFIX = "rhnative.journal.v2";
const LEGACY_STORAGE_KEY = "rhnative.journal.v1";

export interface JournalEntry {
    id: string;
    date: string;
    text: string;
    createdAt: string;
    category: "gratitude" | "prompt";
}

function normalizeJournalCategory(category: string | undefined): JournalEntry["category"] {
    if (category === "gratitude") return "gratitude";
    return "prompt";
}

function createEntryId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
        const random = (Math.random() * 16) | 0;
        const value = character === "x" ? random : (random & 0x3) | 0x8;
        return value.toString(16);
    });
}

function storageKey(userId: string | null | undefined): string {
    return `${STORAGE_PREFIX}.${userId ?? "local"}`;
}

function parseJournalEntries(raw: string | null): JournalEntry[] {
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .filter((entry): entry is Partial<JournalEntry> => Boolean(entry) && typeof entry === "object")
            .map((entry) => {
                const date = typeof entry.date === "string" && entry.date ? entry.date : new Date().toISOString().slice(0, 10);
                const createdAt =
                    typeof entry.createdAt === "string" && entry.createdAt ? entry.createdAt : new Date().toISOString();
                return {
                    id: typeof entry.id === "string" && entry.id ? entry.id : createEntryId(),
                    date,
                    text: typeof entry.text === "string" ? entry.text : "",
                    createdAt,
                    category: normalizeJournalCategory((entry as { category?: string }).category),
                };
            })
            .filter((entry) => entry.text.trim().length > 0);
    } catch {
        return [];
    }
}

export async function clearJournalStorage(userId?: string | null): Promise<void> {
    await Promise.all([
        AsyncStorage.removeItem(storageKey(userId ?? null)),
        AsyncStorage.removeItem(LEGACY_STORAGE_KEY),
    ]);
}

export function useJournal(session: Session | null = null) {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;
        const currentStorageKey = storageKey(session?.user.id);

        async function hydrateLocal() {
            try {
                const [scopedRaw, legacyRaw] = await Promise.all([
                    AsyncStorage.getItem(currentStorageKey),
                    AsyncStorage.getItem(LEGACY_STORAGE_KEY),
                ]);
                if (!mounted) return;

                // one-time migration from legacy shared key
                if (!scopedRaw && legacyRaw) {
                    const legacyEntries = parseJournalEntries(legacyRaw);
                    await AsyncStorage.setItem(currentStorageKey, JSON.stringify(legacyEntries));
                    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
                    if (!mounted) return;
                }

                const raw = scopedRaw ?? legacyRaw;
                setEntries(parseJournalEntries(raw));
            } finally {
                if (mounted) setIsLoaded(true);
            }
        }

        async function hydrateRemote(userId: string) {
            const [scopedRaw, legacyRaw] = await Promise.all([
                AsyncStorage.getItem(currentStorageKey),
                AsyncStorage.getItem(LEGACY_STORAGE_KEY),
            ]);
            const scopedLocalEntries = parseJournalEntries(scopedRaw);
            const migratedLegacyEntries = scopedLocalEntries.length === 0
                ? parseJournalEntries(legacyRaw).map((entry) => ({...entry, id: createEntryId()}))
                : [];
            const localEntries: JournalEntry[] = [...scopedLocalEntries, ...migratedLegacyEntries];

            if (localEntries.length > 0) {
                const toUpsert = localEntries.map((entry) => ({
                    id: entry.id,
                    user_id: userId,
                    date: entry.date,
                    text: entry.text,
                    category: entry.category,
                    created_at: entry.createdAt,
                }));
                const {error: upsertError} = await supabase.from("journal_entries").upsert(toUpsert);
                if (upsertError) console.warn("Supabase journal upsert error", upsertError.message);
                await Promise.all([
                    AsyncStorage.setItem(currentStorageKey, JSON.stringify(localEntries)),
                    AsyncStorage.removeItem(LEGACY_STORAGE_KEY),
                ]);
            }

            const {data, error} = await supabase
                .from("journal_entries")
                .select("*")
                .eq("user_id", userId)
                .order("date", {ascending: false})
                .order("created_at", {ascending: false});

            if (!mounted) return;
            if (error) {
                console.warn("Supabase journal load error", error.message);
                await hydrateLocal();
                return;
            }

            const mapped =
                data?.map((entry) => ({
                    id: entry.id,
                    date: entry.date,
                    text: entry.text,
                    category: normalizeJournalCategory(entry.category as string | undefined),
                    createdAt: entry.created_at,
                })) ?? [];

            setEntries(mapped);
            await AsyncStorage.setItem(currentStorageKey, JSON.stringify(mapped));
            setIsLoaded(true);
        }

        if (session) {
            void hydrateRemote(session.user.id);
        } else {
            void hydrateLocal();
        }

        return () => {
            mounted = false;
        };
    }, [session, session?.user.id]);

    useEffect(() => {
        if (!isLoaded) return;
        AsyncStorage.setItem(storageKey(session?.user.id), JSON.stringify(entries)).catch(() => {
        });
    }, [entries, isLoaded, session, session?.user.id]);

    const addEntry = useCallback(
        async (text: string, date: string, category: JournalEntry["category"] = "gratitude") => {
            const trimmed = text.trim();
            if (!trimmed) return;

            const entry: JournalEntry = {
                id: createEntryId(),
                date,
                text: trimmed,
                createdAt: new Date().toISOString(),
                category,
            };

            setEntries((previous) => [entry, ...previous]);

            if (session) {
                await supabase.from("journal_entries").insert({
                    id: entry.id,
                    user_id: session.user.id,
                    date: entry.date,
                    text: entry.text,
                    category: entry.category,
                    created_at: entry.createdAt,
                });
            }
        },
        [session],
    );

    const deleteEntry = useCallback(
        async (id: string) => {
            setEntries((previous) => previous.filter((entry) => entry.id !== id));
            if (session) {
                await supabase.from("journal_entries").delete().eq("id", id).eq("user_id", session.user.id);
            }
        },
        [session],
    );

    const editEntry = useCallback(
        async (id: string, text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return;
            setEntries((previous) => previous.map((entry) => (entry.id === id ? {...entry, text: trimmed} : entry)));
            if (session) {
                await supabase.from("journal_entries").update({text: trimmed}).eq("id", id).eq("user_id", session.user.id);
            }
        },
        [session],
    );

    const byDate = useMemo(() => {
        return entries.reduce<Record<string, JournalEntry[]>>((accumulator, entry) => {
            const dateKey = entry.date || new Date().toISOString().slice(0, 10);
            accumulator[dateKey] = accumulator[dateKey] ? [...accumulator[dateKey], entry] : [entry];
            return accumulator;
        }, {});
    }, [entries]);

    return {entries, byDate, addEntry, deleteEntry, editEntry, isLoaded};
}
