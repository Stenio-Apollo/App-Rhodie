import {useMemo, useState} from "react";
import {ImageBackground, Pressable, ScrollView, Text, View} from "react-native";
import tw from "../lib/tw";
import type {Task} from "../types";
import type {Session} from "@supabase/supabase-js";
import {TranslucentCalendar} from "../components/TranslucentCalendar";
import {fonts} from "../theme/fonts";

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
}

export function CalendarScreen({tasks, googleCalendar}: CalendarScreenProps) {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const bg = require("../../public/images/rh14.jpg");

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

    return (
        <ImageBackground source={bg} style={tw`flex-1`} imageStyle={tw`opacity-55`}>
            <View style={tw`flex-1 bg-[#0a0a0a]/15`}>
                <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-4 pt-2 pb-3`}>
                    <Text
                        style={[tw`self-center text-center text-2xl font-black text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Calendar</Text>
                    <Text style={[tw`self-center text-center mt-1 text-sm text-slate-300`, {fontFamily: fonts.body}]}>Tap
                        a day to filter due tasks.</Text>

                    <View style={tw`mt-3 rounded-2xl border border-orange-50/19 bg-[#111111] p-3`}>
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
                        <View style={tw`mt-2 rounded-2xl border border-[#2c2c2c] bg-[#111111] p-3`}>
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
                </ScrollView>
            </View>
        </ImageBackground>
    );
}
