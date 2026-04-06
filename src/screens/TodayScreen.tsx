import {useMemo} from "react";
import {ImageBackground, ScrollView, Text, View} from "react-native";
import tw from "../lib/tw";
import {getDailyStoicQuote} from "../lib/quotes";
import {useJournal} from "../state/useJournal";
import type {Task} from "../types";
import {fonts} from "../theme/fonts";

interface TodayScreenProps {
    tasks: Task[];
}

function isoToday(): string {
    return new Date().toISOString().slice(0, 10);
}

const statusRank: Record<Task["status"], number> = {
    todo: 0,
    in_progress: 1,
    completed: 2,
};

const statusLabel: Record<Task["status"], string> = {
    todo: "To do",
    in_progress: "In progress",
    completed: "Done",
};

export function TodayScreen({tasks}: TodayScreenProps) {
    const {byDate} = useJournal();
    const today = isoToday();

    const todaysQuote = useMemo(() => getDailyStoicQuote(today), [today]);
    const todaysEntries = byDate[today] ?? [];
    const latestEntry = todaysEntries[todaysEntries.length - 1];

    const dueToday = useMemo(
        () =>
            tasks
                .filter((t) => t.dueDate === today)
                .sort((a, b) => statusRank[a.status] - statusRank[b.status]),
        [tasks, today],
    );

    const bg = require("../../public/images/rh6.jpg");

    return (
        <ImageBackground source={bg} style={tw`flex-1`} imageStyle={tw`opacity-39`}>
            <View style={tw`flex-1 bg-black/1`}>
                <View style={tw`absolute inset-0 items-center justify-center`}>
                    <Text
                        style={[
                            tw`mb-39 text-4xl text-white/11 tracking-[5px]`,
                            {fontFamily: fonts.display},
                        ]}
                    >
                        RHODIE
                    </Text>
                </View>
                <ScrollView
                    style={tw`flex-1`}
                    contentContainerStyle={tw`flex-grow justify-end px-4 pb-7 pt-4 gap-4`}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={tw`rounded-3xl border border-[#2c2c2c] bg-black/23 p-4`}>
                        <Text style={[tw`text-xs font-semibold text-white/60`, {fontFamily: fonts.body}]}>Today
                            • {today}</Text>
                        <Text style={[tw`mt-2 text-lg text-white leading-snug`, {fontFamily: fonts.body}]}
                              numberOfLines={3}>
                            {todaysQuote}
                        </Text>
                    </View>

                    <View style={tw`rounded-3xl border border-[#2c2c2c] bg-black/23 p-4`}>
                        <Text style={[tw`text-sm font-semibold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Journal
                            preview</Text>
                        {latestEntry ? (
                            <Text style={[tw`mt-2 text-base text-white`, {fontFamily: fonts.body}]} numberOfLines={4}>
                                {latestEntry.text}
                            </Text>
                        ) : (
                            <Text style={[tw`mt-2 text-sm text-slate-300`, {fontFamily: fonts.body}]}>No entry yet for
                                today.</Text>
                        )}
                    </View>

                    <View style={tw`mb-1 rounded-3xl border border-[#2c2c2c] bg-black/23 p-4`}>
                        <Text
                            style={[tw`text-sm font-semibold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Tasks</Text>
                        {dueToday.length === 0 ? (
                            <Text style={[tw`mt-2 text-sm text-slate-300`, {fontFamily: fonts.body}]}>Nothing due
                                today.</Text>
                        ) : (
                            dueToday.map((task) => (
                                <View
                                    key={task.id}
                                    style={tw`mt-2 rounded-2xl border border-[#2c2c2c] bg-black/40 px-3 py-2`}
                                >
                                    <Text
                                        style={[tw`text-base text-white`, {fontFamily: fonts.heading}]}>{task.title}</Text>
                                    {task.description ? (
                                        <Text style={[tw`mt-1 text-xs text-slate-300`, {fontFamily: fonts.body}]}
                                              numberOfLines={2}>
                                            {task.description}
                                        </Text>
                                    ) : null}
                                    <View style={tw`mt-2 flex-row items-center justify-between`}>
                                        <Text
                                            style={[tw`text-[11px] font-semibold text-[#E4E0D4]/80`, {fontFamily: fonts.body}]}>
                                            {statusLabel[task.status]}
                                        </Text>
                                        {task.priority ? (
                                            <Text
                                                style={[tw`text-[11px] font-semibold text-orange-300`, {fontFamily: fonts.body}]}>
                                                {task.priority} priority
                                            </Text>
                                        ) : null}
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            </View>
        </ImageBackground>
    );
}
