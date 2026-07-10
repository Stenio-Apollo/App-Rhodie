import {useCallback, useEffect, useState} from "react";
import {
    FunctionsFetchError,
    FunctionsHttpError,
    FunctionsRelayError,
} from "@supabase/supabase-js";
import {supabase} from "../lib/supabase";

const SESSION_LOAD_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error("Auth session load timed out.")), timeoutMs);
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

async function getDeleteAccountErrorMessage(error: unknown): Promise<string> {
    if (error instanceof FunctionsHttpError) {
        const payload = await error.context.json().catch(() => null);
        if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
            return payload.error;
        }
        return "Delete account request was rejected.";
    }

    if (error instanceof FunctionsRelayError) {
        return "Supabase relay could not reach the delete-account function.";
    }

    if (error instanceof FunctionsFetchError) {
        return "Network error while deleting the account.";
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Something went wrong while deleting the account.";
}

export type SupabaseAuthState = ReturnType<typeof useSupabaseAuth>;

export function useSupabaseAuth() {
    const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        withTimeout(supabase.auth.getSession(), SESSION_LOAD_TIMEOUT_MS)
            .then(({data}) => {
                if (!mounted) return;
                setSession(data.session);
            })
            .catch((error) => {
                console.warn("Auth session load error", error);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        const {data: subscription} = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession);
            setLoading(false);
        });

        return () => {
            mounted = false;
            subscription?.subscription.unsubscribe();
        };
    }, []);

    const signInMagicLink = useCallback(async (email: string) => {
        const {error} = await supabase.auth.signInWithOtp({
            email,
            options: {shouldCreateUser: true},
        });
        return error;
    }, []);

    const verifyEmailOtp = useCallback(async (email: string, token: string) => {
        const {data, error} = await supabase.auth.verifyOtp({email, token, type: "email"});
        return {error, userId: data.user?.id ?? null};
    }, []);

    const signInWithPassword = useCallback(async (email: string, password: string) => {
        const {error, data} = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return {error, userId: data.user?.id ?? null};
    }, []);

    const signUpWithPassword = useCallback(async (email: string, password: string) => {
        const {error, data} = await supabase.auth.signUp({
            email,
            password,
        });
        return {error, userId: data.user?.id ?? null};
    }, []);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
    }, []);

    const deleteAccount = useCallback(async () => {
        if (!session) {
            return "You need to be signed in before deleting an account.";
        }

        const {error} = await supabase.functions.invoke("delete-account", {
            method: "POST",
        });

        if (error) {
            return getDeleteAccountErrorMessage(error);
        }

        const {error: signOutError} = await supabase.auth.signOut();
        return signOutError?.message ?? null;
    }, [session]);

    return {
        session,
        loading,
        signInMagicLink,
        verifyEmailOtp,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        deleteAccount,
    };
}
