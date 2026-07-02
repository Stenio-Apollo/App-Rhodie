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

function CalendarRouteEntry({
                                label,
                                icon,
                                onPress,
                                disabled = false,
                                active = false,
                                coastOrRiver = false,
                                whiteContent = false,
                            }: {
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    onPress: () => void;
    disabled?: boolean;
    active?: boolean;
    coastOrRiver?: boolean;
    whiteContent?: boolean;
}) {
    const badgeColor = "#ba885a";
    const color = disabled
        ? (whiteContent ? "rgba(228,224,212,0.35)" : coastOrRiver ? "rgba(17,17,17,0.35)" : "rgba(228,224,212,0.35)")
        : active
            ? badgeColor
        : whiteContent
            ? "#E4E0D4"
            : coastOrRiver ? "#000000" : "#E4E0D4";

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
    const bg = visualMode === "georgia"
        ? require("../../public/images/rhram1.jpg")
        : require("../../public/images/rh211.jpg");
    const {keyboardInset} = useKeyboardInset();
    const coastMode = visualMode === "coast";
    const coastOrRiver = visualMode === "river" || coastMode;
    const georgiaMode = visualMode === "georgia";
    const sonnyMode = visualMode === "sonny";
    const accentColor = "#FF3800";
    const sonnyBadgeColor = "#ba885a";
    const primaryTextColor = georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : "#E4E0D4";
    const headerTextColor = georgiaMode || sonnyMode ? sonnyBadgeColor : coastMode ? "#FFFFFF" : primaryTextColor;
    const selectedDateTextColor = coastMode || georgiaMode ? "#FFFFFF" : primaryTextColor;
    const bodyMutedTextColor = georgiaMode ? "rgba(255,255,255,0.7)" : coastOrRiver ? "rgba(17,17,17,0.7)" : "#94a3b8";
    const calendarTaskTextColor = coastMode || georgiaMode ? "#FFFFFF" : primaryTextColor;
    const calendarTaskMutedTextColor = georgiaMode ? "rgba(255,255,255,0.78)" : coastMode ? "rgba(255,255,255,0.78)" : bodyMutedTextColor;
    const calendarTaskCardShellStyle = sonnyMode || georgiaMode || coastOrRiver
        ? {
            borderRadius: 20,
            shadowColor: sonnyBadgeColor,
            shadowOffset: {width: 0, height: 10},
            shadowOpacity: 0.28,
            shadowRadius: 18,
            elevation: 10,
        }
        : null;
    const calendarTaskCardStyle = sonnyMode
        ? {
            backgroundColor: "#000000",
            borderColor: "rgba(186,136,90,0.52)",
        }
        : null;
    const headerSecondaryTextColor = georgiaMode || sonnyMode ? "#FFFFFF" : coastMode ? "rgba(255,255,255,0.7)" : coastOrRiver ? "rgba(17,17,17,0.7)" : "#cbd5e1";

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
                        coastOrRiver={coastOrRiver || georgiaMode}
                        whiteContent={visualMode === "coast" || georgiaMode}
                    />
                    <CalendarRouteEntry
                        label="Google"
                        icon="logo-google"
                        onPress={handleGoogleRoutePress}
                        disabled={!googleCalendar.available || googleCalendar.busy}
                        coastOrRiver={coastOrRiver || georgiaMode}
                        whiteContent={visualMode === "coast" || georgiaMode}
                    />
                    <CalendarRouteEntry
                        label="Tasks"
                        icon="checkbox-outline"
                        onPress={onOpenTasks}
                        coastOrRiver={coastOrRiver || georgiaMode}
                        whiteContent={visualMode === "coast" || georgiaMode}
                    />
                    <CalendarRouteEntry
                        label="Goals"
                        icon="flag-outline"
                        onPress={() => openGoalsRoute()}
                        active={route === "goals"}
                        coastOrRiver={coastOrRiver || georgiaMode}
                        whiteContent={visualMode === "coast" || georgiaMode}
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
                                            body="Set your weekly goal here and I'll hold you accountable. Completed goals earns you 1pt. Every 3pts earns you a badge"
                                            onDismiss={onDismissTutorial}
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

                                <Text
                                    style={[tw`mt-3 text-center text-lg font-extrabold`, {fontFamily: fonts.heading, color: selectedDateTextColor}]}>{selectedDate}</Text>
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
