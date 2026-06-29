import {useEffect, useMemo, useRef, useState} from "react";
import {
    Animated,
    Easing,
    ImageBackground,
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
import type {VisualMode} from "../state/useVisualMode";
import {useKeyboardInset} from "../lib/useKeyboardInset";

function CalendarRouteEntry({
                                label,
                                icon,
                                onPress,
                                disabled = false,
                                active = false,
                            }: {
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    onPress: () => void;
    disabled?: boolean;
    active?: boolean;
}) {
    const color = disabled ? "rgba(228,224,212,0.35)" : active ? "#000000" : "#E4E0D4";

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
    const bg = visualMode === "sunset"
        ? require("../../public/images/rhram1.jpg")
        : require("../../public/images/rh211.jpg");
    const {keyboardInset} = useKeyboardInset();

    const markedDates = useMemo(() => {
        const map: Record<string, { marked?: boolean; selected?: boolean; selectedColor?: string }> = {};

        tasks.forEach((task) => {
            if (!task.dueDate) return;
            map[task.dueDate] = {...(map[task.dueDate] ?? {}), marked: true};
        });

        map[selectedDate] = {...(map[selectedDate] ?? {}), selected: true, selectedColor: "#B55941"};
        return map;
    }, [selectedDate, tasks]);

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
        <ImageBackground source={bg} style={tw`flex-1`} imageStyle={tw`opacity-33`}>
            <Animated.View
                style={[tw`flex-1 bg-black/33`, {paddingHorizontal: 1, paddingBottom: keyboardInset}]}
            >
                <View style={tw`absolute right-3 top-16 z-20 items-center gap-5`}>
                    <CalendarRouteEntry
                        label="Calendar"
                        icon="calendar-outline"
                        onPress={openCalendarRoute}
                        active={route === "calendar"}
                    />
                    <CalendarRouteEntry
                        label="Google"
                        icon="logo-google"
                        onPress={handleGoogleRoutePress}
                        disabled={!googleCalendar.available || googleCalendar.busy}
                    />
                    <CalendarRouteEntry
                        label="Tasks"
                        icon="checkbox-outline"
                        onPress={onOpenTasks}
                    />
                    <CalendarRouteEntry
                        label="Goals"
                        icon="flag-outline"
                        onPress={() => openGoalsRoute()}
                        active={route === "goals"}
                    />
                </View>
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
                                    style={[tw`self-center text-center text-2xl font-black text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Calendar</Text>
                                <Text
                                    style={[tw`self-center text-center mt-1 text-sm text-slate-300`, {fontFamily: fonts.body}]}>Tap
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
                                        style={[tw`mt-3 rounded-2xl bg-black/70 px-4 py-3 text-xs text-red-300`, {fontFamily: fonts.body}]}>
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
                                    style={[tw`mt-3 text-center text-lg font-extrabold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>{selectedDate}</Text>
                                {selectedTasks.length === 0 ? (
                                    <View style={tw`mt-2 rounded-2xl border border-[#2c2c2c] bg-black/69 p-3`}>
                                        <Text style={[tw`text-slate-300`, {fontFamily: fonts.body}]}>No tasks due this day.</Text>
                                    </View>
                                ) : (
                                    selectedTasks.map((task) => (
                                        <View key={task.id} style={tw`mt-2 rounded-2xl border border-[#2c2c2c] bg-[#111111] p-3`}>
                                            <Text
                                                style={[tw`self-center text-center text-base font-bold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>{task.title}</Text>
                                            {!!task.description &&
                                                <Text
                                                    style={[tw`self-center text-center mt-1 text-sm text-slate-300`, {fontFamily: fonts.body}]}>{task.description}</Text>}
                                            <Text
                                                style={[tw`self-center text-center mt-2 text-xs font-bold uppercase text-slate-400`, {fontFamily: fonts.body}]}>
                                                {task.status.replace("_", " ")} • {task.priority}
                                            </Text>
                                            {task.source === "google_calendar" ? (
                                                <Text
                                                    style={[tw`self-center text-center mt-1 text-[10px] font-bold uppercase text-blue-300`, {fontFamily: fonts.body}]}>
                                                    Google Calendar
                                                </Text>
                                            ) : null}
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
        </ImageBackground>
    );
}
