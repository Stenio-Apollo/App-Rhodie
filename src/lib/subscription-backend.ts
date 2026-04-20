import {
    FunctionsFetchError,
    FunctionsHttpError,
    FunctionsRelayError,
} from "@supabase/supabase-js";
import {supabase} from "./supabase";

export type SubscriptionSnapshot = {
    productIdentifier: string;
    expirationDate: string | null;
    willRenew: boolean;
    unsubscribeDetectedAt: string | null;
    billingIssueDetectedAt: string | null;
} | null;

export type SubscriptionVerificationPayload = {
    platform: "ios" | "android";
    productIdentifier: string;
    purchaseToken: string | null;
    transactionId: string | null;
    environmentIOS?: string | null;
    packageNameAndroid?: string | null;
} | null;

export type SubscriptionAccessRecord = {
    hasAccess: boolean;
    accessSource: "trial" | "subscription" | "none";
    trial: {
        startedAt: string | null;
        endsAt: string | null;
        isActive: boolean;
        daysRemaining: number;
    };
    subscription: {
        provider: string | null;
        platform: string | null;
        productIdentifier: string | null;
        status: string | null;
        expirationDate: string | null;
        willRenew: boolean;
        lastVerifiedAt: string | null;
        lastSyncedAt: string | null;
    } | null;
};

type SyncSubscriptionAccessPayload = {
    platform: string;
    billingConfigured: boolean;
    storeConnected: boolean;
    activeSubscription: SubscriptionSnapshot;
    verificationPayload: SubscriptionVerificationPayload;
};

async function getFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
    if (error instanceof FunctionsHttpError) {
        const payload = await error.context.json().catch(() => null);
        if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
            return payload.error;
        }
        return fallback;
    }

    if (error instanceof FunctionsRelayError) {
        return "Supabase relay could not reach the subscription function.";
    }

    if (error instanceof FunctionsFetchError) {
        return "Network error while syncing subscription access.";
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return fallback;
}

export async function syncSubscriptionAccess(payload: SyncSubscriptionAccessPayload) {
    const {data, error} = await supabase.functions.invoke("subscription-access", {
        method: "POST",
        body: payload,
    });

    if (error) {
        throw new Error(await getFunctionErrorMessage(error, "Subscription access sync failed."));
    }

    return data as SubscriptionAccessRecord;
}
