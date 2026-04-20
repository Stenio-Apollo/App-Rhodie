import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
import {SignJWT, decodeJwt, importPKCS8} from "https://esm.sh/jose@5.9.6";

const supabaseUrl = Deno.env.get("EDGE_SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("EDGE_SERVICE_ROLE_KEY")!;
const configuredTrialDays = Number(Deno.env.get("SUBSCRIPTION_TRIAL_DAYS") ?? "14");
const trialDays = Number.isFinite(configuredTrialDays) && configuredTrialDays > 0
    ? configuredTrialDays
    : 14;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestBody = {
    platform?: string;
    billingConfigured?: boolean;
    storeConnected?: boolean;
    activeSubscription?: {
        productIdentifier: string;
        expirationDate: string | null;
        willRenew: boolean;
        unsubscribeDetectedAt: string | null;
        billingIssueDetectedAt: string | null;
    } | null;
    verificationPayload?: {
        platform: "ios" | "android";
        productIdentifier: string;
        purchaseToken: string | null;
        transactionId: string | null;
        environmentIOS?: string | null;
        packageNameAndroid?: string | null;
    } | null;
};

type VerifiedSubscriptionSnapshot = {
    provider: "app_store" | "play_store";
    platform: "ios" | "android";
    productIdentifier: string;
    expirationDate: string | null;
    willRenew: boolean;
    billingIssueDetectedAt: string | null;
    raw: Record<string, unknown>;
};

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
        },
    });
}

function addDays(value: string, days: number) {
    const date = new Date(value);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString();
}

function getTrialSnapshot(userCreatedAt: string | null | undefined) {
    if (!userCreatedAt) {
        return {
            startedAt: null,
            endsAt: null,
            isActive: false,
            daysRemaining: 0,
        };
    }

    const startedAt = new Date(userCreatedAt);
    if (Number.isNaN(startedAt.getTime())) {
        return {
            startedAt: null,
            endsAt: null,
            isActive: false,
            daysRemaining: 0,
        };
    }

    const endsAt = addDays(startedAt.toISOString(), trialDays);
    const remainingMs = Math.max(new Date(endsAt).getTime() - Date.now(), 0);

    return {
        startedAt: startedAt.toISOString(),
        endsAt,
        isActive: Date.now() < new Date(endsAt).getTime(),
        daysRemaining: Math.ceil(remainingMs / (24 * 60 * 60 * 1000)),
    };
}

function getProvider(platform: string | undefined) {
    if (platform === "ios") return "app_store";
    if (platform === "android") return "play_store";
    return "none";
}

function getStatus(snapshot: VerifiedSubscriptionSnapshot | null, fallbackSubscription: RequestBody["activeSubscription"], trialActive: boolean) {
    if (snapshot?.billingIssueDetectedAt || fallbackSubscription?.billingIssueDetectedAt) return "billing_issue";
    if (snapshot || fallbackSubscription) return "active";
    if (trialActive) return "trial";
    return "inactive";
}

async function createAppStoreJwt() {
    const issuerId = Deno.env.get("APPLE_ISSUER_ID");
    const keyId = Deno.env.get("APPLE_KEY_ID");
    const bundleId = Deno.env.get("APPLE_BUNDLE_ID");
    const privateKey = Deno.env.get("APPLE_PRIVATE_KEY");

    if (!issuerId || !keyId || !bundleId || !privateKey) {
        return null;
    }

    const importedKey = await importPKCS8(privateKey.replace(/\\n/g, "\n"), "ES256");

    return await new SignJWT({bid: bundleId})
        .setProtectedHeader({alg: "ES256", kid: keyId, typ: "JWT"})
        .setIssuer(issuerId)
        .setAudience("appstoreconnect-v1")
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(importedKey);
}

async function verifyAppleSubscription(verificationPayload: NonNullable<RequestBody["verificationPayload"]>): Promise<VerifiedSubscriptionSnapshot | null> {
    if (!verificationPayload.transactionId) return null;

    const token = await createAppStoreJwt();
    if (!token) return null;

    const baseUrl = verificationPayload.environmentIOS === "Sandbox"
        ? "https://api.storekit-sandbox.itunes.apple.com"
        : "https://api.storekit.itunes.apple.com";

    const response = await fetch(
        `${baseUrl}/inApps/v1/transactions/${verificationPayload.transactionId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    );

    if (!response.ok) {
        throw new Error(`Apple verification failed with status ${response.status}.`);
    }

    const payload = await response.json() as { signedTransactionInfo?: string | null };
    if (!payload.signedTransactionInfo) {
        throw new Error("Apple verification response did not include signed transaction info.");
    }

    const decoded = decodeJwt(payload.signedTransactionInfo) as Record<string, unknown>;
    const expiresDateMs = typeof decoded.expiresDate === "number"
        ? decoded.expiresDate
        : typeof decoded.expiresDate === "string"
            ? Number(decoded.expiresDate)
            : null;
    const revocationDateMs = typeof decoded.revocationDate === "number"
        ? decoded.revocationDate
        : typeof decoded.revocationDate === "string"
            ? Number(decoded.revocationDate)
            : null;
    const now = Date.now();
    const hasBillingIssue = false;
    const isActive = !revocationDateMs && (!expiresDateMs || expiresDateMs > now);

    if (!isActive) return null;

    return {
        provider: "app_store",
        platform: "ios",
        productIdentifier: String(decoded.productId ?? verificationPayload.productIdentifier),
        expirationDate: expiresDateMs ? new Date(expiresDateMs).toISOString() : null,
        willRenew: true,
        billingIssueDetectedAt: hasBillingIssue ? new Date(now).toISOString() : null,
        raw: decoded,
    };
}

async function getGoogleAccessToken() {
    const clientEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

    if (!clientEmail || !privateKey) {
        return null;
    }

    const importedKey = await importPKCS8(privateKey.replace(/\\n/g, "\n"), "RS256");
    const assertion = await new SignJWT({
        scope: "https://www.googleapis.com/auth/androidpublisher",
    })
        .setProtectedHeader({alg: "RS256", typ: "JWT"})
        .setIssuer(clientEmail)
        .setSubject(clientEmail)
        .setAudience("https://oauth2.googleapis.com/token")
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(importedKey);

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion,
        }),
    });

    if (!response.ok) {
        throw new Error(`Google OAuth token request failed with status ${response.status}.`);
    }

    const payload = await response.json() as { access_token?: string };
    return payload.access_token ?? null;
}

async function verifyGoogleSubscription(verificationPayload: NonNullable<RequestBody["verificationPayload"]>): Promise<VerifiedSubscriptionSnapshot | null> {
    if (!verificationPayload.purchaseToken || !verificationPayload.packageNameAndroid) return null;

    const accessToken = await getGoogleAccessToken();
    if (!accessToken) return null;

    const response = await fetch(
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(verificationPayload.packageNameAndroid)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(verificationPayload.purchaseToken)}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    if (!response.ok) {
        throw new Error(`Google verification failed with status ${response.status}.`);
    }

    const payload = await response.json() as Record<string, unknown>;
    const lineItems = Array.isArray(payload.lineItems) ? payload.lineItems as Record<string, unknown>[] : [];
    const firstLineItem = lineItems[0] ?? {};
    const expiryTime = typeof firstLineItem.expiryTime === "string" ? firstLineItem.expiryTime : null;
    const autoRenewingPlan = typeof firstLineItem.autoRenewingPlan === "object" && firstLineItem.autoRenewingPlan
        ? firstLineItem.autoRenewingPlan as Record<string, unknown>
        : null;
    const subscriptionState = typeof payload.subscriptionState === "string" ? payload.subscriptionState : null;
    const acknowledgementState = typeof payload.acknowledgementState === "string" ? payload.acknowledgementState : null;
    const isActive = subscriptionState === "SUBSCRIPTION_STATE_ACTIVE";

    if (isActive && acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING") {
        const acknowledgeResponse = await fetch(
            `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(verificationPayload.packageNameAndroid)}/purchases/subscriptions/${encodeURIComponent(verificationPayload.productIdentifier)}/tokens/${encodeURIComponent(verificationPayload.purchaseToken)}:acknowledge`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
            },
        );

        if (!acknowledgeResponse.ok) {
            throw new Error(`Google subscription acknowledge failed with status ${acknowledgeResponse.status}.`);
        }
    }

    if (!isActive) return null;

    return {
        provider: "play_store",
        platform: "android",
        productIdentifier: String(firstLineItem.productId ?? verificationPayload.productIdentifier),
        expirationDate: expiryTime,
        willRenew: Boolean(autoRenewingPlan?.autoRenewEnabled),
        billingIssueDetectedAt: subscriptionState === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" || subscriptionState === "SUBSCRIPTION_STATE_ON_HOLD"
            ? new Date().toISOString()
            : null,
        raw: payload,
    };
}

async function verifySubscription(verificationPayload: RequestBody["verificationPayload"]) {
    if (!verificationPayload) return null;
    if (verificationPayload.platform === "ios") {
        return await verifyAppleSubscription(verificationPayload);
    }
    if (verificationPayload.platform === "android") {
        return await verifyGoogleSubscription(verificationPayload);
    }
    return null;
}

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") {
        return new Response("ok", {headers: corsHeaders});
    }

    if (request.method !== "POST") {
        return json({error: "Method not allowed."}, 405);
    }

    const authHeader = request.headers.get("Authorization") ?? request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return json({error: "Missing authorization header."}, 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const {data: userData, error: userError} = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
        return json({error: "Could not verify the signed-in user."}, 401);
    }

    const body = await request.json().catch(() => ({})) as RequestBody;
    const trial = getTrialSnapshot(userData.user.created_at);
    let verifiedSubscription: VerifiedSubscriptionSnapshot | null = null;
    let verificationError: string | null = null;

    try {
        verifiedSubscription = await verifySubscription(body.verificationPayload);
    } catch (error) {
        verificationError = error instanceof Error ? error.message : "Subscription verification failed.";
    }
    const provider = verifiedSubscription?.provider ?? getProvider(body.platform);
    const status = getStatus(verifiedSubscription, body.activeSubscription, trial.isActive);
    const effectiveSubscription = verifiedSubscription
        ? {
            productIdentifier: verifiedSubscription.productIdentifier,
            expirationDate: verifiedSubscription.expirationDate,
            willRenew: verifiedSubscription.platform === "ios"
                ? body.activeSubscription?.willRenew ?? verifiedSubscription.willRenew
                : verifiedSubscription.willRenew,
            unsubscribeDetectedAt: (verifiedSubscription.platform === "ios"
                ? body.activeSubscription?.willRenew ?? verifiedSubscription.willRenew
                : verifiedSubscription.willRenew)
                ? null
                : verifiedSubscription.expirationDate,
            billingIssueDetectedAt: verifiedSubscription.billingIssueDetectedAt ?? body.activeSubscription?.billingIssueDetectedAt ?? null,
        }
        : body.activeSubscription;
    const expirationDate = effectiveSubscription?.expirationDate ?? null;
    const hasSubscriptionAccess =
        Boolean(effectiveSubscription) &&
        (!expirationDate || new Date(expirationDate).getTime() > Date.now());

    const accessSource = hasSubscriptionAccess ? "subscription" : trial.isActive ? "trial" : "none";
    const hasAccess = accessSource !== "none";

    const upsertPayload = {
        user_id: userData.user.id,
        provider,
        platform: verifiedSubscription?.platform ?? (body.platform === "ios" || body.platform === "android" ? body.platform : "unknown"),
        product_identifier: effectiveSubscription?.productIdentifier ?? null,
        status,
        trial_started_at: trial.startedAt,
        trial_ends_at: trial.endsAt,
        subscription_started_at: effectiveSubscription ? userData.user.created_at ?? null : null,
        current_period_ends_at: expirationDate,
        will_renew: effectiveSubscription?.willRenew ?? false,
        last_verified_at: new Date().toISOString(),
        last_synced_from_client_at: new Date().toISOString(),
        raw_payload: {
            billingConfigured: body.billingConfigured ?? false,
            storeConnected: body.storeConnected ?? false,
            activeSubscription: body.activeSubscription ?? null,
            verificationPayload: body.verificationPayload ?? null,
            verifiedSubscription: verifiedSubscription?.raw ?? null,
            verificationError,
        },
        updated_at: new Date().toISOString(),
    };

    const {data: accessRow, error: upsertError} = await supabase
        .from("subscription_access")
        .upsert(upsertPayload)
        .select(`
          provider,
          platform,
          product_identifier,
          status,
          current_period_ends_at,
          will_renew,
          last_verified_at,
          last_synced_from_client_at
        `)
        .single();

    if (upsertError) {
        return json({error: upsertError.message}, 500);
    }

    return json({
        hasAccess,
        accessSource,
        trial,
        subscription: accessRow ? {
            provider: accessRow.provider,
            platform: accessRow.platform,
            productIdentifier: accessRow.product_identifier,
            status: accessRow.status,
            expirationDate: accessRow.current_period_ends_at,
            willRenew: accessRow.will_renew,
            lastVerifiedAt: accessRow.last_verified_at,
            lastSyncedAt: accessRow.last_synced_from_client_at,
        } : null,
    });
});
