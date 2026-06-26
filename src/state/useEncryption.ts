import {useCallback, useEffect, useMemo, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {Session} from "@supabase/supabase-js";
import {supabase} from "../lib/supabase";
import {
    createEncryptionProfile,
    createEncryptionProfileFromKey,
    type EncryptionKey,
    type EncryptionProfile,
    parseProfileVerifier,
    restoreEncryptionKeyFromDeviceCache,
    serializeEncryptionKeyForDevice,
    serializeProfileVerifier,
    unlockEncryptionProfile,
} from "../lib/e2ee";

type EncryptionProfileRow = {
    user_id: string;
    salt: string;
    verifier: string;
    key_verifier?: string | null;
    wrapped_key?: string | null;
    kdf: string;
    iterations: number;
    version: number;
};

export type EncryptionStatus = "loading" | "needs_setup" | "locked" | "unlocked" | "error";

const PROFILE_CACHE_PREFIX = "rhnative.encryption.profile.v1";
const KEY_CACHE_PREFIX = "rhnative.encryption.key.v1";
const PROFILE_LOAD_TIMEOUT_MS = 8000;

function profileCacheKey(userId: string): string {
    return `${PROFILE_CACHE_PREFIX}.${userId}`;
}

function keyCacheKey(userId: string): string {
    return `${KEY_CACHE_PREFIX}.${userId}`;
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
    const verifierPayload = parseProfileVerifier(row.verifier, row.version, row.key_verifier, row.wrapped_key);
    return {
        userId: row.user_id,
        salt: row.salt,
        verifier: verifierPayload.verifier,
        keyVerifier: verifierPayload.keyVerifier,
        wrappedKey: verifierPayload.wrappedKey,
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

    const cacheDeviceKey = useCallback(async (nextKey: EncryptionKey) => {
        try {
            await AsyncStorage.setItem(keyCacheKey(nextKey.profile.userId), serializeEncryptionKeyForDevice(nextKey));
        } catch (cacheError) {
            console.warn("Encryption key cache save error", cacheError);
        }
    }, []);

    const upsertProfile = useCallback(async (nextProfile: EncryptionProfile) => {
        const {error: upsertError} = await supabase.from("encryption_profiles").upsert({
            user_id: nextProfile.userId,
            salt: nextProfile.salt,
            verifier: serializeProfileVerifier(nextProfile),
            kdf: nextProfile.kdf,
            iterations: nextProfile.iterations,
            version: nextProfile.version,
            updated_at: new Date().toISOString(),
        }, {onConflict: "user_id"});

        if (upsertError) {
            setError(upsertError.message);
            throw upsertError;
        }
    }, []);

    const forgetDeviceKey = useCallback(async () => {
        setKey(null);
        if (userId) {
            await AsyncStorage.removeItem(keyCacheKey(userId));
        }
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
                        .select("*")
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
        await upsertProfile(next.profile);

        setProfile(next.profile);
        setKey(next);
        setStatus("unlocked");
        void cacheProfile(next.profile);
        void cacheDeviceKey(next);
    }, [cacheDeviceKey, cacheProfile, upsertProfile, userId]);

    const unlock = useCallback(async (passphrase: string) => {
        if (!profile) {
            throw new Error("Encryption profile is still loading. Please try again.");
        }
        setError(null);
        const next = await unlockEncryptionProfile(profile, passphrase);
        setProfile(next.profile);
        setKey(next);
        setStatus("unlocked");
        void cacheDeviceKey(next);
    }, [cacheDeviceKey, profile]);

    const changePin = useCallback(async (currentPin: string, nextPin: string) => {
        if (!profile) {
            throw new Error("Encryption profile is still loading. Please try again.");
        }
        setError(null);
        const currentKey = await unlockEncryptionProfile(profile, currentPin);
        const next = await createEncryptionProfileFromKey(profile.userId, nextPin, currentKey.keyBytes);
        await upsertProfile(next.profile);
        setProfile(next.profile);
        setKey(next);
        setStatus("unlocked");
        void cacheProfile(next.profile);
        void cacheDeviceKey(next);
    }, [cacheDeviceKey, cacheProfile, profile, upsertProfile]);

    const requestPinResetCode = useCallback(async () => {
        if (!profile) {
            throw new Error("Encryption profile is still loading. Please try again.");
        }
        const email = session?.user.email;
        if (!email) {
            throw new Error("No email is attached to this account.");
        }
        setError(null);
        const rawCachedKey = await AsyncStorage.getItem(keyCacheKey(profile.userId));
        const cachedKey = rawCachedKey ? restoreEncryptionKeyFromDeviceCache(profile, rawCachedKey) : null;
        if (!cachedKey) {
            throw new Error("This device cannot recover the PIN yet. Unlock once with the current PIN, then recovery will be available on this device.");
        }

        const {error: sendError} = await supabase.auth.signInWithOtp({
            email,
            options: {shouldCreateUser: false},
        });
        if (sendError) {
            throw sendError;
        }
        return true;
    }, [profile, session?.user.email]);

    const verifyPinResetCode = useCallback(async (emailCode: string) => {
        if (!profile) {
            throw new Error("Encryption profile is still loading. Please try again.");
        }
        const email = session?.user.email;
        if (!email) {
            throw new Error("No email is attached to this account.");
        }
        setError(null);
        const {error: verifyError} = await supabase.auth.verifyOtp({
            email,
            token: emailCode,
            type: "email",
        });
        if (verifyError) {
            throw verifyError;
        }
        return true;
    }, [profile, session?.user.email]);

    const resetPinAfterEmailVerification = useCallback(async (nextPin: string) => {
        if (!profile) {
            throw new Error("Encryption profile is still loading. Please try again.");
        }
        setError(null);
        const rawCachedKey = await AsyncStorage.getItem(keyCacheKey(profile.userId));
        const cachedKey = rawCachedKey ? restoreEncryptionKeyFromDeviceCache(profile, rawCachedKey) : null;
        if (!cachedKey) {
            throw new Error("This device cannot recover the PIN yet. Unlock once with the current PIN, then recovery will be available on this device.");
        }

        const next = await createEncryptionProfileFromKey(profile.userId, nextPin, cachedKey.keyBytes);
        await upsertProfile(next.profile);
        setProfile(next.profile);
        setKey(next);
        setStatus("unlocked");
        void cacheProfile(next.profile);
        void cacheDeviceKey(next);
    }, [cacheDeviceKey, cacheProfile, profile, upsertProfile]);

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
        changePin,
        requestPinResetCode,
        verifyPinResetCode,
        resetPinAfterEmailVerification,
        lock,
        forgetDeviceKey,
    }), [changePin, error, forgetDeviceKey, key, lock, profile, requestPinResetCode, resetPinAfterEmailVerification, setup, status, unlock, verifyPinResetCode]);
}

export type EncryptionState = ReturnType<typeof useEncryption>;
