import Constants from "expo-constants";
import {Platform} from "react-native";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
const isExpoGoRuntime =
    Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

const sharedApiKey = extra.revenueCatApiKey ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
const iosApiKey = extra.revenueCatIosApiKey ?? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const androidApiKey = extra.revenueCatAndroidApiKey ?? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
const privacyPolicyUrl = extra.privacyPolicyUrl ?? process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
const termsOfUseUrl = extra.termsOfUseUrl ?? process.env.EXPO_PUBLIC_TERMS_OF_USE_URL;

export const revenueCatEntitlementId =
    extra.revenueCatEntitlementId ??
    process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ??
    "Rhodie Pro";

export function getRevenueCatApiKey(): string | null {
    if (Platform.OS === "ios") return iosApiKey ?? sharedApiKey ?? null;
    if (Platform.OS === "android") return androidApiKey ?? sharedApiKey ?? null;
    return null;
}

export function isRevenueCatSupported(): boolean {
    return (Platform.OS === "ios" || Platform.OS === "android") && !isExpoGoRuntime;
}

export function getPrivacyPolicyUrl(): string | null {
    return privacyPolicyUrl ?? null;
}

export function getTermsOfUseUrl(): string | null {
    return termsOfUseUrl ?? null;
}
