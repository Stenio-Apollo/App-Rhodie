import {useCallback, useEffect, useMemo, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {Session} from "@supabase/supabase-js";
import {supabase} from "../lib/supabase";
import {
    createEncryptionProfile,
    type EncryptionKey,
    type EncryptionProfile,
    unlockEncryptionProfile,
} from "../lib/e2ee";

type EncryptionProfileRow = {
    user_id: string;
    salt: string;
    verifier: string;
    kdf: string;
    iterations: number;
    version: number;
};

export type EncryptionStatus = "loading" | "needs_setup" | "locked" | "unlocked" | "error";

const PROFILE_CACHE_PREFIX = "rhnative.encryption.profile.v1";
const PROFILE_LOAD_TIMEOUT_MS = 8000;

function profileCacheKey(userId: string): string {
    return `${PROFILE_CACHE_PREFIX}.${userId}`;
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error("Encryption profile load timed out.")), timeoutMs);
        promise.then(
            (value) => {
                clearTimeout(timeoutId);
                resolve(value);
            },
            (error) => {
                clearTimeout(timeoutId);
                reject(error);
            },
        );
    });
}

function rowToProfile(row: EncryptionProfileRow): EncryptionProfile {
    return {
        userId: row.user_id,
        salt: row.salt,
        verifier: row.verifier,
        kdf: row.kdf,
        iterations: row.iterations,
        version: row.version,
    };
}

export function useEncryption(session: Session | null) {
    const userId = session?.user.id ?? null;
    const [status, setStatus] = useState<EncryptionStatus>("loading");
    const [profile, setProfile] = useState<EncryptionProfile | null>(null);
    const [key, setKey] = useState<EncryptionKey | null>(null);
    const [error, setError] = useState<string | null>(null);

    const cacheProfile = useCallback(async (nextProfile: EncryptionProfile) => {
        try {
            await AsyncStorage.setItem(profileCacheKey(nextProfile.userId), JSON.stringify(nextProfile));
        } catch (cacheError) {
            console.warn("Encryption profile cache save error", cacheError);
        }
    }, []);

    const forgetDeviceKey = useCallback(async () => {
        setKey(null);
        if (profile) setStatus("locked");
    }, [profile, userId]);

    useEffect(() => {
        let mounted = true;

        async function loadProfile() {
            let hasUsableCachedProfile = false;
            try {
                setKey(null);
                setProfile(null);
                setError(null);

                if (!userId) {
                    setStatus("unlocked");
                    return;
                }

                setStatus("loading");

                const cachedProfileRaw = await AsyncStorage.getItem(profileCacheKey(userId));
                if (!mounted) return;
                if (cachedProfileRaw) {
                    try {
                        const cachedProfile = JSON.parse(cachedProfileRaw) as EncryptionProfile;
                        if (cachedProfile.userId === userId && cachedProfile.salt && cachedProfile.verifier) {
                            hasUsableCachedProfile = true;
                            setProfile(cachedProfile);
                            setStatus("locked");
                        }
                    } catch {
                        // Bad cache should not block the remote profile load.
                    }
                }

                const {data, error: profileError} = await withTimeout(
                    supabase
                        .from("encryption_profiles")
                        .select("user_id, salt, verifier, kdf, iterations, version")
                        .eq("user_id", userId)
                        .maybeSingle(),
                    PROFILE_LOAD_TIMEOUT_MS,
                );

                if (!mounted) return;

                if (profileError) {
                    setError(profileError.message);
                    setStatus("error");
                    return;
                }

                if (!data) {
                    setStatus("needs_setup");
                    return;
                }

                const nextProfile = rowToProfile(data as EncryptionProfileRow);
                setProfile(nextProfile);
                void cacheProfile(nextProfile);
                setStatus("locked");
            } catch (loadError) {
                console.warn("Encryption profile load error", loadError);
                if (!mounted) return;
                setError(loadError instanceof Error ? loadError.message : "Could not load encryption profile.");
                setStatus(hasUsableCachedProfile ? "locked" : "error");
            }
        }

        void loadProfile();

        return () => {
            mounted = false;
        };
    }, [userId]);

    const setup = useCallback(async (passphrase: string) => {
        if (!userId) return;
        setError(null);
        const next = await createEncryptionProfile(userId, passphrase);
        const {error: upsertError} = await supabase.from("encryption_profiles").upsert({
            user_id: next.profile.userId,
            salt: next.profile.salt,
            verifier: next.profile.verifier,
            kdf: next.profile.kdf,
            iterations: next.profile.iterations,
            version: next.profile.version,
            updated_at: new Date().toISOString(),
        }, {onConflict: "user_id"});

        if (upsertError) {
            setError(upsertError.message);
            throw upsertError;
        }

        setProfile(next.profile);
        setKey(next);
        setStatus("unlocked");
        void cacheProfile(next.profile);
    }, [cacheProfile, userId]);

    const unlock = useCallback(async (passphrase: string) => {
        if (!profile) {
            throw new Error("Encryption profile is still loading. Please try again.");
        }
        setError(null);
        const next = await unlockEncryptionProfile(profile, passphrase);
        setProfile(next.profile);
        setKey(next);
        setStatus("unlocked");
    }, [profile]);

    const lock = useCallback(() => {
        if (!profile) return;
        setKey(null);
        setStatus("locked");
    }, [profile]);

    return useMemo(() => ({
        status,
        profile,
        key,
        error,
        isReady: status !== "loading",
        isUnlocked: status === "unlocked" && Boolean(key),
        setup,
        unlock,
        lock,
        forgetDeviceKey,
    }), [error, forgetDeviceKey, key, lock, profile, setup, status, unlock]);
}

export type EncryptionState = ReturnType<typeof useEncryption>;
