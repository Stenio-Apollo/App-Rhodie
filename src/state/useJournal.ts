import {useEffect, useState, useCallback, useMemo} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {supabase} from "../lib/supabase";
import type {Session} from "@supabase/supabase-js";

const STORAGE_KEY = "rhnative.journal.v1";

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  createdAt: string;
  category: "gratitude" | "prompt";
}

function createEntryId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<JournalEntry>[];
          const normalized = Array.isArray(parsed)
            ? parsed.map((e) => ({
                ...e,
                category: (e as JournalEntry).category ?? "gratitude",
              })) as JournalEntry[]
            : [];
          setEntries(normalized);
        }
      } finally {
        if (mounted) setIsLoaded(true);
      }
    }

    async function hydrateRemote(userId: string) {
      const localRaw = await AsyncStorage.getItem(STORAGE_KEY);
      const localEntries: JournalEntry[] = localRaw
        ? ((JSON.parse(localRaw) as Partial<JournalEntry>[]) ?? []).map((e) => ({
            ...(e as JournalEntry),
            category: (e as JournalEntry).category ?? "gratitude",
          }))
        : [];

      if (localEntries.length > 0) {
        const toUpsert = localEntries.map((e) => ({
          id: e.id,
          user_id: userId,
          date: e.date,
          text: e.text,
          category: e.category,
          created_at: e.createdAt,
        }));
        const {error: upsertErr} = await supabase.from("journal_entries").upsert(toUpsert);
        if (upsertErr) console.warn("Supabase journal upsert error", upsertErr.message);
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
        data?.map((e) => ({
          id: e.id,
          date: e.date,
          text: e.text,
          category: (e.category as JournalEntry["category"]) ?? "gratitude",
          createdAt: e.created_at,
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
    if (!isLoaded) return;
    if (!session) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
    }
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
      setEntries((prev) => [entry, ...prev]);

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
      setEntries((prev) => prev.filter((e) => e.id !== id));
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
      setEntries((prev) => prev.map((e) => (e.id === id ? {...e, text: trimmed} : e)));
      if (session) {
        await supabase.from("journal_entries").update({text: trimmed}).eq("id", id).eq("user_id", session.user.id);
      }
    },
    [session],
  );

  const byDate = useMemo(() => {
    return entries.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
      acc[entry.date] = acc[entry.date] ? [...acc[entry.date], entry] : [entry];
      return acc;
    }, {});
  }, [entries]);

  return { entries, byDate, addEntry, deleteEntry, editEntry, isLoaded };
}
