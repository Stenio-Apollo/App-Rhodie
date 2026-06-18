import AsyncStorage from "@react-native-async-storage/async-storage";
import {useCallback, useEffect, useRef, useState} from "react";
import {supabase} from "../lib/supabase";

const STORAGE_PREFIX = "rhnative.sticky-note.v1";
const REMOTE_SAVE_DELAY_MS = 700;

function storageKey(userId: string | null | undefined): string {
    return `${STORAGE_PREFIX}.${userId ?? "local"}`;
}

export type StickyNote = {
    text: string;
    updatedAt: string | null;
};

export async function clearStickyNoteStorage(userId?: string | null): Promise<void> {
    await AsyncStorage.removeItem(storageKey(userId ?? null));
}

export function useStickyNote(userId?: string | null) {
    const [note, setNoteState] = useState<StickyNote>({text: "", updatedAt: null});
    const [isLoaded, setIsLoaded] = useState(false);
    const hasHydratedRef = useRef(false);

    useEffect(() => {
        let mounted = true;

        async function loadLocalNote(): Promise<StickyNote> {
            const raw = await AsyncStorage.getItem(storageKey(userId ?? null));

            if (!raw) {
                return {text: "", updatedAt: null};
            }

            try {
                const parsed = JSON.parse(raw) as Partial<StickyNote>;
                return {
                    text: typeof parsed.text === "string" ? parsed.text : "",
                    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
                };
            } catch {
                return {text: "", updatedAt: null};
            }
        }

        async function hydrate() {
            const localNote = await loadLocalNote();
            if (!mounted) return;

            if (!userId) {
                setNoteState(localNote);
                hasHydratedRef.current = true;
                setIsLoaded(true);
                return;
            }

            if (localNote.text.trim()) {
                const {error: upsertError} = await supabase.from("sticky_notes").upsert({
                    user_id: userId,
                    text: localNote.text,
                    updated_at: localNote.updatedAt ?? new Date().toISOString(),
                }, {onConflict: "user_id"});
                if (upsertError) console.warn("Supabase sticky note upsert error", upsertError.message);
            }

            const {data, error} = await supabase
                .from("sticky_notes")
                .select("text, updated_at")
                .eq("user_id", userId)
                .maybeSingle();

            if (!mounted) return;

            if (error) {
                console.warn("Supabase sticky note load error", error.message);
                setNoteState(localNote);
                hasHydratedRef.current = true;
                setIsLoaded(true);
                return;
            }

            const remoteNote: StickyNote = data
                ? {
                    text: typeof data.text === "string" ? data.text : "",
                    updatedAt: typeof data.updated_at === "string" ? data.updated_at : null,
                }
                : localNote;

            setNoteState(remoteNote);
            await AsyncStorage.setItem(storageKey(userId), JSON.stringify(remoteNote));
            hasHydratedRef.current = true;
            setIsLoaded(true);
        }

        setIsLoaded(false);
        hasHydratedRef.current = false;
        void hydrate();

        return () => {
            mounted = false;
        };
    }, [userId]);

    const setText = useCallback(
        (text: string) => {
            const nextNote = {
                text,
                updatedAt: text.trim() ? new Date().toISOString() : null,
            };
            setNoteState(nextNote);
        },
        [],
    );

    const clear = useCallback(() => {
        const nextNote = {text: "", updatedAt: null};
        setNoteState(nextNote);
    }, []);

    useEffect(() => {
        if (!isLoaded || !hasHydratedRef.current) return;

        void AsyncStorage.setItem(storageKey(userId ?? null), JSON.stringify(note));

        if (!userId) return;

        const timeoutId = setTimeout(() => {
            if (!note.text.trim()) {
                void supabase.from("sticky_notes").delete().eq("user_id", userId).then(({error}) => {
                    if (error) console.warn("Supabase sticky note delete error", error.message);
                });
                return;
            }

            void supabase.from("sticky_notes").upsert({
                user_id: userId,
                text: note.text,
                updated_at: note.updatedAt ?? new Date().toISOString(),
            }, {onConflict: "user_id"}).then(({error}) => {
                if (error) console.warn("Supabase sticky note save error", error.message);
            });
        }, REMOTE_SAVE_DELAY_MS);

        return () => clearTimeout(timeoutId);
    }, [isLoaded, note, userId]);

    return {
        note,
        isLoaded,
        setText,
        clear,
    };
}
