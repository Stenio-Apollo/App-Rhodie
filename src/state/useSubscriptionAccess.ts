import {useCallback, useEffect, useMemo, useState} from "react";
import {Platform} from "react-native";
import type {Session} from "@supabase/supabase-js";
import {getTrialStatus} from "../lib/subscriptions";
import {
    type SubscriptionAccessRecord,
    type SubscriptionVerificationPayload,
    syncSubscriptionAccess,
} from "../lib/subscription-backend";
import type {ActiveSubscriptionSnapshot} from "./useStoreBilling";

interface UseSubscriptionAccessOptions {
    session: Session | null;
    activeSubscription: ActiveSubscriptionSnapshot | null;
    verificationPayload: SubscriptionVerificationPayload;
    storeConnected: boolean;
    billingConfigured: boolean;
}

export function useSubscriptionAccess({
                                          session,
                                          activeSubscription,
                                          verificationPayload,
                                          storeConnected,
                                          billingConfigured,
                                      }: UseSubscriptionAccessOptions) {
    const [backendAccess, setBackendAccess] = useState<SubscriptionAccessRecord | null>(null);

    const trialStatus = useMemo(
        () => getTrialStatus(session?.user.created_at ?? null),
        [session?.user.created_at],
    );

    const isSubscribed = Boolean(activeSubscription);
    const trialActive = trialStatus.isActive;

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

        void syncBackendState(activeSubscription, verificationPayload).catch(() => {
            // Local store state remains the fallback if backend sync fails.
        });
    }, [activeSubscription, session, syncBackendState, trialActive, verificationPayload]);

    const accessSource: "trial" | "subscription" | "none" =
        backendAccess?.accessSource ?? (isSubscribed ? "subscription" : trialActive ? "trial" : "none");
    const effectiveTrialActive = accessSource === "trial";
    const effectiveIsSubscribed = accessSource === "subscription";
    const trialStartedAt = backendAccess?.trial.startedAt ?? trialStatus.startedAt;
    const trialEndsAt = backendAccess?.trial.endsAt ?? trialStatus.endsAt;
    const trialDaysRemaining = backendAccess?.trial.daysRemaining ?? trialStatus.daysRemaining;

    return {
        backendAccess,
        accessSource,
        isSubscribed: effectiveIsSubscribed,
        trialActive: effectiveTrialActive,
        trialStartedAt,
        trialEndsAt,
        trialDaysRemaining,
    };
}
