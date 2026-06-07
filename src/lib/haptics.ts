import * as Haptics from "expo-haptics";

export type HapticAction =
    | "tapTask"
    | "completeTask"
    | "completeAllDailyTasks"
    | "saveGratitudeEntry"
    | "saveJournalEntry"
    | "reachStreakMilestone"
    | "calendarDateSelected"
    | "createNewTask"
    | "authenticationSuccess"
    | "authenticationError"
    | "deleteTask"
    | "longPressTask"
    | "selection"
    | "navigation"
    | "scroll";

function runHaptic(effect: () => Promise<void>) {
    // Haptics can be unavailable in some simulator/dev-client states.
    effect().catch(() => {});
}

function successHaptic() {
    runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

function errorHaptic() {
    runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

function impactHaptic(style: Haptics.ImpactFeedbackStyle) {
    runHaptic(() => Haptics.impactAsync(style));
}

function heavySuccessHaptic() {
    impactHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(successHaptic, 90);
}

export function triggerHaptic(action: HapticAction) {
    switch (action) {
        case "navigation":
        case "calendarDateSelected":
            impactHaptic(Haptics.ImpactFeedbackStyle.Light);
            return;
        case "tapTask":
        case "selection":
        case "scroll":
            runHaptic(() => Haptics.selectionAsync());
            return;
        case "longPressTask":
            impactHaptic(Haptics.ImpactFeedbackStyle.Light);
            return;
        case "completeTask":
        case "deleteTask":
            impactHaptic(Haptics.ImpactFeedbackStyle.Medium);
            return;
        case "saveGratitudeEntry":
        case "saveJournalEntry":
        case "createNewTask":
        case "authenticationSuccess":
            successHaptic();
            return;
        case "authenticationError":
            errorHaptic();
            return;
        case "completeAllDailyTasks":
        case "reachStreakMilestone":
            heavySuccessHaptic();
            return;
    }
}

export function pulseHapticFeedback() {
    triggerHaptic("navigation");
}

export const haptics = {
    tapTask: () => triggerHaptic("tapTask"),
    completeTask: () => triggerHaptic("completeTask"),
    completeAllDailyTasks: () => triggerHaptic("completeAllDailyTasks"),
    saveGratitudeEntry: () => triggerHaptic("saveGratitudeEntry"),
    saveJournalEntry: () => triggerHaptic("saveJournalEntry"),
    reachStreakMilestone: () => triggerHaptic("reachStreakMilestone"),
    calendarDateSelected: () => triggerHaptic("calendarDateSelected"),
    createNewTask: () => triggerHaptic("createNewTask"),
    authenticationSuccess: () => triggerHaptic("authenticationSuccess"),
    authenticationError: () => triggerHaptic("authenticationError"),
    deleteTask: () => triggerHaptic("deleteTask"),
    longPressTask: () => triggerHaptic("longPressTask"),
    selection: () => triggerHaptic("selection"),
    navigation: () => triggerHaptic("navigation"),
    scroll: () => triggerHaptic("scroll"),
};
