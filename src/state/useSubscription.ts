import {useCallback, useEffect, useMemo, useState} from "react";
import type {Session} from "@supabase/supabase-js";
import {
    allSubscriptionProductIds,
    getAndroidPackageName,
    getTrialStatus,
    isNativeBillingSupported,
    shouldBypassSubscriptions,
    subscriptionProductIds,
} from "../lib/subscriptions";
import {
    type SubscriptionAccessRecord,
    type SubscriptionVerificationPayload,
    syncSubscriptionAccess,
} from "../lib/subscription-backend";
import {Platform} from "react-native";
import type {ActiveSubscription, MutationRequestPurchaseArgs, ProductSubscription, Purchase,} from "expo-iap";

type SubscriptionPlanId = "yearly" | "monthly";

type SubscriptionPlan = {
    id: SubscriptionPlanId;
    title: string;
    subtitle: string;
    priceLabel: string | null;
    productIdentifier: string;
    storeOfferToken: string | null;
};

type ExpoIapModule = {
    initConnection: () => Promise<boolean>;
    endConnection: () => Promise<void> | void;
    fetchProducts: (params: {
        skus: string[];
        type?: "subs" | "in-app" | "all" | "inapp";
    }) => Promise<ProductSubscription[]>;
    getAvailablePurchases: (options?: {
        alsoPublishToEventListenerIOS?: boolean;
        onlyIncludeActiveItemsIOS?: boolean;
        includeSuspendedAndroid?: boolean;
    }) => Promise<Purchase[]>;
    getActiveSubscriptions: (subscriptionIds?: string[]) => Promise<ActiveSubscription[]>;
    requestPurchase: (args: MutationRequestPurchaseArgs) => Promise<Purchase | Purchase[] | null>;
    finishTransaction: (args: {
        purchase: {
            id: string;
            ids?: string[];
            isAutoRenewing?: boolean;
            platform: Purchase["platform"];
            productId: string;
            purchaseState: Purchase["purchaseState"];
            purchaseToken?: string | null;
            quantity: number;
            store: Purchase["store"];
            transactionDate: number;
            transactionId: string;
        };
        isConsumable?: boolean | null;
    }) => Promise<void>;
    restorePurchases: () => Promise<void>;
    purchaseUpdatedListener: (listener: (purchase: Purchase) => void) => { remove: () => void };
    purchaseErrorListener: (listener: (error: { code?: string; message?: string }) => void) => { remove: () => void };
    deepLinkToSubscriptions: (args?: {
        skuAndroid?: string | null;
        packageNameAndroid?: string | null;
    } | null) => Promise<void>;
};

const PLAN_METADATA: Record<SubscriptionPlanId, { title: string; subtitle: string }> = {
    yearly: {
        title: "Yearly",
        subtitle: "Yearly renewal of journaling, goal tracking, task management, event tracking, and insights access.",
    },
    monthly: {
        title: "Monthly",
        subtitle: "Monthly renewal of journaling, goal tracking, task management, event tracking, and insights access.",
    },
};

let cachedExpoIapModule: ExpoIapModule | null | undefined;

function getExpoIapModule(): ExpoIapModule | null {
    if (cachedExpoIapModule !== undefined) return cachedExpoIapModule;
    if (!isNativeBillingSupported()) {
        cachedExpoIapModule = null;
        return cachedExpoIapModule;
    }

    try {
        const loadedModule = require("expo-iap");
        cachedExpoIapModule = (loadedModule.default ?? loadedModule) as ExpoIapModule;
    } catch {
        cachedExpoIapModule = null;
    }

    return cachedExpoIapModule;
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    if (typeof error === "object" && error && "message" in error && typeof error.message === "string" && error.message.trim()) {
        return error.message;
    }
    return fallback;
}

function isCancelledPurchaseError(error: { code?: string; message?: string } | null | undefined): boolean {
    const code = (error?.code ?? "").toLowerCase();
    const message = (error?.message ?? "").toLowerCase();
    return code.includes("cancel") || message.includes("cancel");
}

function toPurchaseInput(purchase: Purchase) {
    return {
        id: purchase.id,
        ids: purchase.ids ?? undefined,
        isAutoRenewing: purchase.isAutoRenewing,
        platform: purchase.platform,
        productId: purchase.productId,
        purchaseState: purchase.purchaseState,
        purchaseToken: purchase.purchaseToken ?? null,
        quantity: purchase.quantity,
        store: purchase.store,
        transactionDate: purchase.transactionDate,
        transactionId: purchase.transactionId ?? purchase.id,
    };
}

function getPlanProductId(planId: SubscriptionPlanId): string {
    return planId === "yearly" ? subscriptionProductIds.yearly : subscriptionProductIds.monthly;
}

function getProductForPlan(products: ProductSubscription[], planId: SubscriptionPlanId) {
    const productId = getPlanProductId(planId);
    return products.find((product) => product.id === productId) ?? null;
}

function getAndroidOfferToken(product: ProductSubscription | null): string | null {
    if (!product || product.platform !== "android") return null;
    const matchingOffer = product.subscriptionOffers?.find((offer) => Boolean(offer.offerTokenAndroid)) ?? null;
    return matchingOffer?.offerTokenAndroid ?? null;
}

function getVerificationPayload(
    activeSubscription: {
        productIdentifier: string;
        expirationDate: string | null;
        willRenew: boolean;
        unsubscribeDetectedAt: string | null;
        billingIssueDetectedAt: string | null;
    } | null,
    availablePurchases: Purchase[],
): SubscriptionVerificationPayload {
    if (!activeSubscription) return null;

    const matchingPurchase = [...availablePurchases]
        .filter((purchase) => purchase.productId === activeSubscription.productIdentifier)
        .sort((left, right) => right.transactionDate - left.transactionDate)[0] ?? null;

    if (!matchingPurchase) return null;

    if (Platform.OS === "ios") {
        return {
            platform: "ios",
            productIdentifier: matchingPurchase.productId,
            purchaseToken: matchingPurchase.purchaseToken ?? null,
            transactionId: matchingPurchase.transactionId ?? null,
            environmentIOS: "environmentIOS" in matchingPurchase && typeof matchingPurchase.environmentIOS === "string"
                ? matchingPurchase.environmentIOS
                : null,
        };
    }

    return {
        platform: "android",
        productIdentifier: matchingPurchase.productId,
        purchaseToken: matchingPurchase.purchaseToken ?? null,
        transactionId: matchingPurchase.transactionId ?? null,
        packageNameAndroid: getAndroidPackageName(),
    };
}

function buildPurchaseRequest(plan: SubscriptionPlan): MutationRequestPurchaseArgs {
    if (Platform.OS === "ios") {
        return {
            type: "subs",
            request: {
                apple: {
                    sku: plan.productIdentifier,
                },
            },
        };
    }

    return {
        type: "subs",
        request: {
            google: {
                skus: [plan.productIdentifier],
                subscriptionOffers: plan.storeOfferToken
                    ? [{sku: plan.productIdentifier, offerToken: plan.storeOfferToken}]
                    : undefined,
            },
        },
    };
}

export function useSubscription(session: Session | null) {
    const billingModule = getExpoIapModule();
    const runtimeSupportsBilling = isNativeBillingSupported();
    const bypassSubscriptions = shouldBypassSubscriptions();
    const billingConfigured = Boolean(runtimeSupportsBilling && billingModule);

    const [loading, setLoading] = useState(false);
    const [storeConnected, setStoreConnected] = useState(false);
    const [products, setProducts] = useState<ProductSubscription[]>([]);
    const [availablePurchases, setAvailablePurchases] = useState<Purchase[]>([]);
    const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);
    const [purchaseBusy, setPurchaseBusy] = useState(false);
    const [restoreBusy, setRestoreBusy] = useState(false);
    const [manageBusy, setManageBusy] = useState(false);
    const [backendAccess, setBackendAccess] = useState<SubscriptionAccessRecord | null>(null);
    const [error, setError] = useState<string | null>(null);
    const setupIssue = runtimeSupportsBilling && !billingConfigured
        ? "Native billing is unavailable in this build."
        : !runtimeSupportsBilling
            ? "Subscriptions require a development build, TestFlight, or production build. Expo Go cannot access App Store or Play billing."
            : null;
    const trialStatus = useMemo(
        () => getTrialStatus(session?.user.created_at ?? null),
        [session?.user.created_at],
    );

    const plans = useMemo<SubscriptionPlan[]>(() => (
        (["yearly", "monthly"] as SubscriptionPlanId[]).map((planId) => {
            const product = getProductForPlan(products, planId);
            return {
                id: planId,
                title: PLAN_METADATA[planId].title,
                subtitle: PLAN_METADATA[planId].subtitle,
                priceLabel: product?.displayPrice ?? null,
                productIdentifier: product?.id ?? getPlanProductId(planId),
                storeOfferToken: getAndroidOfferToken(product),
            };
        })
    ), [products]);

    const refreshStoreState = useCallback(async () => {
        if (!billingConfigured || !billingModule) {
            setProducts([]);
            setAvailablePurchases([]);
            setActiveSubscriptions([]);
            return false;
        }

        const [nextProducts, nextPurchases, nextSubscriptions] = await Promise.all([
            billingModule.fetchProducts({skus: allSubscriptionProductIds, type: "subs"}),
            billingModule.getAvailablePurchases({
                onlyIncludeActiveItemsIOS: true,
                includeSuspendedAndroid: false,
            }),
            billingModule.getActiveSubscriptions(allSubscriptionProductIds),
        ]);

        setProducts(nextProducts ?? []);
        setAvailablePurchases(nextPurchases ?? []);
        setActiveSubscriptions(nextSubscriptions ?? []);
        return true;
    }, [billingConfigured, billingModule]);

    const syncBackendState = useCallback(async (activeSubscriptionSnapshot: {
        productIdentifier: string;
        expirationDate: string | null;
        willRenew: boolean;
        unsubscribeDetectedAt: string | null;
        billingIssueDetectedAt: string | null;
    } | null, verificationPayload: SubscriptionVerificationPayload) => {
        if (!session) {
            setBackendAccess(null);
            return null;
        }

        const record = await syncSubscriptionAccess({
            platform: Platform.OS,
            billingConfigured,
            storeConnected,
            activeSubscription: activeSubscriptionSnapshot,
            verificationPayload,
        });
        setBackendAccess(record);
        return record;
    }, [billingConfigured, session, storeConnected]);

    useEffect(() => {
        if (!session || !billingConfigured || !billingModule) {
            setLoading(false);
            setStoreConnected(false);
            setProducts([]);
            setAvailablePurchases([]);
            setActiveSubscriptions([]);
            setBackendAccess(null);
            setError(null);
            return;
        }

        let mounted = true;
        setLoading(true);
        setError(null);
        const purchaseUpdateSubscription = billingModule.purchaseUpdatedListener((purchase) => {
            void (async () => {
                try {
                    await billingModule.finishTransaction({
                        purchase: toPurchaseInput(purchase),
                        isConsumable: false,
                    });
                    if (!mounted) return;
                    await refreshStoreState();
                } catch (err) {
                    if (!mounted) return;
                    setError(getErrorMessage(err, "Purchase completed, but the app could not refresh your access."));
                }
            })();
        });
        const purchaseErrorSubscription = billingModule.purchaseErrorListener((purchaseError) => {
            if (!mounted || isCancelledPurchaseError(purchaseError)) return;
            setError(purchaseError.message ?? "Purchase failed.");
        });

        void (async () => {
            try {
                const connected = await billingModule.initConnection();
                if (!mounted) return;
                setStoreConnected(connected);
                if (!connected) {
                    setError("Could not connect to the store subscription service.");
                    return;
                }
                await refreshStoreState();
            } catch (err) {
                if (!mounted) return;
                setError(getErrorMessage(err, "Failed to load subscription data."));
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
            purchaseUpdateSubscription.remove();
            purchaseErrorSubscription.remove();
            void billingModule.endConnection();
        };
    }, [billingConfigured, billingModule, refreshStoreState, session]);

    const activeSubscription = useMemo(() => {
        const nextSubscription = activeSubscriptions.find((subscription) =>
            allSubscriptionProductIds.includes(subscription.productId) && subscription.isActive,
        ) ?? null;

        if (!nextSubscription) return null;

        const expirationMs =
            nextSubscription.renewalInfoIOS?.renewalDate ??
            nextSubscription.expirationDateIOS ??
            null;
        const expirationDate = expirationMs ? new Date(expirationMs).toISOString() : null;
        const willRenew = nextSubscription.renewalInfoIOS?.willAutoRenew ?? nextSubscription.autoRenewingAndroid ?? false;
        const billingIssueDetectedAt = nextSubscription.renewalInfoIOS?.gracePeriodExpirationDate
            ? new Date(nextSubscription.renewalInfoIOS.gracePeriodExpirationDate).toISOString()
            : nextSubscription.renewalInfoIOS?.expirationReason === "BILLING_ERROR" && expirationDate
                ? expirationDate
                : null;

        return {
            productIdentifier: nextSubscription.productId,
            expirationDate,
            willRenew,
            unsubscribeDetectedAt: !willRenew && expirationDate ? expirationDate : null,
            billingIssueDetectedAt,
        };
    }, [activeSubscriptions]);

    const isSubscribed = Boolean(activeSubscription);
    const trialActive = trialStatus.isActive;
    const verificationPayload = useMemo(
        () => getVerificationPayload(activeSubscription, availablePurchases),
        [activeSubscription, availablePurchases],
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

    const purchasePlan = useCallback(async (planId: SubscriptionPlanId) => {
        if (!billingConfigured || !billingModule) {
            setError("Billing is not available in this build.");
            return false;
        }

        const storeProduct = getProductForPlan(products, planId);
        if (!storeProduct) {
            setError("Subscription products are not available for this build yet. Please try again shortly.");
            return false;
        }

        const selectedPlan = plans.find((plan) => plan.id === planId) ?? null;
        if (!selectedPlan) {
            setError("That subscription plan is not available right now.");
            return false;
        }

        setPurchaseBusy(true);
        setError(null);

        try {
            const connected = storeConnected || await billingModule.initConnection();
            setStoreConnected(connected);
            if (!connected) {
                setError("Could not connect to the store for this purchase.");
                return false;
            }

            await billingModule.requestPurchase(buildPurchaseRequest(selectedPlan));
            await refreshStoreState();
            return true;
        } catch (err: unknown) {
            const purchaseError = err as { code?: string; message?: string } | null;
            if (isCancelledPurchaseError(purchaseError ?? undefined)) return false;
            setError(getErrorMessage(err, "Purchase failed."));
            return false;
        } finally {
            setPurchaseBusy(false);
        }
    }, [billingConfigured, billingModule, plans, refreshStoreState, storeConnected]);

    const restore = useCallback(async () => {
        if (!billingConfigured || !billingModule) {
            setError("Billing is not available in this build.");
            return false;
        }
        setRestoreBusy(true);
        setError(null);
        try {
            await billingModule.restorePurchases();
            await refreshStoreState();
            return true;
        } catch (err) {
            setError(getErrorMessage(err, "Restore failed."));
            return false;
        } finally {
            setRestoreBusy(false);
        }
    }, [billingConfigured, billingModule, refreshStoreState]);

    const openManageSubscriptions = useCallback(async () => {
        if (!billingConfigured || !billingModule) {
            setError("Billing is not available in this build.");
            return false;
        }
        setManageBusy(true);
        setError(null);

        try {
            await billingModule.deepLinkToSubscriptions(
                Platform.OS === "android"
                    ? {
                        skuAndroid: subscriptionProductIds.monthly,
                        packageNameAndroid: getAndroidPackageName(),
                    }
                    : undefined,
            );
            return true;
        } catch (err) {
            setError(getErrorMessage(err, "Could not open the store subscription settings."));
            return false;
        } finally {
            setManageBusy(false);
        }
    }, [billingConfigured, billingModule]);

    const effectiveAccessSource = backendAccess?.accessSource ?? (isSubscribed ? "subscription" : trialActive ? "trial" : "none");
    const effectiveTrialActive = effectiveAccessSource === "trial";
    const effectiveIsSubscribed = effectiveAccessSource === "subscription";
    const effectiveTrialStartedAt = backendAccess?.trial.startedAt ?? trialStatus.startedAt;
    const effectiveTrialEndsAt = backendAccess?.trial.endsAt ?? trialStatus.endsAt;
    const effectiveTrialDaysRemaining = backendAccess?.trial.daysRemaining ?? trialStatus.daysRemaining;

    return {
        loading,
        billingConfigured,
        runtimeSupportsBilling,
        storeConnected,
        setupIssue,
        plans,
        availablePurchases,
        backendAccess,
        activeSubscription,
        isSubscribed: bypassSubscriptions || effectiveIsSubscribed,
        trialActive: !bypassSubscriptions && effectiveTrialActive,
        trialStartedAt: effectiveTrialStartedAt,
        trialEndsAt: effectiveTrialEndsAt,
        trialDaysRemaining: effectiveTrialDaysRemaining,
        requiresPaywall: !bypassSubscriptions && runtimeSupportsBilling && effectiveAccessSource === "none",
        purchaseBusy,
        restoreBusy,
        manageBusy,
        bypassSubscriptions,
        error,
        purchasePlan,
        restore,
        openManageSubscriptions,
        refreshStoreState,
    };
}
