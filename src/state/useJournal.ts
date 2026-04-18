import {useEffect, useState, useCallback, useMemo} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {supabase} from "../lib/supabase";
import type {Session} from "@supabase/supabase-js";

const STORAGE_KEY = "rhnative.journal.v1";

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

export async function clearJournalStorage(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
}

export function useJournal(session: Session | null = null) {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function hydrateLocal() {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                if (!mounted) return;
                if (!raw) {
                    setEntries([]);
                    return;
                }

                const parsed = JSON.parse(raw) as Partial<JournalEntry>[];
                const normalized = Array.isArray(parsed)
                    ? parsed.map((entry) => ({
                        ...entry,
                        category: normalizeJournalCategory((entry as { category?: string }).category),
                    })) as JournalEntry[]
                    : [];
                setEntries(normalized);
            } finally {
                if (mounted) setIsLoaded(true);
            }
        }

        async function hydrateRemote(userId: string) {
            const localRaw = await AsyncStorage.getItem(STORAGE_KEY);
            const localEntries: JournalEntry[] = localRaw
                ? ((JSON.parse(localRaw) as Partial<JournalEntry>[]) ?? []).map((entry) => ({
                    ...(entry as JournalEntry),
                    category: normalizeJournalCategory((entry as { category?: string }).category),
                }))
                : [];

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
    }, [session]);

    useEffect(() => {
        if (!isLoaded || session) return;
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {
        });
    }, [entries, isLoaded, session]);

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
            accumulator[entry.date] = accumulator[entry.date] ? [...accumulator[entry.date], entry] : [entry];
            return accumulator;
        }, {});
    }, [entries]);

    return {entries, byDate, addEntry, deleteEntry, editEntry, isLoaded};
}
