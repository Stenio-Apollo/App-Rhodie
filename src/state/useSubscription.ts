import type {Session} from "@supabase/supabase-js";
import {shouldBypassSubscriptions} from "../lib/subscriptions";
import {useStoreBilling} from "./useStoreBilling";
import {useSubscriptionAccess} from "./useSubscriptionAccess";

export function useSubscription(session: Session | null) {
    const billing = useStoreBilling(session);
    const access = useSubscriptionAccess({
        session,
        activeSubscription: billing.activeSubscription,
        verificationPayload: billing.verificationPayload,
        storeConnected: billing.storeConnected,
        billingConfigured: billing.billingConfigured,
        billingLoading: billing.loading,
    });
    const bypassSubscriptions = shouldBypassSubscriptions();
    const loading = billing.loading || access.loading;

    return {
        loading,
        billingConfigured: billing.billingConfigured,
        runtimeSupportsBilling: billing.runtimeSupportsBilling,
        storeConnected: billing.storeConnected,
        setupIssue: billing.setupIssue,
        plans: billing.plans,
        availablePurchases: billing.availablePurchases,
        backendAccess: access.backendAccess,
        activeSubscription: billing.activeSubscription,
        isSubscribed: bypassSubscriptions || access.isSubscribed,
        trialActive: !bypassSubscriptions && access.trialActive,
        trialStartedAt: access.trialStartedAt,
        trialEndsAt: access.trialEndsAt,
        trialDaysRemaining: access.trialDaysRemaining,
        requiresPaywall: !bypassSubscriptions && !loading && billing.runtimeSupportsBilling && access.accessSource === "none",
        purchaseBusy: billing.purchaseBusy,
        restoreBusy: billing.restoreBusy,
        manageBusy: billing.manageBusy,
        bypassSubscriptions,
        error: billing.error,
        purchasePlan: billing.purchasePlan,
        restore: billing.restore,
        openManageSubscriptions: billing.openManageSubscriptions,
        refreshStoreState: billing.refreshStoreState,
    };
}
