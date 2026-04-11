import Constants from "expo-constants";
import {Platform} from "react-native";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const iosApiKey = extra.revenueCatIosApiKey ?? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const androidApiKey = extra.revenueCatAndroidApiKey ?? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const revenueCatEntitlementId =
    extra.revenueCatEntitlementId ??
    process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ??
    "pro";

export function getRevenueCatApiKey(): string | null {
    if (Platform.OS === "ios") return iosApiKey ?? null;
    if (Platform.OS === "android") return androidApiKey ?? null;
    return null;
}

export function isRevenueCatSupported(): boolean {
    return Platform.OS === "ios" || Platform.OS === "android";
}

