import { useEffect, useState, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "rhnative.journal.v1";

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  createdAt: string;
}

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (raw) {
          const parsed = JSON.parse(raw) as JournalEntry[];
          setEntries(Array.isArray(parsed) ? parsed : []);
        }
      } catch {
        // ignore load errors
      } finally {
        if (mounted) setIsLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
  }, [entries, isLoaded]);

  const addEntry = useCallback((text: string, date: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const entry: JournalEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      date,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    setEntries((prev) => [entry, ...prev]);
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const editEntry = useCallback((id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, text: trimmed } : e)));
  }, []);

  const byDate = useMemo(() => {
    return entries.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
      acc[entry.date] = acc[entry.date] ? [...acc[entry.date], entry] : [entry];
      return acc;
    }, {});
  }, [entries]);

  return { entries, byDate, addEntry, deleteEntry, editEntry, isLoaded };
}
