import {ClerkLoaded, SignedIn, SignedOut, useAuth} from "@clerk/clerk-expo";
import {useCallback, useMemo, useState} from "react";
import {Alert, Pressable, SafeAreaView, Text, View} from "react-native";
import {createApi} from "@/src/lib/api";
import {registerForPushNotificationsAsync, scheduleDueTaskNotifications} from "@/src/lib/notifications";
import {AuthScreen} from "@/src/screens/AuthScreen";
import {BoardScreen} from "@/src/screens/BoardScreen";
import {CalendarScreen} from "@/src/screens/CalendarScreen";

function AppTabs() {
    const [tab, setTab] = useState<"board" | "calendar">("board");
    const {getToken, signOut} = useAuth();
    const [pushToken, setPushToken] = useState<string | null>(null);
    const api = useMemo(() => createApi(getToken), [getToken]);

    const syncTaskNotifications = useCallback(async () => {
        try {
            const dueTasks = await api.getDueTasks();
            await scheduleDueTaskNotifications(dueTasks);
        } catch {
            // ignore schedule failures in UI
        }
    }, [api]);

    const enableNotifications = useCallback(async () => {
        const token = await registerForPushNotificationsAsync();
        setPushToken(token);
        await syncTaskNotifications();
        return token;
    }, [syncTaskNotifications]);

    async function handleEnableAlerts() {
        const token = await enableNotifications();
        if (!token) {
            Alert.alert("Notifications disabled", "Allow notifications on a physical device to receive push alerts.");
            return;
        }
        Alert.alert("Notifications enabled", "Due-task reminders will be scheduled automatically.");
    }

    async function handleTestPush() {
        try {
            const token = pushToken ?? (await enableNotifications());
            if (!token) {
                Alert.alert("Notifications disabled", "Enable notifications on a physical device to receive push alerts.");
                return;
            }

            await api.sendTestPush({
                token,
                title: "Task Editor",
                message: "Push is connected. Due-task alerts are active.",
            });
            Alert.alert("Push sent", "Check your device notifications.");
        } catch (error) {
            Alert.alert("Push failed", error instanceof Error ? error.message : "Unable to send test push.");
        }
    }

    return (
        <SafeAreaView style={{flex: 1, backgroundColor: "#f1f5f9"}}>
            <View style={{paddingHorizontal: 14, paddingTop: 10, gap: 10}}>
                <View style={{flexDirection: "row", justifyContent: "space-between"}}>
                    <View style={{flexDirection: "row", gap: 8}}>
                        <Pressable
                            onPress={() => setTab("board")}
                            style={{
                                borderRadius: 10,
                                backgroundColor: tab === "board" ? "#0284c7" : "#ffffff",
                                paddingHorizontal: 12,
                                paddingVertical: 8
                            }}
                        >
                            <Text style={{color: tab === "board" ? "white" : "#0f172a", fontWeight: "700"}}>Board</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setTab("calendar")}
                            style={{
                                borderRadius: 10,
                                backgroundColor: tab === "calendar" ? "#0284c7" : "#ffffff",
                                paddingHorizontal: 12,
                                paddingVertical: 8
                            }}
                        >
                            <Text style={{
                                color: tab === "calendar" ? "white" : "#0f172a",
                                fontWeight: "700"
                            }}>Calendar</Text>
                        </Pressable>
                    </View>

                    <Pressable
                        onPress={() => void signOut()}
                        style={{
                            borderRadius: 10,
                            backgroundColor: "#ef4444",
                            paddingHorizontal: 12,
                            paddingVertical: 8
                        }}
                    >
                        <Text style={{color: "white", fontWeight: "700"}}>Sign out</Text>
                    </Pressable>
                </View>

                <View style={{flexDirection: "row", gap: 8}}>
                    <Pressable
                        onPress={() => void handleEnableAlerts()}
                        style={{
                            borderRadius: 10,
                            backgroundColor: "#16a34a",
                            paddingHorizontal: 12,
                            paddingVertical: 8
                        }}
                    >
                        <Text style={{color: "white", fontWeight: "700"}}>Enable Alerts</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => void handleTestPush()}
                        style={{
                            borderRadius: 10,
                            backgroundColor: "#7c3aed",
                            paddingHorizontal: 12,
                            paddingVertical: 8
                        }}
                    >
                        <Text style={{color: "white", fontWeight: "700"}}>Test Push</Text>
                    </Pressable>
                </View>
            </View>

            <View style={{flex: 1, marginTop: 10}}>
                {tab === "board" ? (
                    <BoardScreen getToken={getToken} onTasksChanged={syncTaskNotifications}/>
                ) : (
                    <CalendarScreen getToken={getToken} onDueTasksLoaded={scheduleDueTaskNotifications}/>
                )}
            </View>
        </SafeAreaView>
    );
}

export default function HomeScreen() {
    return (
        <ClerkLoaded>
            <SignedIn>
                <AppTabs/>
            </SignedIn>
            <SignedOut>
                <AuthScreen/>
            </SignedOut>
        </ClerkLoaded>
    );
}
