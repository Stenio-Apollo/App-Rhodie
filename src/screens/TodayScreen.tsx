import {useMemo} from "react";
import {ImageBackground, ScrollView, Text, View} from "react-native";
import tw from "../lib/tw";
import {getDailyStoicQuote} from "../lib/quotes";
import {useJournal} from "../state/useJournal";
import type {Task} from "../types";
import {fonts} from "../theme/fonts";
import type {Session} from "@supabase/supabase-js";
import {useProfile} from "../state/useProfile";
import {isToday} from "../lib/date-utils";

interface TodayScreenProps {
    tasks: Task[];
    session: Session | null;
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

export function TodayScreen({tasks, session}: TodayScreenProps) {
    const {byDate} = useJournal(session);
    const {profile} = useProfile(session);
    const today = isoToday();

    const todaysQuote = useMemo(() => getDailyStoicQuote(today), [today]);
    const todaysEntries = byDate[today] ?? [];
    const latestGratitude = [...todaysEntries].filter(e => e.category === "gratitude").slice(-1)[0];
    const latestPrompt = [...todaysEntries].filter(e => e.category === "prompt").slice(-1)[0];

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
                            tw`mb-83 text-3xl text-white/7 tracking-[11px] border-2 border-white/3 p-1 rounded-lg`,
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
                        <View style={tw`flex-row items-center justify-between`}>
                            <Text style={[tw`text-xs font-semibold`, {fontFamily: fonts.body, color: "rgba(228,224,212,0.6)"}]}>Today
                                • {today}</Text>
                            {profile?.birthday && isToday(profile.birthday) ? (
                                <Text style={[tw`text-xs font-semibold text-orange-200`, {fontFamily: fonts.body}]}>Happy
                                    birthday!</Text>
                            ) : null}
                        </View>
                        <Text style={[tw`mt-1 text-sm`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                            {profile?.full_name ? `Welcome, ${profile.full_name}` : "Welcome back"}
                        </Text>
                        <Text style={[tw`mt-2 text-lg leading-snug`, {fontFamily: fonts.body, color: "#E4E0D4"}]}
                              numberOfLines={3}>
                            {todaysQuote}
                        </Text>
                    </View>

                    <View style={tw`rounded-3xl border border-[#2c2c2c] bg-black/23 p-4`}>
                        <Text
                            style={[tw`text-sm font-semibold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Gratitude</Text>
                        {latestGratitude ? (
                            <Text style={[tw`mt-2 text-base`, {fontFamily: fonts.body, color: "#E4E0D4"}]} numberOfLines={4}>
                                {latestGratitude.text}
                            </Text>
                        ) : (
                            <Text style={[tw`mt-2 text-sm text-slate-300`, {fontFamily: fonts.body}]}>No gratitude entry
                                yet for
                                today.</Text>
                        )}
                    </View>

                    <View style={tw`rounded-3xl border border-[#2c2c2c] bg-black/23 p-4`}>
                        <Text style={[tw`text-sm font-semibold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Prompt
                            response</Text>
                        {latestPrompt ? (
                            <Text style={[tw`mt-2 text-base`, {fontFamily: fonts.body, color: "#E4E0D4"}]} numberOfLines={4}>
                                {latestPrompt.text}
                            </Text>
                        ) : (
                            <Text style={[tw`mt-2 text-sm text-slate-300`, {fontFamily: fonts.body}]}>No prompt response
                                yet for today.</Text>
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
                                        style={[tw`text-base`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>{task.title}</Text>
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
