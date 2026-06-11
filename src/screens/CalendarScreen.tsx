import {useEffect, useMemo, useRef, useState} from "react";
import {
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
import tw from "../lib/tw";
import type {Task} from "../types";
import {TranslucentCalendar} from "../components/TranslucentCalendar";
import {fonts} from "../theme/fonts";
import {Input} from "../components/ui/Input";
import type {WeeklyGoal, WeeklyGoalPreset} from "../state/useWeeklyGoal";
import {toLocalISODate} from "../lib/date-utils";
import {haptics} from "../lib/haptics";
import {TutorialCard} from "../components/TutorialCard";

const buttonDepthStyle = {
    shadowColor: "#000000",
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.11,
    shadowRadius: 3,
    elevation: 2,
};

function ButtonShine() {
    return (
        <>
            <LinearGradient
                colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0.02)", "rgba(0,0,0,0.08)"]}
                locations={[0, 0.48, 1]}
                pointerEvents="none"
                style={tw`absolute inset-0`}
            />
            <View
                pointerEvents="none"
                style={[
                    tw`absolute left-2 right-2 top-0.5 h-1 rounded-full`,
                    {backgroundColor: "rgba(255,255,255,0.05)"},
                ]}
            />
        </>
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
    onSaveWeeklyGoal: (payload: { text: string; presetId?: string | null }) => Promise<void>;
    focusWeeklyGoalKey?: number;
    showTutorial?: boolean;
    onDismissTutorial?: () => void;
}

export function CalendarScreen({
                                   tasks,
                                   googleCalendar,
                                   weeklyGoal,
                                   weeklyGoalPresets,
                                   onSaveWeeklyGoal,
                                   focusWeeklyGoalKey,
                                   showTutorial,
                                   onDismissTutorial,
                               }: CalendarScreenProps) {
    const [selectedDate, setSelectedDate] = useState(toLocalISODate());
    const [customGoal, setCustomGoal] = useState("");
    const [goalSaveError, setGoalSaveError] = useState<string | null>(null);
    const scrollRef = useRef<ScrollView>(null);
    const customGoalInputRef = useRef<TextInput>(null);
    const bg = require("../../public/images/rh211.jpg");

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
        if (weeklyGoal && !weeklyGoal.achievedAt) {
            setCustomGoal(weeklyGoal.text);
        }

        setTimeout(() => {
            scrollRef.current?.scrollToEnd({animated: true});
            if (!weeklyGoal?.achievedAt) {
                customGoalInputRef.current?.focus();
            }
        }, 100);
    }, [focusWeeklyGoalKey, weeklyGoal]);

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
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={[tw`flex-1 bg-black/33`, {paddingHorizontal: 1}]}
            >
                <ScrollView
                    ref={scrollRef}
                    style={tw`flex-1`}
                    contentContainerStyle={tw`px-4 pt-2 pb-28`}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    automaticallyAdjustKeyboardInsets
                >
                    <Text
                        style={[tw`self-center text-center text-2xl font-black text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Calendar</Text>
                    <Text style={[tw`self-center text-center mt-1 text-sm text-slate-300`, {fontFamily: fonts.body}]}>Tap
                        a day to filter due tasks.</Text>

                    {showTutorial && onDismissTutorial ? (
                        <View style={tw`mt-3`}>
                            <TutorialCard
                                title="Calendar connects tasks and goals"
                                body="Tap dates to see due tasks. Set your weekly goal near the bottom, then Rhodie will check in each day."
                                onDismiss={onDismissTutorial}
                            />
                        </View>
                    ) : null}

                    <View style={tw`mt-3 rounded-2xl border border-orange-50/19 bg-black/47 p-3`}>
                        <Text style={[tw`text-sm font-bold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Google
                            Calendar Sync</Text>
                        {!googleCalendar.available ? (
                            <Text style={[tw`mt-1 text-xs text-slate-300`, {fontFamily: fonts.body}]}>
                                Set the Google OAuth client ID for this platform to enable sync.
                            </Text>
                        ) : (
                            <>
                                <Text style={[tw`mt-1 text-xs text-slate-300`, {fontFamily: fonts.body}]}>
                                    {googleCalendar.connected ? "Connected. Events import automatically." : "Connect Google to import events."}
                                </Text>
                                {googleCalendar.lastSyncedAt ? (
                                    <Text style={[tw`mt-1 text-[11px] text-slate-400`, {fontFamily: fonts.body}]}>
                                        Last sync: {new Date(googleCalendar.lastSyncedAt).toLocaleString()}
                                    </Text>
                                ) : null}
                                {googleCalendar.error ? (
                                    <Text
                                        style={[tw`mt-1 text-[11px] text-red-300`, {fontFamily: fonts.body}]}>{googleCalendar.error}</Text>
                                ) : null}
                                <View style={tw`mt-2 flex-row gap-2`}>
                                    {!googleCalendar.connected ? (
                                        <Pressable
                                            onPress={() => {
                                                haptics.selection();
                                                void googleCalendar.connect();
                                            }}
                                            style={({pressed}) => [
                                                tw`overflow-hidden rounded-lg border px-3 py-2`,
                                                {borderColor: "#B55941", backgroundColor: "transparent", ...buttonDepthStyle},
                                                (pressed || googleCalendar.busy) && {opacity: 0.78, transform: [{translateY: 1}]},
                                            ]}
                                        >
                                            <ButtonShine/>
                                            <Text style={[tw`text-xs`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                                                {googleCalendar.busy ? "Connecting..." : "Connect"}
                                            </Text>
                                        </Pressable>
                                    ) : (
                                        <>
                                            <Pressable
                                                onPress={() => {
                                                    haptics.selection();
                                                    void googleCalendar.syncNow();
                                                }}
                                                style={({pressed}) => [
                                                    tw`overflow-hidden rounded-lg px-3 py-2`,
                                                    {backgroundColor: "#2B2B2B", ...buttonDepthStyle},
                                                    (pressed || googleCalendar.busy) && {opacity: 0.78, transform: [{translateY: 1}]},
                                                ]}
                                            >
                                                <ButtonShine/>
                                                <Text style={[tw`text-xs`, {
                                                    fontFamily: fonts.heading,
                                                    color: "#E4E0D4"
                                                }]}>
                                                    {googleCalendar.busy ? "Syncing..." : "Sync now"}
                                                </Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={() => {
                                                    haptics.selection();
                                                    void googleCalendar.disconnect();
                                                }}
                                                style={({pressed}) => [
                                                    tw`overflow-hidden rounded-lg border border-slate-300 px-3 py-2`,
                                                    {...buttonDepthStyle},
                                                    (pressed || googleCalendar.busy) && {opacity: 0.78, transform: [{translateY: 1}]},
                                                ]}
                                            >
                                                <ButtonShine/>
                                                <Text style={[tw`text-xs`, {
                                                    fontFamily: fonts.heading,
                                                    color: "#E4E0D4"
                                                }]}>Disconnect</Text>
                                            </Pressable>
                                        </>
                                    )}
                                </View>
                            </>
                        )}
                    </View>

                    <TranslucentCalendar
                        markedDates={markedDates}
                        onDayPress={(day) => {
                            haptics.calendarDateSelected();
                            setSelectedDate(day.dateString);
                        }}
                    />

                    <Text
                        style={[tw`mt-3 text-lg font-extrabold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>{selectedDate}</Text>
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

                    <View style={tw`mt-3 overflow-hidden rounded-[28px] border border-slate-700/33 bg-black/10 p-1`}>
                        <BlurView
                            intensity={72}
                            tint="dark"
                            style={tw`overflow-hidden rounded-[24px] border border-slate-700`}
                        >
                            <View
                                pointerEvents="none"
                                style={[StyleSheet.absoluteFill, {backgroundColor: "rgba(0,0,0,0.77)"}]}
                            />
                            <LinearGradient
                                colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.02)", "transparent"]}
                                locations={[0, 0.5, 1]}
                                pointerEvents="none"
                                style={[tw`absolute left-0 right-0 top-0`, {height: "45%"}]}
                            />
                            <LinearGradient
                                colors={["transparent", "rgba(0,0,0,0.35)"]}
                                pointerEvents="none"
                                style={[tw`absolute left-0 right-0 bottom-0`, {height: "28%"}]}
                            />

                            <View style={tw`p-3`}>
                                <View style={tw`flex-row items-start justify-between gap-3`}>
                                    <View style={tw`flex-1`}>
                                        <Text
                                            style={[tw`text-sm font-bold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                            This week's goal
                                        </Text>
                                        <Text style={[tw`mt-1 text-xs text-slate-300`, {fontFamily: fonts.body}]}>
                                            {isGoalLocked
                                                ? "Completed this week. Goal changes unlock Sunday."
                                                : "Pick a focus for the week or write your own."}
                                        </Text>
                                    </View>
                                    {weeklyGoal ? (
                                        <Text
                                            style={[
                                                tw`rounded-lg border border-[#B55941] px-2 py-1 text-[10px] font-bold uppercase text-[#E4E0D4]`,
                                                {fontFamily: fonts.body},
                                            ]}
                                        >
                                            Set
                                        </Text>
                                    ) : null}
                                </View>

                                {weeklyGoal ? (
                                    <View style={tw`mt-3 rounded-xl border border-[#2c2c2c] bg-black/35 px-3 py-2`}>
                                        <Text
                                            style={[tw`text-xs font-semibold text-slate-400`, {fontFamily: fonts.body}]}>
                                            Current focus
                                        </Text>
                                        <Text style={[tw`mt-1 text-base text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                            {weeklyGoal.text}
                                        </Text>
                                        <Text
                                            style={[
                                                tw`mt-2 text-[11px] font-semibold`,
                                                {
                                                    fontFamily: fonts.body,
                                                    color: weeklyGoal.achievedAt ? "#B55941" : "rgba(228,224,212,0.68)",
                                                },
                                            ]}
                                        >
                                            {weeklyGoal.achievedAt
                                                ? `Achieved ${new Date(weeklyGoal.achievedAt).toLocaleDateString(undefined, {
                                                    month: "short",
                                                    day: "numeric"
                                                })}`
                                                : weeklyGoal.lastCheckedAt
                                                    ? "Still in progress"
                                                    : "Not checked yet"}
                                        </Text>
                                    </View>
                                ) : null}

                                <View style={tw`mt-3 flex-row flex-wrap gap-2`}>
                                    {weeklyGoalPresets.map((goal) => {
                                        const selected = weeklyGoal?.presetId === goal.id;
                                        return (
                                            <Pressable
                                                key={goal.id}
                                                disabled={isGoalLocked}
                                                onPress={() => {
                                                    if (isGoalLocked) return;
                                                    haptics.selection();
                                                    setCustomGoal("");
                                                    void saveWeeklyGoal({text: goal.title, presetId: goal.id});
                                                }}
                                                style={({pressed}) => [
                                                    tw`w-[48%] overflow-hidden rounded-xl border px-3 py-3`,
                                                    selected
                                                        ? {
                                                            borderColor: "#B55941",
                                                            backgroundColor: "rgba(181,89,65,0.18)"
                                                        }
                                                        : {borderColor: "#2c2c2c", backgroundColor: "rgba(0,0,0,0.35)"},
                                                    buttonDepthStyle,
                                                    isGoalLocked && tw`opacity-45`,
                                                    pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                                                ]}
                                            >
                                                <ButtonShine/>
                                                <Text
                                                    style={[tw`text-sm font-bold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                                    {goal.title}
                                                </Text>
                                                <Text
                                                    style={[tw`mt-1 text-[11px] leading-4 text-slate-300`, {fontFamily: fonts.body}]}>
                                                    {goal.description}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                <View style={tw`mt-3`}>
                                    {goalSaveError ? (
                                        <Text
                                            style={[tw`mb-2 text-xs font-bold text-red-200`, {fontFamily: fonts.body}]}>
                                            {goalSaveError}
                                        </Text>
                                    ) : null}
                                    <Input
                                        ref={customGoalInputRef}
                                        value={customGoal}
                                        onChangeText={setCustomGoal}
                                        placeholder="Write your own weekly goal"
                                        returnKeyType="done"
                                        maxLength={120}
                                        editable={!isGoalLocked}
                                    />
                                    <Pressable
                                        disabled={!customGoalReady || isGoalLocked}
                                        onPress={() => {
                                            if (!customGoalReady || isGoalLocked) return;
                                            haptics.selection();
                                            const text = customGoal.trim();
                                            setCustomGoal("");
                                            void saveWeeklyGoal({text, presetId: null});
                                        }}
                                        style={({pressed}) => [
                                            tw`mt-2 overflow-hidden rounded-xl px-3 py-2.5 items-center`,
                                            {backgroundColor: "#B55941", ...buttonDepthStyle},
                                            (!customGoalReady || isGoalLocked) && tw`opacity-50`,
                                            pressed && customGoalReady ? {opacity: 0.78, transform: [{translateY: 1}]} : null,
                                        ]}
                                    >
                                        <ButtonShine/>
                                        <Text
                                            style={[tw`text-sm font-bold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                            Use custom goal
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </BlurView>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}
