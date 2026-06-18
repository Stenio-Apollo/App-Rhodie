import {Platform} from "react-native";
import Constants from "expo-constants";
import type {Task} from "../types";
import type {PlannerEvent} from "../state/usePlannerEvents";
import {journalPrompts} from "./prompts";
import {toLocalISODate} from "./date-utils";
import {stoicQuotes} from "./quotes";
import {getDailyRotationIndexes} from "./daily-rotation";

const scheduledTaskNotificationIds = new Map<string, string>();
const scheduledPlannerEventNotificationIds = new Map<string, string>();
let notificationHandlerConfigured = false;
const DAILY_REMINDER_WINDOW_DAYS = 30;
const DAILY_PROMPT_HOUR = 9;
const DAILY_PROMPT_MINUTE = 0;
const DAILY_QUOTE_HOUR = 8;
const DAILY_QUOTE_MINUTE = 0;
const JOURNAL_REMINDER_HOUR = 20;
const JOURNAL_REMINDER_MINUTE = 0;
const DAILY_PROMPT_REMINDER_KIND = "dailyPromptReminder";
const DAILY_QUOTE_REMINDER_KIND = "dailyQuoteReminder";
const JOURNAL_REMINDER_KIND = "journalReminder";

function getNotificationsModule(): typeof import("expo-notifications") | null {
    if (Constants.appOwnership === "expo") {
        console.warn("[notifications] Skipping notification APIs in Expo Go; use a dev build.");
        return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("expo-notifications") as typeof import("expo-notifications");
}

async function ensureNotificationPermissions(): Promise<typeof import("expo-notifications") | null> {
    const Notifications = getNotificationsModule();
    if (!Notifications) return null;

    if (!notificationHandlerConfigured) {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });
        notificationHandlerConfigured = true;
    }

    const settings = await Notifications.getPermissionsAsync();
    let finalStatus = settings.status;

    if (finalStatus !== "granted") {
        const {status} = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        console.warn("Notification permissions not granted");
        return null;
    }

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
        });
    }

    return Notifications;
}

function buildTaskReminderDate(task: Task): Date | null {
    if (!task.dueDate || !task.dueTime || task.status === "completed") return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) return null;
    if (!/^\d{2}:\d{2}$/.test(task.dueTime)) return null;

    const [year, month, day] = task.dueDate.split("-").map(Number);
    const [hour, minute] = task.dueTime.split(":").map(Number);
    const dueAt = new Date(year, month - 1, day, hour, minute, 0, 0);
    const remindAt = new Date(dueAt.getTime() - 15 * 60 * 1000);

    return remindAt.getTime() > Date.now() ? remindAt : null;
}

function buildPlannerEventReminderDate(event: PlannerEvent): Date | null {
    if (event.notifyMinutesBefore === null) return null;

    const startAt = new Date(event.startAt);
    if (Number.isNaN(startAt.getTime())) return null;

    const remindAt = new Date(startAt.getTime() - event.notifyMinutesBefore * 60 * 1000);
    return remindAt.getTime() > Date.now() ? remindAt : null;
}

function buildReminderDate(dayOffset: number, hour: number, minute: number): Date | null {
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + dayOffset);
    reminderDate.setHours(hour, minute, 0, 0);

    return reminderDate.getTime() > Date.now() ? reminderDate : null;
}

async function cancelScheduledNotificationsByKind(
    Notifications: typeof import("expo-notifications"),
    kinds: string[],
) {
    const kindSet = new Set(kinds);
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    await Promise.all(
        scheduledNotifications
            .filter((notification) => {
                const kind = notification.content.data?.kind;
                return typeof kind === "string" && kindSet.has(kind);
            })
            .map((notification) =>
                Notifications.cancelScheduledNotificationAsync(notification.identifier).catch(() => {
                }),
            ),
    );
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
    // Skip entirely in Expo Go to avoid native module crashes.
    if (Constants.appOwnership === "expo") {
        console.warn("[push] Skipping push registration in Expo Go; use a dev build for push tokens.");
        return null;
    }

    const Notifications = await ensureNotificationPermissions();
    if (!Notifications) return null;

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

export async function syncTaskReminderNotifications(tasks: Task[]): Promise<void> {
    const Notifications = await ensureNotificationPermissions();
    if (!Notifications) return;

    await Promise.all(
        [...scheduledTaskNotificationIds.values()].map((notificationId) =>
            Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {
            }),
        ),
    );
    scheduledTaskNotificationIds.clear();

    for (const task of tasks) {
        const triggerDate = buildTaskReminderDate(task);
        if (!triggerDate) continue;

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: "Task reminder",
                body: `${task.title} is due in 15 minutes.`,
                data: {taskId: task.id},
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate,
                channelId: "default",
            },
        });

        scheduledTaskNotificationIds.set(task.id, notificationId);
    }
}

export async function syncPlannerEventReminderNotifications(events: PlannerEvent[]): Promise<void> {
    const Notifications = await ensureNotificationPermissions();
    if (!Notifications) return;

    await Promise.all(
        [...scheduledPlannerEventNotificationIds.values()].map((notificationId) =>
            Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {
            }),
        ),
    );
    scheduledPlannerEventNotificationIds.clear();

    for (const event of events) {
        const triggerDate = buildPlannerEventReminderDate(event);
        if (!triggerDate || event.notifyMinutesBefore === null) continue;

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: "Plan reminder",
                body: `${event.title} starts in ${event.notifyMinutesBefore} minutes.`,
                data: {plannerEventId: event.id},
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate,
                channelId: "default",
            },
        });

        scheduledPlannerEventNotificationIds.set(event.id, notificationId);
    }
}

export async function syncDailyReflectionReminderNotifications(): Promise<void> {
    const Notifications = await ensureNotificationPermissions();
    if (!Notifications) return;

    await cancelScheduledNotificationsByKind(Notifications, [
        DAILY_PROMPT_REMINDER_KIND,
        DAILY_QUOTE_REMINDER_KIND,
        JOURNAL_REMINDER_KIND,
    ]);

    const dateKeys: string[] = [];
    for (let dayOffset = 0; dayOffset < DAILY_REMINDER_WINDOW_DAYS; dayOffset++) {
        const reminderDate = buildReminderDate(dayOffset, 12, 0);
        if (reminderDate) {
            dateKeys.push(toLocalISODate(reminderDate));
        }
    }

    const [quoteIndexes, promptIndexes] = await Promise.all([
        getDailyRotationIndexes("quote", dateKeys, stoicQuotes.length),
        getDailyRotationIndexes("journalPrompt", dateKeys, journalPrompts.length),
    ]);

    for (let dayOffset = 0; dayOffset < DAILY_REMINDER_WINDOW_DAYS; dayOffset++) {
        const quoteDate = buildReminderDate(dayOffset, DAILY_QUOTE_HOUR, DAILY_QUOTE_MINUTE);
        if (quoteDate) {
            const dateKey = toLocalISODate(quoteDate);
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Quote of the Day",
                    body: stoicQuotes[quoteIndexes[dateKey] ?? 0] ?? "Start today with intention.",
                    data: {
                        kind: DAILY_QUOTE_REMINDER_KIND,
                        date: dateKey,
                    },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: quoteDate,
                    channelId: "default",
                },
            });
        }

        const promptDate = buildReminderDate(dayOffset, DAILY_PROMPT_HOUR, DAILY_PROMPT_MINUTE);
        if (promptDate) {
            const dateKey = toLocalISODate(promptDate);
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Daily prompt",
                    body: journalPrompts[promptIndexes[dateKey] ?? 0] ?? "What do you want to reflect on today?",
                    data: {
                        kind: DAILY_PROMPT_REMINDER_KIND,
                        date: dateKey,
                    },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: promptDate,
                    channelId: "default",
                },
            });
        }

        const journalDate = buildReminderDate(dayOffset, JOURNAL_REMINDER_HOUR, JOURNAL_REMINDER_MINUTE);
        if (journalDate) {
            const dateKey = toLocalISODate(journalDate);
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Journal check-in",
                    body: "Take a minute to write what stood out today.",
                    data: {
                        kind: JOURNAL_REMINDER_KIND,
                        date: dateKey,
                    },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: journalDate,
                    channelId: "default",
                },
            });
        }
    }
}

export const syncJournalAndPromptReminderNotifications = syncDailyReflectionReminderNotifications;
