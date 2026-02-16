import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as Device from "expo-device";
import {Platform} from "react-native";
import type {Task} from "../types";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
    if (!Device.isDevice) return null;

    const current = await Notifications.getPermissionsAsync();
    let finalStatus = current.status;

    if (finalStatus !== "granted") {
        const requested = await Notifications.requestPermissionsAsync();
        finalStatus = requested.status;
    }

    if (finalStatus !== "granted") return null;

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#0ea5e9",
        });
    }

    const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    const tokenResult = await Notifications.getExpoPushTokenAsync(
        projectId ? {projectId} : undefined,
    );

    return tokenResult.data;
}

function dueDateAtNineAM(dueDate: string): Date | null {
    const [year, month, day] = dueDate.split("-").map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day, 9, 0, 0, 0);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

export async function scheduleDueTaskNotifications(tasks: Task[]) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    await Promise.all(
        scheduled
            .filter((item) => item.content.data?.kind === "task_due")
            .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
    );

    const now = new Date();
    const dueTasks = tasks.filter((task) => typeof task.due_date === "string" && task.due_date);

    for (const task of dueTasks) {
        if (!task.due_date) continue;
        const triggerDate = dueDateAtNineAM(task.due_date);
        if (!triggerDate || triggerDate.getTime() <= now.getTime()) continue;

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Task due today",
                body: task.title,
                data: {
                    kind: "task_due",
                    taskId: task.id,
                    dueDate: task.due_date,
                },
            },
            trigger: triggerDate as unknown as Notifications.NotificationTriggerInput,
        });
    }
}
