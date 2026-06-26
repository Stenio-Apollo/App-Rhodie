import {useMemo, useState} from "react";
import {Image, ImageBackground, Pressable, ScrollView, Text, View} from "react-native";
import {Asset} from "expo-asset";
import {SvgUri} from "react-native-svg";
import tw from "../lib/tw";
import {getDailyStoicQuote} from "../lib/quotes";
import type {JournalEntry} from "../state/useJournal";
import type {Task} from "../types";
import {fonts} from "../theme/fonts";
import type {Profile} from "../state/useProfile";
import {isToday, toLocalISODate} from "../lib/date-utils";
import type {WeeklyGoal, WeeklyGoalProgress} from "../state/useWeeklyGoal";
import {TutorialCard} from "../components/TutorialCard";
import type {StickyNote} from "../state/useStickyNote";
import {StickyNoteModal} from "../components/StickyNoteModal";
import type {VisualMode} from "../state/useVisualMode";
import {Button} from "../components/ui/Button";

interface TodayScreenProps {
    tasks: Task[];
    profile: Profile | null;
    journalByDate: Record<string, JournalEntry[]>;
    weeklyGoal: WeeklyGoal | null;
    weeklyGoalProgress: WeeklyGoalProgress;
    onOpenJournalPrompt: (entryId: string | null) => void;
    onOpenWeeklyGoal: () => void;
    onOpenGratitude: (entryId: string | null) => void;
    onOpenTasks: () => void;
    stickyNote: StickyNote;
    onChangeStickyNote: (text: string) => void;
    onAddStickyNoteToTask: () => void;
    onClearStickyNote: () => void;
    visualMode: VisualMode;
    showTutorial?: boolean;
    onDismissTutorial?: () => void;
}

function isoToday(): string {
    return toLocalISODate();
}

const statusRank: Record<Task["status"], number> = {
    todo: 0,
    completed: 1,
};

const statusLabel: Record<Task["status"], string> = {
    todo: "To do",
    completed: "Done",
};

export function TodayScreen({
                                tasks,
                                profile,
                                journalByDate,
                                weeklyGoal,
                                weeklyGoalProgress,
                                onOpenJournalPrompt,
                                onOpenWeeklyGoal,
                                onOpenGratitude,
                                onOpenTasks,
                                stickyNote,
                                onChangeStickyNote,
                                onAddStickyNoteToTask,
                                onClearStickyNote,
                                visualMode,
                                showTutorial,
                                onDismissTutorial,
                            }: TodayScreenProps) {
    const [stickyNoteOpen, setStickyNoteOpen] = useState(false);
    const today = isoToday();

    const todaysQuote = useMemo(() => getDailyStoicQuote(today), [today]);
    const todaysEntries = journalByDate[today] ?? [];
    const latestGratitude = [...todaysEntries].filter(e => e.category === "gratitude").slice(-1)[0];
    const latestPrompt = [...todaysEntries].filter(e => e.category === "prompt").slice(-1)[0];

    const dueToday = useMemo(
        () =>
            tasks
                .filter((t) => t.dueDate === today)
                .sort((a, b) => statusRank[a.status] - statusRank[b.status]),
        [tasks, today],
    );

    const bg = visualMode === "sunset"
        ? require("../../public/images/rhelk1.jpg")
        : require("../../public/images/rh19.jpg");
    const badgeIcon = require("../../public/images/badge.png");
    const tasksIconUri = Asset.fromModule(require("../../public/images/calendar.svg")).uri;
    const stickyNoteButtonStyle = {
        backgroundColor: "#E1B996",
        borderWidth: 1,
        borderColor: "rgba(43,43,43,0.22)",
        shadowColor: "#000000",
        shadowOffset: {width: 0, height: 5},
        shadowOpacity: 0.24,
        shadowRadius: 8,
        elevation: 6,
    };

    return (
        <ImageBackground source={bg} style={tw`flex-1`}
                         imageStyle={visualMode === "sunset" ? tw`opacity-27` : tw`opacity-40`}>
            <View style={[tw`flex-1 bg-black/3 3`, {paddingHorizontal: 1}]}>
                <View style={tw`absolute inset-0 items-center justify-center`}>
                    <Text
                        style={[
                            tw`mb-117 text-3xl text-slate-300/7 tracking-[7px] p-1 rounded-lg`,
                            {fontFamily: fonts.display},
                        ]}
                    >
                        RHODIE
                    </Text>
                </View>
                <View style={tw`absolute right-4 top-4 z-20 items-end gap-2`}>
                    <Button
                        label="Sticky note"
                        onPress={() => setStickyNoteOpen(true)}
                        shine
                        style={[tw`rounded-full px-3 py-1.5`, stickyNoteButtonStyle]}
                        textStyle={[tw`text-[11px]`, {color: "#111111"}]}
                    />
                </View>
                <ScrollView
                    style={tw`flex-1`}
                    contentContainerStyle={tw`flex-grow justify-end px-4 pb-28 pt-24 gap-4`}
                    showsVerticalScrollIndicator={false}
                >
                    {showTutorial && onDismissTutorial ? (
                        <TutorialCard
                            title="Home is command center"
                            body="Tap cards to jump into Rhodie. use sticky notes for quick thoughts, tap Sunset/Overcast to change the mode."
                            onDismiss={onDismissTutorial}
                        />
                    ) : null}

                    <Pressable
                        onPress={() => onOpenJournalPrompt(latestPrompt?.id ?? null)}
                        style={({pressed}) => [
                            tw`rounded-3xl border border-[#F5DBC9]/33 bg-black/57 p-4`,
                            pressed && tw`opacity-85`,
                        ]}
                    >
                        <View style={tw`flex-row items-center justify-between`}>
                            <Text style={[tw`text-xs font-semibold`, {
                                fontFamily: fonts.body,
                                color: "rgba(228,224,212,0.6)"
                            }]}>Today
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
                    </Pressable>

                    <Pressable
                        onPress={onOpenWeeklyGoal}
                        style={({pressed}) => [
                            tw`rounded-3xl border border-[#F5DBC9]/33 bg-black/43 p-4`,
                            pressed && tw`opacity-85`,
                        ]}
                    >
                        <Text style={[tw`text-sm font-semibold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Weekly
                            goal</Text>
                        {weeklyGoal ? (
                            <>
                                <Text style={[tw`mt-2 text-base`, {fontFamily: fonts.body, color: "#E4E0D4"}]}
                                      numberOfLines={3}>
                                    {weeklyGoal.text}
                                </Text>
                                <Text
                                    style={[tw`mt-2 text-[11px] font-semibold text-slate-400`, {fontFamily: fonts.body}]}>
                                    Week of {weeklyGoal.weekStartDate}
                                </Text>
                                <Text
                                    style={[
                                        tw`mt-1 text-[11px] font-semibold`,
                                        {
                                            fontFamily: fonts.body,
                                            color: weeklyGoal.achievedAt ? "#B55941" : "rgba(228,224,212,0.68)"
                                        },
                                    ]}
                                >
                                    {weeklyGoal.achievedAt ? "Completed" : "Not completed"}
                                </Text>
                            </>
                        ) : (
                            <Text style={[tw`mt-2 text-sm text-slate-300`, {fontFamily: fonts.body}]}>Choose a weekly
                                goal from Calendar.</Text>
                        )}
                        <View style={tw`mt-3 flex-row items-center justify-between`}>
                            <Text style={[tw`text-xs text-slate-300`, {fontFamily: fonts.body}]}>
                                Points: {weeklyGoalProgress.points}
                            </Text>
                            <View style={tw`flex-row items-center`}>
                                <Image
                                    source={badgeIcon}
                                    resizeMode="contain"
                                    style={[
                                        tw`mr-1`,
                                        {
                                            width: 33,
                                            height: 24,
                                            tintColor: "#ba885a",
                                        },
                                    ]}
                                />
                                <Text style={[tw`text-xs text-slate-300`, {fontFamily: fonts.body}]}>
                                    Badges: {weeklyGoalProgress.badges}
                                </Text>
                            </View>
                        </View>
                    </Pressable>

                    <Pressable
                        onPress={() => onOpenGratitude(latestGratitude?.id ?? null)}
                        style={({pressed}) => [
                            tw`rounded-3xl border border-[#F5DBC9]/33 bg-black/43 p-4`,
                            pressed && tw`opacity-85`,
                        ]}
                    >
                        <Text
                            style={[tw`text-sm font-semibold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Gratitude</Text>
                        {latestGratitude ? (
                            <Text style={[tw`mt-2 text-base`, {fontFamily: fonts.body, color: "#E4E0D4"}]}
                                  numberOfLines={4}>
                                {latestGratitude.text}
                            </Text>
                        ) : (
                            <Text style={[tw`mt-2 text-sm text-slate-300`, {fontFamily: fonts.body}]}>No gratitude entry
                                yet for
                                today.</Text>
                        )}
                    </Pressable>

                    <Pressable
                        onPress={onOpenTasks}
                        style={({pressed}) => [
                            tw`mb-1 rounded-3xl border border-[#F5DBC9]/33 bg-black/39 p-4`,
                            pressed && tw`opacity-85`,
                        ]}
                    >
                        <View style={tw`flex-row items-center gap-2`}>
                            <SvgUri width={16} height={16} uri={tasksIconUri} fill="#E4E0D4" stroke="#E4E0D4"/>
                            <Text
                                style={[tw`text-sm font-semibold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>Tasks</Text>
                        </View>
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
                                        style={[tw`text-base`, {
                                            fontFamily: fonts.heading,
                                            color: "#E4E0D4"
                                        }]}>{task.title}</Text>
                                    {task.description ? (
                                        <Text style={[tw`mt-1 text-xs text-slate-300`, {fontFamily: fonts.body}]}
                                              numberOfLines={2}>
                                            {task.description}
                                        </Text>
                                    ) : null}
                                    <View style={tw`mt-2 flex-row items-center justify-between`}>
                                        <Text
                                            style={[tw`text-[11px] font-semibold text-[#E4E0D4]/80`, {fontFamily: fonts.body}]}>
                                            {statusLabel[task.status]}{task.dueTime ? ` • ${task.dueTime}` : ""}
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
                    </Pressable>
                </ScrollView>
                <StickyNoteModal
                    visible={stickyNoteOpen}
                    text={stickyNote.text}
                    onChangeText={onChangeStickyNote}
                    onAddToTask={() => {
                        onAddStickyNoteToTask();
                        setStickyNoteOpen(false);
                    }}
                    onClear={onClearStickyNote}
                    onClose={() => setStickyNoteOpen(false)}
                />
            </View>
        </ImageBackground>
    );
}
