import {useEffect, useMemo, useState} from "react";
import {ImageBackground, Modal, Pressable, ScrollView, Text, View} from "react-native";
import tw from "../lib/tw";
import type {Task} from "../types";
import type {Session} from "@supabase/supabase-js";
import {TranslucentCalendar} from "../components/TranslucentCalendar";
import {fonts} from "../theme/fonts";
import {Input} from "../components/ui/Input";
import type {WeeklyGoal, WeeklyGoalPreset} from "../state/useWeeklyGoal";
import {toLocalISODate} from "../lib/date-utils";

interface CalendarScreenProps {
    tasks: Task[];
    session: Session | null;
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
    onRecordWeeklyGoalCheck: (achieved: boolean) => Promise<void>;
}

export function CalendarScreen({
                                   tasks,
                                   googleCalendar,
                                   weeklyGoal,
                                   weeklyGoalPresets,
                                   onSaveWeeklyGoal,
                                   onRecordWeeklyGoalCheck,
                               }: CalendarScreenProps) {
    const [selectedDate, setSelectedDate] = useState(toLocalISODate());
    const [customGoal, setCustomGoal] = useState("");
    const [goalCheckVisible, setGoalCheckVisible] = useState(false);
    const [goalFeedbackVisible, setGoalFeedbackVisible] = useState(false);
    const [goalFeedbackMessage, setGoalFeedbackMessage] = useState("");
    const bg = require("../../public/images/rh25.jpg");

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
        if (!weeklyGoal || weeklyGoal.lastCheckedAt) return;

        const timeout = setTimeout(() => {
            setGoalCheckVisible(true);
        }, 350);

        return () => clearTimeout(timeout);
    }, [weeklyGoal]);

    function handleGoalCheck(achieved: boolean) {
        setGoalCheckVisible(false);
        void onRecordWeeklyGoalCheck(achieved);
        setGoalFeedbackMessage(achieved ? "keep crushing it" : "lets not forget");
        setGoalFeedbackVisible(true);
    }

    return (
        <ImageBackground source={bg} style={tw`flex-1`} imageStyle={tw`opacity-35`}>
            <View style={tw`flex-1 bg-black/33`}>
                <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-4 pt-2 pb-3`}>
                    <Text
                        style={[tw`self-center text-center text-2xl font-black text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Calendar</Text>
                    <Text style={[tw`self-center text-center mt-1 text-sm text-slate-300`, {fontFamily: fonts.body}]}>Tap
                        a day to filter due tasks.</Text>

                    <View style={tw`mt-3 rounded-2xl border border-orange-50/19 bg-black/39 p-3`}>
                        <Text style={[tw`text-sm font-bold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Google
                            Calendar Sync</Text>
                        {!googleCalendar.available ? (
                            <Text style={[tw`mt-1 text-xs text-slate-300`, {fontFamily: fonts.body}]}>
                                Set `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` to enable sync.
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
                                                void googleCalendar.connect();
                                            }}
                                            style={({pressed}) => [
                                                tw`rounded-lg border px-3 py-2`,
                                                {borderColor: "#B55941", backgroundColor: "transparent"},
                                                (pressed || googleCalendar.busy) && tw`opacity-80`,
                                            ]}
                                        >
                                            <Text style={[tw`text-xs`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                                                {googleCalendar.busy ? "Connecting..." : "Connect"}
                                            </Text>
                                        </Pressable>
                                    ) : (
                                        <>
                                            <Pressable
                                                onPress={() => {
                                                    void googleCalendar.syncNow();
                                                }}
                                                style={({pressed}) => [
                                                    tw`rounded-lg px-3 py-2`,
                                                    {backgroundColor: "#2B2B2B"},
                                                    (pressed || googleCalendar.busy) && tw`opacity-80`,
                                                ]}
                                            >
                                                <Text style={[tw`text-xs`, {
                                                    fontFamily: fonts.heading,
                                                    color: "#E4E0D4"
                                                }]}>
                                                    {googleCalendar.busy ? "Syncing..." : "Sync now"}
                                                </Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={() => {
                                                    void googleCalendar.disconnect();
                                                }}
                                                style={({pressed}) => [
                                                    tw`rounded-lg border border-slate-300 px-3 py-2`,
                                                    (pressed || googleCalendar.busy) && tw`opacity-80`,
                                                ]}
                                            >
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
                        onDayPress={(day) => setSelectedDate(day.dateString)}
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

                    <View style={tw`mt-3 rounded-[28px] border border-[#2c2c2c] bg-black/73 p-3`}>
                        <View style={tw`flex-row items-start justify-between gap-3`}>
                            <View style={tw`flex-1`}>
                                <Text style={[tw`text-sm font-bold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
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
                                <Text style={[tw`text-xs font-semibold text-slate-400`, {fontFamily: fonts.body}]}>
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
                                            setCustomGoal("");
                                            void onSaveWeeklyGoal({text: goal.title, presetId: goal.id});
                                        }}
                                        style={({pressed}) => [
                                            tw`w-[48%] rounded-xl border px-3 py-3`,
                                            selected
                                                ? {borderColor: "#B55941", backgroundColor: "rgba(181,89,65,0.18)"}
                                                : {borderColor: "#2c2c2c", backgroundColor: "rgba(0,0,0,0.35)"},
                                            isGoalLocked && tw`opacity-45`,
                                            pressed && tw`opacity-80`,
                                        ]}
                                    >
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
                            <Input
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
                                    const text = customGoal.trim();
                                    setCustomGoal("");
                                    void onSaveWeeklyGoal({text, presetId: null});
                                }}
                                style={({pressed}) => [
                                    tw`mt-2 rounded-xl px-3 py-2.5 items-center`,
                                    {backgroundColor: "#B55941"},
                                    (!customGoalReady || isGoalLocked) && tw`opacity-50`,
                                    pressed && customGoalReady ? tw`opacity-80` : null,
                                ]}
                            >
                                <Text style={[tw`text-sm font-bold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                    Use custom goal
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
                <Modal
                    visible={goalCheckVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setGoalCheckVisible(false)}
                >
                    <View style={tw`flex-1 items-center justify-center bg-black/72 px-5`}>
                        <View style={tw`w-full rounded-[28px] border border-[#B55941] bg-[#0f0f0f] p-5`}>
                            <Text style={[tw`text-center text-xl text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                Weekly goal check-in
                            </Text>
                            <Text
                                style={[tw`mt-3 text-center text-sm leading-5 text-slate-300`, {fontFamily: fonts.body}]}>
                                Have you achieved this week's goal?
                            </Text>
                            {weeklyGoal ? (
                                <View style={tw`mt-4 rounded-2xl border border-[#2c2c2c] bg-black/42 px-3 py-3`}>
                                    <Text
                                        style={[tw`text-center text-base text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                        {weeklyGoal.text}
                                    </Text>
                                </View>
                            ) : null}
                            <View style={tw`mt-5 flex-row gap-3`}>
                                <Pressable
                                    onPress={() => handleGoalCheck(false)}
                                    style={({pressed}) => [
                                        tw`flex-1 rounded-xl border border-[#2c2c2c] px-3 py-3`,
                                        {backgroundColor: "rgba(0,0,0,0.35)"},
                                        pressed && tw`opacity-80`,
                                    ]}
                                >
                                    <Text style={[tw`text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                        Not yet
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => handleGoalCheck(true)}
                                    style={({pressed}) => [
                                        tw`flex-1 rounded-xl px-3 py-3`,
                                        {backgroundColor: "#B55941"},
                                        pressed && tw`opacity-80`,
                                    ]}
                                >
                                    <Text style={[tw`text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                        Yes
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
                <Modal
                    visible={goalFeedbackVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setGoalFeedbackVisible(false)}
                >
                    <View style={tw`flex-1 items-center justify-center bg-black/72 px-5`}>
                        <View style={tw`w-full rounded-[28px] border border-[#B55941] bg-[#0f0f0f] p-5`}>
                            <Text style={[tw`text-center text-xl text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                {goalFeedbackMessage}
                            </Text>
                            {weeklyGoal ? (
                                <View style={tw`mt-4 rounded-2xl border border-[#2c2c2c] bg-black/42 px-3 py-3`}>
                                    <Text
                                        style={[tw`text-center text-base text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                        {weeklyGoal.text}
                                    </Text>
                                </View>
                            ) : null}
                            <View style={tw`mt-5`}>
                                <Pressable
                                    onPress={() => setGoalFeedbackVisible(false)}
                                    style={({pressed}) => [
                                        tw`rounded-xl px-3 py-3`,
                                        {backgroundColor: "#B55941"},
                                        pressed && tw`opacity-80`,
                                    ]}
                                >
                                    <Text style={[tw`text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                        Continue
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </ImageBackground>
    );
}
