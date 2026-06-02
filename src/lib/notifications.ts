import {Platform} from "react-native";
import Constants from "expo-constants";

export async function registerForPushNotificationsAsync(): Promise<string | null> {
    // Skip entirely in Expo Go to avoid native module crashes.
    if (Constants.appOwnership === "expo") {
        console.warn("[push] Skipping push registration in Expo Go; use a dev build for push tokens.");
        return null;
    }

    // Lazy-load only when supported.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require("expo-notifications") as typeof import("expo-notifications");

    const settings = await Notifications.getPermissionsAsync();
    let finalStatus = settings.status;

    if (finalStatus !== "granted") {
        const {status} = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        console.warn("Push permissions not granted");
        return null;
    }

    const projectId =
        Constants.easConfig?.projectId ??
        (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

    if (!projectId) {
        console.warn("[push] Missing EAS projectId; cannot request Expo push token in production.");
        return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({projectId});
    const token = tokenData.data;

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
        });
    }

    return token;
}
