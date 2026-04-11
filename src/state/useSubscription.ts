import {useCallback, useEffect, useMemo, useState} from "react";
import Purchases, {
    type CustomerInfo,
    type PurchasesEntitlementInfo,
    type PurchasesOfferings,
    type PurchasesPackage,
} from "react-native-purchases";
import type {Session} from "@supabase/supabase-js";
import {getRevenueCatApiKey, isRevenueCatSupported, revenueCatEntitlementId} from "../lib/revenuecat";

function getActiveEntitlement(
    customerInfo: CustomerInfo | null,
): PurchasesEntitlementInfo | null {
    if (!customerInfo) return null;
    const explicit = customerInfo.entitlements.active[revenueCatEntitlementId];
    if (explicit) return explicit;
    const activeEntitlements = Object.values(customerInfo.entitlements.active);
    return activeEntitlements[0] ?? null;
}

async function configurePurchasesForUser(apiKey: string, userId: string) {
    const alreadyConfigured = await Purchases.isConfigured();
    if (!alreadyConfigured) {
        Purchases.configure({apiKey, appUserID: userId});
        return;
    }

    const currentUserId = await Purchases.getAppUserID();
    if (currentUserId !== userId) {
        await Purchases.logIn(userId);
    }
}

export function useSubscription(session: Session | null) {
    const [loading, setLoading] = useState(false);
    const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [purchaseBusy, setPurchaseBusy] = useState(false);
    const [restoreBusy, setRestoreBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const apiKey = getRevenueCatApiKey();
    const billingConfigured = Boolean(apiKey) && isRevenueCatSupported();
    const activeEntitlement = useMemo(
        () => getActiveEntitlement(customerInfo),
        [customerInfo],
    );
    const isSubscribed = Boolean(activeEntitlement?.isActive);
    const trialActive = activeEntitlement?.periodType === "TRIAL";

    const primaryPackage = useMemo(() => {
        if (!offerings?.current) return null;
        return offerings.current.monthly ?? offerings.current.availablePackages[0] ?? null;
    }, [offerings]);

    const refreshCustomerInfo = useCallback(async () => {
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        return info;
    }, []);

    useEffect(() => {
        if (!session || !billingConfigured || !apiKey) {
            setLoading(false);
            setOfferings(null);
            setCustomerInfo(null);
            setError(null);
            return;
        }

        let mounted = true;
        setLoading(true);
        setError(null);

        const listener = (info: CustomerInfo) => {
            if (!mounted) return;
            setCustomerInfo(info);
        };

        void (async () => {
            try {
                await configurePurchasesForUser(apiKey, session.user.id);
                Purchases.addCustomerInfoUpdateListener(listener);
                const [nextOfferings, nextInfo] = await Promise.all([
                    Purchases.getOfferings(),
                    Purchases.getCustomerInfo(),
                ]);
                if (!mounted) return;
                setOfferings(nextOfferings);
                setCustomerInfo(nextInfo);
            } catch (err) {
                if (!mounted) return;
                const message = err instanceof Error ? err.message : "Failed to load subscription data.";
                setError(message);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
            Purchases.removeCustomerInfoUpdateListener(listener);
        };
    }, [apiKey, billingConfigured, session]);

    const purchase = useCallback(async () => {
        if (!billingConfigured) {
            setError("Billing is not configured.");
            return;
        }
        if (!primaryPackage) {
            setError("No subscription package is currently available.");
            return;
        }
        setPurchaseBusy(true);
        setError(null);
        try {
            const result = await Purchases.purchasePackage(primaryPackage);
            setCustomerInfo(result.customerInfo);
        } catch (err: unknown) {
            const cancelled = Boolean((err as {userCancelled?: boolean} | null)?.userCancelled);
            if (!cancelled) {
                const message = err instanceof Error ? err.message : "Purchase failed.";
                setError(message);
            }
        } finally {
            setPurchaseBusy(false);
        }
    }, [billingConfigured, primaryPackage]);

    const restore = useCallback(async () => {
        if (!billingConfigured) {
            setError("Billing is not configured.");
            return;
        }
        setRestoreBusy(true);
        setError(null);
        try {
            await Purchases.restorePurchases();
            await refreshCustomerInfo();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Restore failed.";
            setError(message);
        } finally {
            setRestoreBusy(false);
        }
    }, [billingConfigured, refreshCustomerInfo]);

    return {
        loading,
        billingConfigured,
        offerings,
        primaryPackage,
        customerInfo,
        activeEntitlement,
        isSubscribed,
        trialActive,
        requiresPaywall: billingConfigured && !isSubscribed,
        purchaseBusy,
        restoreBusy,
        error,
        purchase,
        restore,
        refreshCustomerInfo,
    };
}

