import {useCallback, useEffect, useMemo, useState} from "react";
import type {Session} from "@supabase/supabase-js";
import type {
    CustomerInfo,
    PurchasesEntitlementInfo,
    PurchasesOffering,
    PurchasesOfferings,
    PurchasesPackage,
} from "react-native-purchases";
import {getRevenueCatApiKey, isRevenueCatSupported, revenueCatEntitlementId} from "../lib/revenuecat";

type SubscriptionPlanId = "lifetime" | "yearly" | "monthly";

type SubscriptionPlan = {
    id: SubscriptionPlanId;
    title: string;
    subtitle: string;
    pkg: PurchasesPackage | null;
    priceLabel: string | null;
    productIdentifier: string | null;
};

type CustomerInfoListener = (info: CustomerInfo) => void;

type PurchasesModule = {
    LOG_LEVEL?: {
        DEBUG: string;
    };
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
    setLogLevel?: (level: string) => Promise<void>;
};

type RevenueCatUiModule = {
    PAYWALL_RESULT: {
        NOT_PRESENTED: string;
        ERROR: string;
        CANCELLED: string;
        PURCHASED: string;
        RESTORED: string;
    };
    presentPaywall: (params?: { offering?: PurchasesOffering }) => Promise<string>;
    presentPaywallIfNeeded: (params: {
        requiredEntitlementIdentifier: string;
        offering?: PurchasesOffering;
    }) => Promise<string>;
    presentCustomerCenter: () => Promise<void>;
};

const PLAN_METADATA: Record<SubscriptionPlanId, { title: string; subtitle: string }> = {
    lifetime: {title: "Lifetime", subtitle: "One payment, permanent access"},
    yearly: {title: "Yearly", subtitle: "Best value for long-term consistency"},
    monthly: {title: "Monthly", subtitle: "Flexible recurring access"},
};

let cachedPurchasesModule: PurchasesModule | null | undefined;
let cachedRevenueCatUiModule: RevenueCatUiModule | null | undefined;

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

function getRevenueCatUiModule(): RevenueCatUiModule | null {
    if (cachedRevenueCatUiModule !== undefined) return cachedRevenueCatUiModule;
    if (!isRevenueCatSupported()) {
        cachedRevenueCatUiModule = null;
        return cachedRevenueCatUiModule;
    }

    try {
        const loadedModule = require("react-native-purchases-ui");
        cachedRevenueCatUiModule = (loadedModule.default ?? loadedModule) as RevenueCatUiModule;
    } catch {
        cachedRevenueCatUiModule = null;
    }

    return cachedRevenueCatUiModule;
}

function normalize(value: string | null | undefined): string {
    return (value ?? "").trim().toLowerCase();
}

function packageMatchesPlan(pkg: PurchasesPackage, planId: SubscriptionPlanId): boolean {
    const values = [
        normalize(pkg.identifier),
        normalize(pkg.packageType),
        normalize(pkg.product.identifier),
    ];

    if (planId === "lifetime") {
        return values.some((value) => value.includes("lifetime"));
    }

    if (planId === "yearly") {
        return values.some((value) => value.includes("annual") || value.includes("yearly") || value.includes("year"));
    }

    return values.some((value) => value.includes("monthly") || value.includes("month"));
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

function getPackageForPlan(offerings: PurchasesOfferings | null, planId: SubscriptionPlanId): PurchasesPackage | null {
    const packages = offerings?.current?.availablePackages ?? [];
    return packages.find((pkg) => packageMatchesPlan(pkg, planId)) ?? null;
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    return fallback;
}

async function configurePurchasesForUser(purchases: PurchasesModule, apiKey: string, userId: string) {
    if (__DEV__ && purchases.setLogLevel && purchases.LOG_LEVEL?.DEBUG) {
        await purchases.setLogLevel(purchases.LOG_LEVEL.DEBUG);
    }

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

function didUnlockAccess(paywallResult: string, uiModule: RevenueCatUiModule): boolean {
    return (
        paywallResult === uiModule.PAYWALL_RESULT.PURCHASED ||
        paywallResult === uiModule.PAYWALL_RESULT.RESTORED
    );
}

export function useSubscription(session: Session | null) {
    const [loading, setLoading] = useState(false);
    const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [purchaseBusy, setPurchaseBusy] = useState(false);
    const [restoreBusy, setRestoreBusy] = useState(false);
    const [paywallBusy, setPaywallBusy] = useState(false);
    const [customerCenterBusy, setCustomerCenterBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const apiKey = getRevenueCatApiKey();
    const purchases = getPurchasesModule();
    const revenueCatUI = getRevenueCatUiModule();
    const runtimeSupportsBilling = isRevenueCatSupported();
    const billingConfigured = Boolean(apiKey && purchases);
    const setupIssue = runtimeSupportsBilling && !billingConfigured
        ? "RevenueCat is not configured for this build. Add the iOS/Android public API keys before launch."
        : null;
    const activeEntitlement = useMemo(
        () => getActiveEntitlement(customerInfo),
        [customerInfo],
    );
    const isSubscribed = Boolean(activeEntitlement?.isActive);
    const trialActive = activeEntitlement?.periodType === "TRIAL";

    const primaryOffering = offerings?.current ?? null;
    const primaryPackage = useMemo(() => {
        if (!primaryOffering) return null;
        return primaryOffering.monthly ?? primaryOffering.availablePackages[0] ?? null;
    }, [primaryOffering]);

    const plans = useMemo<SubscriptionPlan[]>(() => (
        (["lifetime", "yearly", "monthly"] as SubscriptionPlanId[]).map((planId) => {
            const pkg = getPackageForPlan(offerings, planId);
            return {
                id: planId,
                title: PLAN_METADATA[planId].title,
                subtitle: PLAN_METADATA[planId].subtitle,
                pkg,
                priceLabel: pkg?.product.priceString ?? null,
                productIdentifier: pkg?.product.identifier ?? null,
            };
        })
    ), [offerings]);

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
                setError(getErrorMessage(err, "Failed to load subscription data."));
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
            purchases.removeCustomerInfoUpdateListener(listener);
        };
    }, [apiKey, billingConfigured, purchases, session]);

    const purchasePackage = useCallback(async (pkg: PurchasesPackage | null) => {
        if (!billingConfigured || !purchases) {
            setError("Billing is not configured.");
            return false;
        }
        if (!pkg) {
            setError("That subscription package is not available in the current RevenueCat offering.");
            return false;
        }
        setPurchaseBusy(true);
        setError(null);
        try {
            const result = await purchases.purchasePackage(pkg);
            setCustomerInfo(result.customerInfo);
            return true;
        } catch (err: unknown) {
            const cancelled = Boolean((err as {userCancelled?: boolean} | null)?.userCancelled);
            if (!cancelled) {
                setError(getErrorMessage(err, "Purchase failed."));
            }
            return false;
        } finally {
            setPurchaseBusy(false);
        }
    }, [billingConfigured, purchases]);

    const purchase = useCallback(async () => {
        return purchasePackage(primaryPackage);
    }, [primaryPackage, purchasePackage]);

    const purchasePlan = useCallback(async (planId: SubscriptionPlanId) => {
        const selectedPlan = plans.find((plan) => plan.id === planId) ?? null;
        return purchasePackage(selectedPlan?.pkg ?? null);
    }, [plans, purchasePackage]);

    const restore = useCallback(async () => {
        if (!billingConfigured || !purchases) {
            setError("Billing is not configured.");
            return false;
        }
        setRestoreBusy(true);
        setError(null);
        try {
            const nextInfo = await purchases.restorePurchases();
            setCustomerInfo(nextInfo);
            await refreshCustomerInfo();
            return true;
        } catch (err) {
            setError(getErrorMessage(err, "Restore failed."));
            return false;
        } finally {
            setRestoreBusy(false);
        }
    }, [billingConfigured, purchases, refreshCustomerInfo]);

    const presentPaywall = useCallback(async () => {
        if (!billingConfigured) {
            setError("Billing is not configured.");
            return false;
        }
        if (!revenueCatUI) {
            setError("RevenueCat Paywalls UI is not available in this build.");
            return false;
        }
        setPaywallBusy(true);
        setError(null);
        try {
            const result = await revenueCatUI.presentPaywall(
                primaryOffering ? {offering: primaryOffering} : undefined,
            );
            if (didUnlockAccess(result, revenueCatUI)) {
                await refreshCustomerInfo();
                return true;
            }
            return false;
        } catch (err) {
            setError(getErrorMessage(err, "Could not present the RevenueCat paywall."));
            return false;
        } finally {
            setPaywallBusy(false);
        }
    }, [billingConfigured, primaryOffering, refreshCustomerInfo, revenueCatUI]);

    const presentPaywallIfNeeded = useCallback(async () => {
        if (!billingConfigured) {
            setError("Billing is not configured.");
            return false;
        }
        if (!revenueCatUI) {
            setError("RevenueCat Paywalls UI is not available in this build.");
            return false;
        }
        setPaywallBusy(true);
        setError(null);
        try {
            const result = await revenueCatUI.presentPaywallIfNeeded({
                requiredEntitlementIdentifier: revenueCatEntitlementId,
                offering: primaryOffering ?? undefined,
            });
            if (didUnlockAccess(result, revenueCatUI)) {
                await refreshCustomerInfo();
                return true;
            }
            return false;
        } catch (err) {
            setError(getErrorMessage(err, "Could not present the entitlement-gated RevenueCat paywall."));
            return false;
        } finally {
            setPaywallBusy(false);
        }
    }, [billingConfigured, primaryOffering, refreshCustomerInfo, revenueCatUI]);

    const presentCustomerCenter = useCallback(async () => {
        if (!billingConfigured) {
            setError("Billing is not configured.");
            return false;
        }
        if (!revenueCatUI) {
            setError("RevenueCat Customer Center is not available in this build.");
            return false;
        }
        setCustomerCenterBusy(true);
        setError(null);
        try {
            await revenueCatUI.presentCustomerCenter();
            await refreshCustomerInfo();
            return true;
        } catch (err) {
            setError(getErrorMessage(err, "Could not open RevenueCat Customer Center."));
            return false;
        } finally {
            setCustomerCenterBusy(false);
        }
    }, [billingConfigured, refreshCustomerInfo, revenueCatUI]);

    return {
        loading,
        billingConfigured,
        runtimeSupportsBilling,
        setupIssue,
        offerings,
        primaryOffering,
        primaryPackage,
        plans,
        customerInfo,
        activeEntitlement,
        isSubscribed,
        trialActive,
        requiresPaywall: runtimeSupportsBilling && !isSubscribed,
        purchaseBusy,
        restoreBusy,
        paywallBusy,
        customerCenterBusy,
        paywallAvailable: Boolean(revenueCatUI),
        customerCenterAvailable: Boolean(revenueCatUI),
        error,
        purchase,
        purchasePlan,
        restore,
        presentPaywall,
        presentPaywallIfNeeded,
        presentCustomerCenter,
        refreshCustomerInfo,
    };
}
