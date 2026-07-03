import {useEffect, useState, useCallback, useMemo} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {supabase} from "../lib/supabase";
import type {Session} from "@supabase/supabase-js";
import {toLocalISODate} from "../lib/date-utils";
import {createId} from "../lib/id";
import {decryptString, encryptString, encryptedPlaceholder, type EncryptionKey, looksEncrypted} from "../lib/e2ee";
import type {EncryptionState} from "./useEncryption";

const STORAGE_PREFIX = "rhnative.journal.v2";
const PURPOSE_STORAGE_PREFIX = "rhnative.journal-purpose-images.v1";
const LEGACY_STORAGE_KEY = "rhnative.journal.v1";
const MAX_PURPOSE_IMAGES = 9;

export interface JournalEntry {
    id: string;
    date: string;
    text: string;
    createdAt: string;
    category: "gratitude" | "prompt";
}

export interface PurposeImage {
    id: string;
    date: string;
    dataUri: string;
    mimeType: string;
    createdAt: string;
}

type StoredJournalEntry = JournalEntry & {
    textEncrypted?: string | null;
};

type StoredPurposeImage = Omit<PurposeImage, "dataUri"> & {
    dataUri: string;
    dataUriEncrypted?: string | null;
};

function normalizeJournalCategory(category: string | undefined): JournalEntry["category"] {
    if (category === "gratitude") return "gratitude";
    return "prompt";
}

function storageKey(userId: string | null | undefined): string {
    return `${STORAGE_PREFIX}.${userId ?? "local"}`;
}

function purposeStorageKey(userId: string | null | undefined): string {
    return `${PURPOSE_STORAGE_PREFIX}.${userId ?? "local"}`;
}

function decryptText(key: EncryptionKey | null, encrypted: string | null | undefined, fallback: string): string {
    if (key && encrypted && looksEncrypted(encrypted)) {
        try {
            return decryptString(key, encrypted);
        } catch (error) {
            console.warn("Journal decrypt error", error);
        }
    }
    return fallback;
}

function serializeJournalEntries(key: EncryptionKey | null, entries: JournalEntry[]): StoredJournalEntry[] {
    return entries.map((entry) => {
        const textEncrypted = key && entry.text.trim() ? encryptString(key, entry.text) : null;
        return {
            ...entry,
            text: textEncrypted ? encryptedPlaceholder("encrypted journal entry") : entry.text,
            textEncrypted,
        };
    });
}

function parseJournalEntries(raw: string | null, key: EncryptionKey | null = null): JournalEntry[] {
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .filter((entry): entry is Partial<StoredJournalEntry> => Boolean(entry) && typeof entry === "object")
            .map((entry) => {
                const date = typeof entry.date === "string" && entry.date ? entry.date : toLocalISODate();
                const createdAt =
                    typeof entry.createdAt === "string" && entry.createdAt ? entry.createdAt : new Date().toISOString();
                const fallbackText = typeof entry.text === "string" ? entry.text : "";
                return {
                    id: typeof entry.id === "string" && entry.id ? entry.id : createId(),
                    date,
                    text: decryptText(key, entry.textEncrypted, fallbackText),
                    createdAt,
                    category: normalizeJournalCategory((entry as { category?: string }).category),
                };
            })
            .filter((entry) => entry.text.trim().length > 0);
    } catch {
        return [];
    }
}

function serializePurposeImages(key: EncryptionKey | null, images: PurposeImage[]): StoredPurposeImage[] {
    if (!key) return [];

    return images.map((image) => {
        const dataUriEncrypted = encryptString(key, image.dataUri);
        return {
            ...image,
            dataUri: encryptedPlaceholder("encrypted purpose image"),
            dataUriEncrypted,
        };
    });
}

function parsePurposeImages(raw: string | null, key: EncryptionKey | null = null): PurposeImage[] {
    if (!raw || !key) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .filter((image): image is Partial<StoredPurposeImage> => Boolean(image) && typeof image === "object")
            .map((image) => {
                const fallbackDataUri = typeof image.dataUri === "string" ? image.dataUri : "";
                return {
                    id: typeof image.id === "string" && image.id ? image.id : createId(),
                    date: typeof image.date === "string" && image.date ? image.date : toLocalISODate(),
                    dataUri: decryptText(key, image.dataUriEncrypted, fallbackDataUri),
                    mimeType: typeof image.mimeType === "string" && image.mimeType ? image.mimeType : "image/jpeg",
                    createdAt: typeof image.createdAt === "string" && image.createdAt ? image.createdAt : new Date().toISOString(),
                };
            })
            .filter((image) => image.dataUri.startsWith("data:image/"));
    } catch {
        return [];
    }
}

export async function clearJournalStorage(userId?: string | null): Promise<void> {
    await Promise.all([
        AsyncStorage.removeItem(storageKey(userId ?? null)),
        AsyncStorage.removeItem(purposeStorageKey(userId ?? null)),
        AsyncStorage.removeItem(LEGACY_STORAGE_KEY),
    ]);
}

export type JournalState = ReturnType<typeof useJournal>;

export function useJournal(session: Session | null = null, encryption?: EncryptionState) {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [purposeImages, setPurposeImages] = useState<PurposeImage[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [purposeImagesLoaded, setPurposeImagesLoaded] = useState(false);
    const encryptionKey = encryption?.key ?? null;

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
            try {
                if (!encryptionKey) {
                    setEntries([]);
                    return;
                }

                const [scopedRaw, legacyRaw] = await Promise.all([
                    AsyncStorage.getItem(currentStorageKey),
                    AsyncStorage.getItem(LEGACY_STORAGE_KEY),
                ]);
                const scopedLocalEntries = parseJournalEntries(scopedRaw, encryptionKey);
                const migratedLegacyEntries = scopedLocalEntries.length === 0
                    ? parseJournalEntries(legacyRaw, encryptionKey).map((entry) => ({...entry, id: createId()}))
                    : [];
                const localEntries: JournalEntry[] = [...scopedLocalEntries, ...migratedLegacyEntries];

                if (localEntries.length > 0) {
                    const toUpsert = localEntries.map((entry) => ({
                        id: entry.id,
                        user_id: userId,
                        date: entry.date,
                        text: encryptedPlaceholder("encrypted journal entry"),
                        text_encrypted: encryptString(encryptionKey, entry.text),
                        category: entry.category,
                        created_at: entry.createdAt,
                    }));
                    const {error: upsertError} = await supabase.from("journal_entries").upsert(toUpsert);
                    if (upsertError) console.warn("Supabase journal upsert error", upsertError.message);
                    await Promise.all([
                        AsyncStorage.setItem(currentStorageKey, JSON.stringify(serializeJournalEntries(encryptionKey, localEntries))),
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
                        text: decryptText(
                            encryptionKey,
                            typeof entry.text_encrypted === "string" ? entry.text_encrypted : null,
                            typeof entry.text === "string" ? entry.text : "",
                        ),
                        category: normalizeJournalCategory(entry.category as string | undefined),
                        createdAt: entry.created_at,
                    })) ?? [];

                setEntries(mapped);
                await AsyncStorage.setItem(currentStorageKey, JSON.stringify(serializeJournalEntries(encryptionKey, mapped)));
                const plaintextRowsToMigrate = (data ?? []).filter((entry) => entry.text && !entry.text_encrypted);
                if (plaintextRowsToMigrate.length > 0) {
                    void supabase.from("journal_entries").upsert(plaintextRowsToMigrate.map((entry) => ({
                        id: entry.id,
                        user_id: userId,
                        date: entry.date,
                        text: encryptedPlaceholder("encrypted journal entry"),
                        text_encrypted: encryptString(encryptionKey, String(entry.text)),
                        category: normalizeJournalCategory(entry.category as string | undefined),
                        created_at: entry.created_at,
                    })));
                }
            } catch (error) {
                console.warn("Journal remote hydrate error", error);
            } finally {
                if (mounted) setIsLoaded(true);
            }
        }

        if (session) {
            void hydrateRemote(session.user.id);
        } else {
            void hydrateLocal();
        }

        return () => {
            mounted = false;
        };
    }, [encryptionKey, session, session?.user.id]);

    useEffect(() => {
        if (!isLoaded) return;
        if (session && !encryptionKey) return;
        AsyncStorage.setItem(storageKey(session?.user.id), JSON.stringify(serializeJournalEntries(encryptionKey, entries))).catch(() => {
        });
    }, [encryptionKey, entries, isLoaded, session, session?.user.id]);

    useEffect(() => {
        let mounted = true;

        async function hydratePurposeImages() {
            try {
                if (!encryptionKey) {
                    setPurposeImages([]);
                    return;
                }

                const raw = await AsyncStorage.getItem(purposeStorageKey(session?.user.id));
                if (!mounted) return;
                setPurposeImages(parsePurposeImages(raw, encryptionKey));
            } finally {
                if (mounted) setPurposeImagesLoaded(true);
            }
        }

        setPurposeImagesLoaded(false);
        void hydratePurposeImages();

        return () => {
            mounted = false;
        };
    }, [encryptionKey, session?.user.id]);

    useEffect(() => {
        if (!purposeImagesLoaded || !encryptionKey) return;
        AsyncStorage.setItem(
            purposeStorageKey(session?.user.id),
            JSON.stringify(serializePurposeImages(encryptionKey, purposeImages)),
        ).catch(() => {
        });
    }, [encryptionKey, purposeImages, purposeImagesLoaded, session?.user.id]);

    const addEntry = useCallback(
        async (text: string, date: string, category: JournalEntry["category"] = "gratitude") => {
            const trimmed = text.trim();
            if (!trimmed) return;

            const entry: JournalEntry = {
                id: createId(),
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
                    text: encryptionKey ? encryptedPlaceholder("encrypted journal entry") : entry.text,
                    text_encrypted: encryptionKey ? encryptString(encryptionKey, entry.text) : null,
                    category: entry.category,
                    created_at: entry.createdAt,
                });
            }
        },
        [encryptionKey, session],
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
                await supabase.from("journal_entries").update({
                    text: encryptionKey ? encryptedPlaceholder("encrypted journal entry") : trimmed,
                    text_encrypted: encryptionKey ? encryptString(encryptionKey, trimmed) : null,
                }).eq("id", id).eq("user_id", session.user.id);
            }
        },
        [encryptionKey, session],
    );

    const addPurposeImage = useCallback(
        async (dataUri: string, date: string, mimeType = "image/jpeg") => {
            if (!encryptionKey) {
                throw new Error("Unlock encrypted storage before adding purpose images.");
            }
            if (purposeImages.length >= MAX_PURPOSE_IMAGES) {
                throw new Error("You can keep up to 9 My Reason photos.");
            }

            const image: PurposeImage = {
                id: createId(),
                date,
                dataUri,
                mimeType,
                createdAt: new Date().toISOString(),
            };

            const nextImages = [image, ...purposeImages];
            await AsyncStorage.setItem(
                purposeStorageKey(session?.user.id),
                JSON.stringify(serializePurposeImages(encryptionKey, nextImages)),
            );
            setPurposeImages(nextImages);
        },
        [encryptionKey, purposeImages, session?.user.id],
    );

    const deletePurposeImage = useCallback(
        async (id: string) => {
            setPurposeImages((previous) => previous.filter((image) => image.id !== id));
        },
        [],
    );

    const byDate = useMemo(() => {
        return entries.reduce<Record<string, JournalEntry[]>>((accumulator, entry) => {
            const dateKey = entry.date || toLocalISODate();
            accumulator[dateKey] = accumulator[dateKey] ? [...accumulator[dateKey], entry] : [entry];
            return accumulator;
        }, {});
    }, [entries]);

    return {
        entries,
        byDate,
        addEntry,
        deleteEntry,
        editEntry,
        purposeImages,
        addPurposeImage,
        deletePurposeImage,
        isLoaded,
    };
}
