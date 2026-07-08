import {useEffect, useMemo, useRef, useState} from "react";
import {
    Animated,
    Easing,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import type {Task} from "../types";
import {TranslucentCalendar} from "../components/TranslucentCalendar";
import {fonts} from "../theme/fonts";
import type {ArchivedWeeklyGoal, WeeklyGoal, WeeklyGoalPreset, WeeklyGoalProgress} from "../state/useWeeklyGoal";
import {toLocalISODate} from "../lib/date-utils";
import {haptics} from "../lib/haptics";
import {TutorialCard} from "../components/TutorialCard";
import {GoalsRoute} from "../components/GoalsRoute";
import {TranslucentCard} from "../components/TranslucentCard";
import type {VisualMode} from "../state/useVisualMode";
import {useKeyboardInset} from "../lib/useKeyboardInset";
import {ScreenBackground} from "../components/ScreenBackground";

const GEORGIA_ACCENT_COLOR = "#DAC8AE";

function CalendarRouteEntry({
                                label,
                                icon,
                                onPress,
                                disabled = false,
                                active = false,
                                activeColor,
                                darkContent = false,
                                whiteContent = false,
                            }: {
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    onPress: () => void;
    disabled?: boolean;
    active?: boolean;
    activeColor?: string;
    darkContent?: boolean;
    whiteContent?: boolean;
}) {
    const badgeColor = "#ba885a";
    const color = disabled
        ? (whiteContent ? "rgba(228,224,212,0.35)" : darkContent ? "rgba(17,17,17,0.35)" : "rgba(228,224,212,0.35)")
        : active
            ? activeColor ?? badgeColor
        : whiteContent
            ? "#E4E0D4"
            : darkContent ? "#000000" : "#E4E0D4";

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            disabled={disabled}
            onPress={() => {
                haptics.navigation();
                onPress();
            }}
            style={({pressed}) => [
                tw`items-center justify-center px-1 py-0.5`,
                pressed && !disabled && {transform: [{scale: 0.94}], opacity: 0.85},
            ]}
        >
            <Text
                numberOfLines={1}
                style={[
                    tw`mb-1 text-[10px] font-bold`,
                    {fontFamily: fonts.heading, color},
                ]}
            >
                {label}
            </Text>
            <Ionicons name={icon} size={22} color={color}/>
        </Pressable>
    );
}

interface CalendarScreenProps {
    tasks: Task[];
    googleCalendar: {
        available: boolean;
        connected: boolean;
        busy: boolean;
        error: string | null;
        lastSyncedAt: string | null;
        connect: () => Promise<void>;
        disconnect: () => Promise<void>;
        syncNow: () => Promise<void>;
    };
    weeklyGoal: WeeklyGoal | null;
    weeklyGoalPresets: WeeklyGoalPreset[];
    weeklyGoalProgress: WeeklyGoalProgress;
    onSaveWeeklyGoal: (payload: { text: string; presetId?: string | null }) => Promise<void>;
    onMarkGoalAchieved: () => void;
    loadRecentAchievedGoals?: (limit?: number) => Promise<ArchivedWeeklyGoal[]>;
    onOpenTasks: () => void;
    focusWeeklyGoalKey?: number;
    visualMode: VisualMode;
    showTutorial?: boolean;
    onDismissTutorial?: () => void;
    onGoalsRouteChange?: (open: boolean) => void;
}

export function CalendarScreen({
                                   tasks,
                                   googleCalendar,
                                   weeklyGoal,
                                   weeklyGoalPresets,
                                   weeklyGoalProgress,
                                   onSaveWeeklyGoal,
                                   onMarkGoalAchieved,
                                   loadRecentAchievedGoals,
                                   onOpenTasks,
                                   focusWeeklyGoalKey,
                                   visualMode,
                                   showTutorial,
                                   onDismissTutorial,
                                   onGoalsRouteChange,
                               }: CalendarScreenProps) {
    const [selectedDate, setSelectedDate] = useState(toLocalISODate());
    const [route, setRoute] = useState<"calendar" | "goals">("calendar");
    const [customGoal, setCustomGoal] = useState("");
    const [goalSaveError, setGoalSaveError] = useState<string | null>(null);
    const scrollRef = useRef<ScrollView>(null);
    const customGoalInputRef = useRef<TextInput>(null);
    const routeOpacity = useRef(new Animated.Value(1)).current;
    const routeTranslateY = useRef(new Animated.Value(0)).current;
    const bg = visualMode === "navy"
        ? require("../../public/images/navy.jpg")
        : visualMode === "evergreen"
            ? require("../../public/images/pine.jpg")
        : visualMode === "georgia"
            ? require("../../public/images/rhram1.jpg")
            : require("../../public/images/rh211.jpg");
    const {keyboardInset} = useKeyboardInset();
    const riverMode = visualMode === "river";
    const georgiaMode = visualMode === "georgia" || visualMode === "evergreen" || visualMode === "navy";
    const sonnyMode = visualMode === "sonny";
    const sonnyBadgeColor = "#ba885a";
    const accentColor = "#FF3800";
    const primaryTextColor = georgiaMode ? "#FFFFFF" : riverMode ? "#111111" : "#E4E0D4";
    const headerTextColor = georgiaMode ? GEORGIA_ACCENT_COLOR : sonnyMode || riverMode ? sonnyBadgeColor : primaryTextColor;
    const selectedDateTextColor = georgiaMode ? "#FFFFFF" : primaryTextColor;
    const bodyMutedTextColor = georgiaMode ? "rgba(255,255,255,0.7)" : riverMode ? "rgba(17,17,17,0.7)" : "#94a3b8";
    const calendarTaskTextColor = georgiaMode ? "#FFFFFF" : primaryTextColor;
    const calendarTaskMutedTextColor = georgiaMode ? "rgba(255,255,255,0.78)" : bodyMutedTextColor;
    const calendarTaskCardShellStyle = sonnyMode || georgiaMode || riverMode
        ? {
            borderRadius: 20,
            shadowColor: sonnyBadgeColor,
            shadowOffset: {width: 0, height: 10},
            shadowOpacity: 0.28,
            shadowRadius: 18,
            elevation: 10,
        }
        : null;
    const calendarTaskCardStyle = null;
    const headerSecondaryTextColor = georgiaMode || sonnyMode ? "#FFFFFF" : riverMode ? "rgba(17,17,17,0.7)" : "#cbd5e1";

    const markedDates = useMemo(() => {
        const map: Record<string, { marked?: boolean; selected?: boolean; selectedColor?: string }> = {};

        tasks.forEach((task) => {
            if (!task.dueDate) return;
            map[task.dueDate] = {...(map[task.dueDate] ?? {}), marked: true};
        });

        map[selectedDate] = {...(map[selectedDate] ?? {}), selected: true, selectedColor: accentColor};
        return map;
    }, [accentColor, selectedDate, tasks]);

    const selectedTasks = tasks.filter((task) => task.dueDate === selectedDate).sort((a, b) => a.order - b.order);
    const customGoalReady = customGoal.trim().length > 0;
    const isGoalLocked = Boolean(weeklyGoal?.achievedAt);

    useEffect(() => {
        if (!focusWeeklyGoalKey) return;
        focusWeeklyGoal();
    }, [focusWeeklyGoalKey, weeklyGoal]);

    useEffect(() => {
        onGoalsRouteChange?.(route === "goals");
        return () => onGoalsRouteChange?.(false);
    }, [onGoalsRouteChange, route]);

    function focusWeeklyGoal() {
        openGoalsRoute(true);
    }

    function openCalendarRoute() {
        playRouteTransition();
        setRoute("calendar");

        requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({y: 0, animated: false});
        });
    }

    function openGoalsRoute(focusInput = false) {
        playRouteTransition();
        setRoute("goals");
        if (weeklyGoal && !weeklyGoal.achievedAt) {
            setCustomGoal(weeklyGoal.text);
        }

        setTimeout(() => {
            scrollRef.current?.scrollTo({y: 0, animated: false});
            if (focusInput && !weeklyGoal?.achievedAt) {
                customGoalInputRef.current?.focus();
            }
        }, 100);
    }

    function playRouteTransition() {
        routeOpacity.setValue(0);
        routeTranslateY.setValue(-14);

        Animated.parallel([
            Animated.timing(routeOpacity, {
                toValue: 1,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(routeTranslateY, {
                toValue: 0,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }

    function handleGoogleRoutePress() {
        if (!googleCalendar.available || googleCalendar.busy) return;
        if (googleCalendar.connected) {
            void googleCalendar.syncNow();
            return;
        }

        void googleCalendar.connect();
    }

    async function saveWeeklyGoal(payload: { text: string; presetId?: string | null }) {
        setGoalSaveError(null);
        try {
            await onSaveWeeklyGoal(payload);
        } catch (error) {
            setGoalSaveError(error instanceof Error ? error.message : "Weekly goal could not be saved.");
        }
    }

    return (
        <ScreenBackground visualMode={visualMode} source={bg}>
            <Animated.View
                style={[
                    tw`flex-1`,
                    {paddingHorizontal: 1, paddingBottom: keyboardInset},
                ]}
            >
                <View style={tw`absolute right-3 top-16 z-20 items-center gap-5`}>
                    <CalendarRouteEntry
                        label="Calendar"
                        icon="calendar-outline"
                        onPress={openCalendarRoute}
                        active={route === "calendar"}
                        activeColor={georgiaMode ? GEORGIA_ACCENT_COLOR : undefined}
                        darkContent={riverMode || georgiaMode}
                        whiteContent={georgiaMode}
                    />
                    <CalendarRouteEntry
                        label="Google"
                        icon="logo-google"
                        onPress={handleGoogleRoutePress}
                        disabled={!googleCalendar.available || googleCalendar.busy}
                        darkContent={riverMode || georgiaMode}
                        whiteContent={georgiaMode}
                    />
                    <CalendarRouteEntry
                        label="Tasks"
                        icon="checkbox-outline"
                        onPress={onOpenTasks}
                        darkContent={riverMode || georgiaMode}
                        whiteContent={georgiaMode}
                    />
                    <CalendarRouteEntry
                        label="Goals"
                        icon="flag-outline"
                        onPress={() => openGoalsRoute()}
                        active={route === "goals"}
                        activeColor={georgiaMode ? GEORGIA_ACCENT_COLOR : undefined}
                        darkContent={riverMode || georgiaMode}
                        whiteContent={georgiaMode}
                    />
                </View>
                {route === "goals" ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Close goals"
                        onPress={() => {
                            haptics.navigation();
                            openCalendarRoute();
                        }}
                        hitSlop={10}
                        style={({pressed}) => [
                            tw`absolute right-4 top-2 z-30 h-9 w-9 items-center justify-center`,
                            pressed && {opacity: 0.6, transform: [{translateY: 1}]},
                        ]}
                    >
                        <Ionicons name="close" size={18} color={headerTextColor}/>
                    </Pressable>
                ) : null}
                <ScrollView
                    ref={scrollRef}
                    style={tw`flex-1`}
                    contentContainerStyle={tw`pl-4 pr-20 pt-2 pb-28`}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                >
                    <Animated.View style={{opacity: routeOpacity, transform: [{translateY: routeTranslateY}]}}>
                        {route === "calendar" ? (
                            <View style={tw`mt-[49px]`}>
                                <Text
                                    style={[tw`self-center text-center text-2xl font-black`, {fontFamily: fonts.heading, color: headerTextColor}]}>Calendar</Text>
                                <Text
                                    style={[tw`self-center text-center mt-1 text-sm`, {fontFamily: fonts.body, color: headerSecondaryTextColor}]}>Tap
                                    a day to filter due tasks.</Text>

                                {showTutorial && onDismissTutorial ? (
                                    <View style={tw`mt-3`}>
                                        <TutorialCard
                                            title="Calendar"
                                            body="See your week at a glance and steer it with weekly goals."
                                            onDismiss={onDismissTutorial}
                                            visualMode={visualMode}
                                            detailsIntro="Calendar filters your due tasks by day and holds the weekly goal you're pushing toward."
                                            detailsSteps={[
                                                {
                                                    title: "Pick a day",
                                                    body: "Tap a date to filter the list to tasks due that day.",
                                                },
                                                {
                                                    title: "Set a weekly goal",
                                                    body: "Open Goals and choose a preset or write your own focus for the week.",
                                                },
                                                {
                                                    title: "Mark it achieved",
                                                    body: "Check the goal off at the end of the week to log the win.",
                                                },
                                                {
                                                    title: "Earn badges",
                                                    body: "Every three completed weekly goals unlocks a new badge.",
                                                },
                                            ]}
                                        />
                                    </View>
                                ) : null}

                                {googleCalendar.error ? (
                                    <Text
                                        style={[tw`mt-3 rounded-2xl border border-slate-700/60 bg-black/22 px-4 py-3 text-xs text-red-300`, {fontFamily: fonts.body}]}>
                                        {googleCalendar.error}
                                    </Text>
                                ) : null}

                                <TranslucentCalendar
                                    markedDates={markedDates}
                                    onDayPress={(day) => {
                                        haptics.calendarDateSelected();
                                        setSelectedDate(day.dateString);
                                    }}
                                />

                                {riverMode ? (
                                    <View style={tw`mt-3 self-center`}>
                                        <TranslucentCard radius={16} style={tw`px-4 py-2`}>
                                            <Text
                                                style={[tw`text-center text-lg font-extrabold`, {fontFamily: fonts.heading, color: selectedDateTextColor}]}>
                                                {selectedDate}
                                            </Text>
                                        </TranslucentCard>
                                    </View>
                                ) : (
                                    <Text
                                        style={[tw`mt-3 text-center text-lg font-extrabold`, {fontFamily: fonts.heading, color: selectedDateTextColor}]}>
                                        {selectedDate}
                                    </Text>
                                )}
                                {selectedTasks.length === 0 ? (
                                    <View style={[tw`mt-2`, calendarTaskCardShellStyle]}>
                                        <TranslucentCard radius={16} style={[tw`p-3`, calendarTaskCardStyle]}>
                                            <Text style={[{fontFamily: fonts.body, color: calendarTaskMutedTextColor}]}>No tasks due this day.</Text>
                                        </TranslucentCard>
                                    </View>
                                ) : (
                                    selectedTasks.map((task) => (
                                        <View key={task.id} style={[tw`mt-2`, calendarTaskCardShellStyle]}>
                                            <TranslucentCard radius={16} style={[tw`p-3`, calendarTaskCardStyle]}>
                                                <Text
                                                    style={[tw`self-center text-center text-base font-bold`, {fontFamily: fonts.heading, color: calendarTaskTextColor}]}>{task.title}</Text>
                                                {!!task.description &&
                                                    <Text
                                                        style={[tw`self-center text-center mt-1 text-sm`, {fontFamily: fonts.body, color: calendarTaskMutedTextColor}]}>{task.description}</Text>}
                                                <Text
                                                    style={[tw`self-center text-center mt-2 text-xs font-bold uppercase`, {fontFamily: fonts.body, color: calendarTaskMutedTextColor}]}>
                                                    {task.status.replace("_", " ")} • {task.priority}
                                                </Text>
                                                {task.source === "google_calendar" ? (
                                                    <Text
                                                        style={[tw`self-center text-center mt-1 text-[10px] font-bold uppercase`, {fontFamily: fonts.body, color: calendarTaskMutedTextColor}]}>
                                                        Google Calendar
                                                    </Text>
                                                ) : null}
                                            </TranslucentCard>
                                        </View>
                                    ))
                                )}
                            </View>
                        ) : (
                            <GoalsRoute
                                ref={customGoalInputRef}
                                weeklyGoal={weeklyGoal}
                                weeklyGoalProgress={weeklyGoalProgress}
                                weeklyGoalPresets={weeklyGoalPresets}
                                customGoal={customGoal}
                                setCustomGoal={setCustomGoal}
                                customGoalReady={customGoalReady}
                                isGoalLocked={isGoalLocked}
                                goalSaveError={goalSaveError}
                                onSavePreset={(preset) => {
                                    setCustomGoal("");
                                    void saveWeeklyGoal({text: preset.title, presetId: preset.id});
                                }}
                                onSaveCustom={() => {
                                    const text = customGoal.trim();
                                    setCustomGoal("");
                                    void saveWeeklyGoal({text, presetId: null});
                                }}
                                onMarkGoalAchieved={onMarkGoalAchieved}
                                loadRecentAchievedGoals={loadRecentAchievedGoals}
                            />
                        )}
                    </Animated.View>
                </ScrollView>
            </Animated.View>
        </ScreenBackground>
    );
}
