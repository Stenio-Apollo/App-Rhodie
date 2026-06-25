import AsyncStorage from "@react-native-async-storage/async-storage";
import {useCallback, useEffect, useRef, useState} from "react";
import {supabase} from "../lib/supabase";
import {decryptString, encryptString, encryptedPlaceholder, type EncryptionKey, looksEncrypted} from "../lib/e2ee";
import type {EncryptionState} from "./useEncryption";

const STORAGE_PREFIX = "rhnative.sticky-note.v1";
const REMOTE_SAVE_DELAY_MS = 700;

function storageKey(userId: string | null | undefined): string {
    return `${STORAGE_PREFIX}.${userId ?? "local"}`;
}

export type StickyNote = {
    text: string;
    updatedAt: string | null;
};

type StoredStickyNote = StickyNote & {
    textEncrypted?: string | null;
};

export async function clearStickyNoteStorage(userId?: string | null): Promise<void> {
    await AsyncStorage.removeItem(storageKey(userId ?? null));
}

function decryptNotePayload(key: EncryptionKey | null, encrypted: string | null | undefined, fallback: string): string {
    if (key && encrypted && looksEncrypted(encrypted)) {
        try {
            return decryptString(key, encrypted);
        } catch (error) {
            console.warn("Sticky note decrypt error", error);
        }
    }
    return fallback;
}

function serializeLocalNote(key: EncryptionKey | null, note: StickyNote): StoredStickyNote {
    const textEncrypted = key && note.text.trim() ? encryptString(key, note.text) : null;
    return {
        text: textEncrypted ? encryptedPlaceholder("encrypted sticky note") : note.text,
        textEncrypted,
        updatedAt: note.updatedAt,
    };
}

export function useStickyNote(userId?: string | null, encryption?: EncryptionState) {
    const [note, setNoteState] = useState<StickyNote>({text: "", updatedAt: null});
    const [isLoaded, setIsLoaded] = useState(false);
    const hasHydratedRef = useRef(false);
    const encryptionKey = encryption?.key ?? null;

    useEffect(() => {
        let mounted = true;

        async function loadLocalNote(): Promise<StickyNote> {
            const raw = await AsyncStorage.getItem(storageKey(userId ?? null));

            if (!raw) {
                return {text: "", updatedAt: null};
            }

            try {
                const parsed = JSON.parse(raw) as Partial<StoredStickyNote>;
                const fallbackText = typeof parsed.text === "string" ? parsed.text : "";
                return {
                    text: decryptNotePayload(encryptionKey, parsed.textEncrypted, fallbackText),
                    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
                };
            } catch {
                return {text: "", updatedAt: null};
            }
        }

        async function hydrate() {
            try {
                if (userId && !encryptionKey) {
                    setNoteState({text: "", updatedAt: null});
                    hasHydratedRef.current = true;
                    return;
                }

                const localNote = await loadLocalNote();
                if (!mounted) return;

                if (!userId) {
                    setNoteState(localNote);
                    hasHydratedRef.current = true;
                    return;
                }

                if (localNote.text.trim()) {
                    const encryptedText = encryptionKey ? encryptString(encryptionKey, localNote.text) : null;
                    const {error: upsertError} = await supabase.from("sticky_notes").upsert({
                        user_id: userId,
                        text: encryptedText ? encryptedPlaceholder("encrypted sticky note") : localNote.text,
                        text_encrypted: encryptedText,
                        updated_at: localNote.updatedAt ?? new Date().toISOString(),
                    }, {onConflict: "user_id"});
                    if (upsertError) console.warn("Supabase sticky note upsert error", upsertError.message);
                }

                const {data, error} = await supabase
                    .from("sticky_notes")
                    .select("text, text_encrypted, updated_at")
                    .eq("user_id", userId)
                    .maybeSingle();

                if (!mounted) return;

                if (error) {
                    console.warn("Supabase sticky note load error", error.message);
                    setNoteState(localNote);
                    hasHydratedRef.current = true;
                    return;
                }

                const remoteNote: StickyNote = data
                    ? {
                        text: decryptNotePayload(
                            encryptionKey,
                            typeof data.text_encrypted === "string" ? data.text_encrypted : null,
                            typeof data.text === "string" ? data.text : "",
                        ),
                        updatedAt: typeof data.updated_at === "string" ? data.updated_at : null,
                    }
                    : localNote;

                setNoteState(remoteNote);
                await AsyncStorage.setItem(storageKey(userId), JSON.stringify(serializeLocalNote(encryptionKey, remoteNote)));

                if (data && encryptionKey && remoteNote.text.trim() && !data.text_encrypted) {
                    void supabase.from("sticky_notes").upsert({
                        user_id: userId,
                        text: encryptedPlaceholder("encrypted sticky note"),
                        text_encrypted: encryptString(encryptionKey, remoteNote.text),
                        updated_at: remoteNote.updatedAt ?? new Date().toISOString(),
                    }, {onConflict: "user_id"});
                }

                hasHydratedRef.current = true;
            } catch (error) {
                console.warn("Sticky note hydrate error", error);
            } finally {
                if (mounted) setIsLoaded(true);
            }
        }

        setIsLoaded(false);
        hasHydratedRef.current = false;
        void hydrate();

        return () => {
            mounted = false;
        };
    }, [encryptionKey, userId]);

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
        if (userId && !encryptionKey) return;

        void AsyncStorage.setItem(storageKey(userId ?? null), JSON.stringify(serializeLocalNote(encryptionKey, note)));

        if (!userId) return;
        if (!encryptionKey) return;

        const timeoutId = setTimeout(() => {
            if (!note.text.trim()) {
                void supabase.from("sticky_notes").delete().eq("user_id", userId).then(({error}) => {
                    if (error) console.warn("Supabase sticky note delete error", error.message);
                });
                return;
            }

            void supabase.from("sticky_notes").upsert({
                user_id: userId,
                text: encryptedPlaceholder("encrypted sticky note"),
                text_encrypted: encryptString(encryptionKey, note.text),
                updated_at: note.updatedAt ?? new Date().toISOString(),
            }, {onConflict: "user_id"}).then(({error}) => {
                if (error) console.warn("Supabase sticky note save error", error.message);
            });
        }, REMOTE_SAVE_DELAY_MS);

        return () => clearTimeout(timeoutId);
    }, [encryptionKey, isLoaded, note, userId]);

    return {
        note,
        isLoaded,
        setText,
        clear,
    };
}
