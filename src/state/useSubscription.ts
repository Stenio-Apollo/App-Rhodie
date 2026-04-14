import {useCallback, useEffect, useMemo, useState} from "react";
import type {Session} from "@supabase/supabase-js";
import type {
    CustomerInfo,
    PurchasesEntitlementInfo,
    PurchasesOfferings,
    PurchasesPackage,
} from "react-native-purchases";
import {getRevenueCatApiKey, isRevenueCatSupported, revenueCatEntitlementId} from "../lib/revenuecat";

type CustomerInfoListener = (info: CustomerInfo) => void;

type PurchasesModule = {
    isConfigured: () => Promise<boolean>;
    configure: (options: { apiKey: string; appUserID: string }) => void;
    getAppUserID: () => Promise<string>;
    logIn: (userId: string) => Promise<unknown>;
    addCustomerInfoUpdateListener: (listener: CustomerInfoListener) => void;
    removeCustomerInfoUpdateListener: (listener: CustomerInfoListener) => void;
    getOfferings: () => Promise<PurchasesOfferings>;
    getCustomerInfo: () => Promise<CustomerInfo>;
    purchasePackage: (pkg: PurchasesPackage) => Promise<{ customerInfo: CustomerInfo }>;
    restorePurchases: () => Promise<CustomerInfo>;
};

let cachedPurchasesModule: PurchasesModule | null | undefined;

function getPurchasesModule(): PurchasesModule | null {
    if (cachedPurchasesModule !== undefined) return cachedPurchasesModule;
    if (!isRevenueCatSupported()) {
        cachedPurchasesModule = null;
        return cachedPurchasesModule;
    }

    try {
        const loadedModule = require("react-native-purchases");
        cachedPurchasesModule = (loadedModule.default ?? loadedModule) as PurchasesModule;
    } catch {
        cachedPurchasesModule = null;
    }

    return cachedPurchasesModule;
}

function getActiveEntitlement(
    customerInfo: CustomerInfo | null,
): PurchasesEntitlementInfo | null {
    if (!customerInfo) return null;
    const explicit = customerInfo.entitlements.active[revenueCatEntitlementId];
    if (explicit) return explicit;
    const activeEntitlements = Object.values(customerInfo.entitlements.active);
    return activeEntitlements[0] ?? null;
}

async function configurePurchasesForUser(purchases: PurchasesModule, apiKey: string, userId: string) {
    const alreadyConfigured = await purchases.isConfigured();
    if (!alreadyConfigured) {
        purchases.configure({apiKey, appUserID: userId});
        return;
    }

    const currentUserId = await purchases.getAppUserID();
    if (currentUserId !== userId) {
        await purchases.logIn(userId);
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
    const purchases = getPurchasesModule();
    const billingConfigured = Boolean(apiKey && purchases);
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
        if (!purchases) {
            setCustomerInfo(null);
            return null;
        }
        const info = await purchases.getCustomerInfo();
        setCustomerInfo(info);
        return info;
    }, [purchases]);

    useEffect(() => {
        if (!session || !billingConfigured || !apiKey || !purchases) {
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
                await configurePurchasesForUser(purchases, apiKey, session.user.id);
                purchases.addCustomerInfoUpdateListener(listener);
                const [nextOfferings, nextInfo] = await Promise.all([
                    purchases.getOfferings(),
                    purchases.getCustomerInfo(),
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
            purchases.removeCustomerInfoUpdateListener(listener);
        };
    }, [apiKey, billingConfigured, purchases, session]);

    const purchase = useCallback(async () => {
        if (!billingConfigured || !purchases) {
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
            const result = await purchases.purchasePackage(primaryPackage);
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
    }, [billingConfigured, primaryPackage, purchases]);

    const restore = useCallback(async () => {
        if (!billingConfigured || !purchases) {
            setError("Billing is not configured.");
            return;
        }
        setRestoreBusy(true);
        setError(null);
        try {
            await purchases.restorePurchases();
            await refreshCustomerInfo();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Restore failed.";
            setError(message);
        } finally {
            setRestoreBusy(false);
        }
    }, [billingConfigured, purchases, refreshCustomerInfo]);

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
