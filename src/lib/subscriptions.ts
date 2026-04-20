import Constants from "expo-constants";
import {Platform} from "react-native";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | number | undefined>;
const isExpoGoRuntime =
    Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";
const bypassSubscriptionsFlag =
    extra.bypassSubscriptions ?? process.env.EXPO_PUBLIC_BYPASS_SUBSCRIPTIONS;
const privacyPolicyUrl = extra.privacyPolicyUrl ?? process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
const termsOfUseUrl = extra.termsOfUseUrl ?? process.env.EXPO_PUBLIC_TERMS_OF_USE_URL;
const monthlyProductId =
    extra.monthlySubscriptionProductId ??
    process.env.EXPO_PUBLIC_MONTHLY_PRODUCT_ID ??
    "rhodie.30";
const yearlyProductId =
    extra.yearlySubscriptionProductId ??
    process.env.EXPO_PUBLIC_YEARLY_PRODUCT_ID ??
    "rhodie.365";
const configuredTrialDays = Number(
    extra.subscriptionTrialDays ?? process.env.EXPO_PUBLIC_SUBSCRIPTION_TRIAL_DAYS ?? 14,
);
const trialDays = Number.isFinite(configuredTrialDays) && configuredTrialDays > 0
    ? configuredTrialDays
    : 14;

export const subscriptionProductIds = {
    monthly: String(monthlyProductId),
    yearly: String(yearlyProductId),
} as const;

export const allSubscriptionProductIds = [
    subscriptionProductIds.monthly,
    subscriptionProductIds.yearly,
];

export function getTrialDurationDays(): number {
    return trialDays;
}

export function isNativeBillingSupported(): boolean {
    return (Platform.OS === "ios" || Platform.OS === "android") && !isExpoGoRuntime;
}

export function getTermsOfUseUrl(): string | null {
    return termsOfUseUrl ? String(termsOfUseUrl) : null;
}

export function getPrivacyPolicyUrl(): string | null {
    return privacyPolicyUrl ? String(privacyPolicyUrl) : null;
}

export function shouldBypassSubscriptions(): boolean {
    const normalized = String(bypassSubscriptionsFlag ?? "").trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function getAndroidPackageName(): string {
    return Constants.expoConfig?.android?.package ?? "com.rhnative.app";
}

export function getTrialStatus(accountCreatedAt: string | null | undefined) {
    if (!accountCreatedAt) {
        return {
            startedAt: null,
            endsAt: null,
            isActive: false,
            daysRemaining: 0,
        };
    }

    const startedAt = new Date(accountCreatedAt);
    if (Number.isNaN(startedAt.getTime())) {
        return {
            startedAt: null,
            endsAt: null,
            isActive: false,
            daysRemaining: 0,
        };
    }

    const endsAt = new Date(startedAt.getTime() + getTrialDurationDays() * 24 * 60 * 60 * 1000);
    const remainingMs = Math.max(endsAt.getTime() - Date.now(), 0);

    return {
        startedAt: startedAt.toISOString(),
        endsAt: endsAt.toISOString(),
        isActive: Date.now() < endsAt.getTime(),
        daysRemaining: Math.ceil(remainingMs / (24 * 60 * 60 * 1000)),
    };
}
