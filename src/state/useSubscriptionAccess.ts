import {useCallback, useEffect, useMemo, useState} from "react";
import {Platform} from "react-native";
import type {Session} from "@supabase/supabase-js";
import {getTrialStatus} from "../lib/subscriptions";
import {
    type SubscriptionAccessRecord,
    type SubscriptionVerificationPayload,
    syncSubscriptionAccess,
} from "../lib/subscription-backend";
import {supabase} from "../lib/supabase";
import type {ActiveSubscriptionSnapshot} from "./useStoreBilling";

interface UseSubscriptionAccessOptions {
    session: Session | null;
    activeSubscription: ActiveSubscriptionSnapshot | null;
    verificationPayload: SubscriptionVerificationPayload;
    storeConnected: boolean;
    billingConfigured: boolean;
    billingLoading: boolean;
}

type SubscriptionAccessRow = {
    provider: string | null;
    platform: string | null;
    product_identifier: string | null;
    status: string | null;
    trial_started_at: string | null;
    trial_ends_at: string | null;
    current_period_ends_at: string | null;
    will_renew: boolean | null;
    last_verified_at: string | null;
    last_synced_from_client_at: string | null;
};

const STORED_ACCESS_LOAD_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error("Subscription access load timed out.")), timeoutMs);
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

function isFutureDate(value: string | null | undefined): boolean {
    if (!value) return false;
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now();
}

function mapAccessRow(
    row: SubscriptionAccessRow | null,
    fallbackTrial: ReturnType<typeof getTrialStatus>,
): SubscriptionAccessRecord | null {
    if (!row) return null;

    const hasSubscriptionAccess =
        (row.status === "active" || row.status === "billing_issue") &&
        Boolean(row.product_identifier) &&
        (!row.current_period_ends_at || isFutureDate(row.current_period_ends_at));
    const trialActive = isFutureDate(row.trial_ends_at);
    const accessSource: SubscriptionAccessRecord["accessSource"] = hasSubscriptionAccess
        ? "subscription"
        : trialActive
            ? "trial"
            : "none";

    return {
        hasAccess: accessSource !== "none",
        accessSource,
        trial: {
            startedAt: row.trial_started_at ?? fallbackTrial.startedAt,
            endsAt: row.trial_ends_at ?? fallbackTrial.endsAt,
            isActive: trialActive,
            daysRemaining: trialActive && row.trial_ends_at
                ? Math.ceil(Math.max(new Date(row.trial_ends_at).getTime() - Date.now(), 0) / (24 * 60 * 60 * 1000))
                : fallbackTrial.daysRemaining,
        },
        subscription: row.product_identifier ? {
            provider: row.provider,
            platform: row.platform,
            productIdentifier: row.product_identifier,
            status: row.status,
            expirationDate: row.current_period_ends_at,
            willRenew: row.will_renew ?? false,
            lastVerifiedAt: row.last_verified_at,
            lastSyncedAt: row.last_synced_from_client_at,
        } : null,
    };
}

export function useSubscriptionAccess({
                                          session,
                                          activeSubscription,
                                          verificationPayload,
                                          storeConnected,
                                          billingConfigured,
                                          billingLoading,
                                      }: UseSubscriptionAccessOptions) {
    const [backendAccess, setBackendAccess] = useState<SubscriptionAccessRecord | null>(null);
    const [loadingStoredAccess, setLoadingStoredAccess] = useState(false);
    const [storedAccessLoaded, setStoredAccessLoaded] = useState(false);

    const trialStatus = useMemo(
        () => getTrialStatus(session?.user.created_at ?? null),
        [session?.user.created_at],
    );

    const isSubscribed = Boolean(activeSubscription);
    const trialActive = trialStatus.isActive;
    const hasCachedSubscriptionAccess = backendAccess?.accessSource === "subscription";

    useEffect(() => {
        let mounted = true;

        async function loadStoredAccess() {
            if (!session) {
                setBackendAccess(null);
                setStoredAccessLoaded(true);
                setLoadingStoredAccess(false);
                return;
            }

            setLoadingStoredAccess(true);
            setStoredAccessLoaded(false);
            try {
                const {data, error} = await withTimeout(
                    supabase
                        .from("subscription_access")
                        .select(`
                            provider,
                            platform,
                            product_identifier,
                            status,
                            trial_started_at,
                            trial_ends_at,
                            current_period_ends_at,
                            will_renew,
                            last_verified_at,
                            last_synced_from_client_at
                        `)
                        .eq("user_id", session.user.id)
                        .maybeSingle(),
                    STORED_ACCESS_LOAD_TIMEOUT_MS,
                );

                if (!mounted) return;
                if (!error) {
                    setBackendAccess(mapAccessRow((data ?? null) as SubscriptionAccessRow | null, trialStatus));
                }
            } catch (error) {
                console.warn("Subscription access load error", error);
            } finally {
                if (!mounted) return;
                setStoredAccessLoaded(true);
                setLoadingStoredAccess(false);
            }
        }

        void loadStoredAccess();

        return () => {
            mounted = false;
        };
    }, [session, session?.user.id, trialStatus]);

    const syncBackendState = useCallback(
        async (
            activeSubscriptionSnapshot: ActiveSubscriptionSnapshot | null,
            payload: SubscriptionVerificationPayload,
        ) => {
            if (!session) {
                setBackendAccess(null);
                return null;
            }

            const record = await syncSubscriptionAccess({
                platform: Platform.OS,
                billingConfigured,
                storeConnected,
                activeSubscription: activeSubscriptionSnapshot,
                verificationPayload: payload,
            });
            setBackendAccess(record);
            return record;
        },
        [billingConfigured, session, storeConnected],
    );

    useEffect(() => {
        if (!session) {
            setBackendAccess(null);
            return;
        }
        if (!storedAccessLoaded || billingLoading) return;
        if (!activeSubscription && billingConfigured && (!storeConnected || hasCachedSubscriptionAccess)) return;

        void syncBackendState(activeSubscription, verificationPayload).catch(() => {
            // Local store state remains the fallback if backend sync fails.
        });
    }, [
        activeSubscription,
        billingConfigured,
        billingLoading,
        hasCachedSubscriptionAccess,
        session,
        storeConnected,
        storedAccessLoaded,
        syncBackendState,
        trialActive,
        verificationPayload,
    ]);

    const accessSource: "trial" | "subscription" | "none" =
        backendAccess?.accessSource ?? (isSubscribed ? "subscription" : trialActive ? "trial" : "none");
    const effectiveTrialActive = accessSource === "trial";
    const effectiveIsSubscribed = accessSource === "subscription";
    const trialStartedAt = backendAccess?.trial.startedAt ?? trialStatus.startedAt;
    const trialEndsAt = backendAccess?.trial.endsAt ?? trialStatus.endsAt;
    const trialDaysRemaining = backendAccess?.trial.daysRemaining ?? trialStatus.daysRemaining;

    return {
        backendAccess,
        loading: loadingStoredAccess,
        accessSource,
        isSubscribed: effectiveIsSubscribed,
        trialActive: effectiveTrialActive,
        trialStartedAt,
        trialEndsAt,
        trialDaysRemaining,
    };
}
