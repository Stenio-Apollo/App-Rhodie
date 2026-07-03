import {useMemo, useState} from "react";
import {Image, Pressable, ScrollView, Text, View} from "react-native";
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
import {TranslucentCard} from "../components/TranslucentCard";
import {ScreenBackground} from "../components/ScreenBackground";

const GEORGIA_SURFACE_COLOR = "#111111";
const QUOTE_TOP_OFFSET = 57;
const QUOTE_MIN_CONTENT_GAP = 11;
const HOME_CONTENT_FALLBACK_TOP_PADDING = 168;

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
    const [quoteHeight, setQuoteHeight] = useState(0);
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

    const bg = visualMode === "georgia"
        ? require("../../public/images/rhhorse1.jpg")
        : require("../../public/images/rh14.jpg");
    const badgeIcon = require("../../public/images/badge.png");
    const stickyNoteIcon = require("../../public/images/notes (1).png");
    const tasksIconUri = Asset.fromModule(require("../../public/images/calendar.svg")).uri;
    const stickyNoteIconStyle = {
        shadowColor: "#000000",
        shadowOffset: {width: 0, height: 5},
        shadowOpacity: 0.24,
        shadowRadius: 8,
        elevation: 6,
    };
    const georgiaMode = visualMode === "georgia";
    const riverMode = visualMode === "river";
    const sonnyMode = visualMode === "sonny";
    const solidSurfaceColor = GEORGIA_SURFACE_COLOR;
    const solidMode = georgiaMode;
    const badgeColor = "#ba885a";
    const primaryTextColor = georgiaMode ? "#FFFFFF" : riverMode ? "#111111" : "#E4E0D4";
    const quoteHeaderTextColor = georgiaMode ? "#DAC8AE" : sonnyMode || riverMode ? badgeColor : primaryTextColor;
    const quoteBodyTextColor = primaryTextColor;
    const taskIconColor = georgiaMode ? "#DAC8AE" : riverMode ? badgeColor : primaryTextColor;
    const mutedTextColor = georgiaMode ? "rgba(255,255,255,0.74)" : riverMode ? "rgba(17,17,17,0.66)" : "rgba(228,224,212,0.68)";
    const secondaryTextClass = georgiaMode ? tw`text-white/70` : riverMode ? tw`text-black/70` : tw`text-slate-300`;
    const nestedItemStyle = riverMode || georgiaMode
        ? [
            tw`mt-2 rounded-2xl border px-3 py-2`,
            georgiaMode ? tw`border-white/10` : riverMode ? tw`border-black/10` : tw`border-slate-700/60`,
            {backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.24)"},
        ]
        : tw`mt-2 rounded-2xl border border-slate-700/60 bg-black/22 px-3 py-2`;
    const homeTaskGlowStyle = {
        shadowColor: badgeColor,
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.26,
        shadowRadius: 16,
        elevation: 9,
    };
    const calendarTaskShellStyle = {
        borderRadius: 20,
        shadowColor: badgeColor,
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.28,
        shadowRadius: 18,
        elevation: 10,
    };
    const calendarTaskCardStyle = sonnyMode
        ? {
            backgroundColor: "#000000",
            borderColor: "rgba(186,136,90,0.52)",
        }
        : null;
    const homeTaskItemStyle = [nestedItemStyle, homeTaskGlowStyle];
    const homeContentTopPadding = Math.max(
        HOME_CONTENT_FALLBACK_TOP_PADDING,
        Math.ceil(QUOTE_TOP_OFFSET + quoteHeight + QUOTE_MIN_CONTENT_GAP),
    );

    return (
        <ScreenBackground
            visualMode={visualMode}
            source={bg}
        >
            <View
                style={[
                    tw`flex-1`,
                    {paddingHorizontal: 1},
                ]}
            >
                <View style={tw`absolute right-4 top-4 z-20 items-end gap-2`}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Open sticky note"
                        onPress={() => setStickyNoteOpen(true)}
                        style={({pressed}) => [
                            tw`h-10 w-10 items-center justify-center`,
                            stickyNoteIconStyle,
                            pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                        ]}
                    >
                        <Image
                            source={stickyNoteIcon}
                            resizeMode="contain"
                            style={{width: 26, height: 26, tintColor: visualMode === "river" ? badgeColor : "#DAC8AE"}}
                        />
                    </Pressable>
                </View>
                <View pointerEvents="none"
                      style={tw`absolute left-4 right-4 top-6 z-10 flex-row items-center justify-between`}>
                    <Text style={[tw`text-xs font-semibold`, {
                        fontFamily: fonts.body,
                        color: georgiaMode ? "rgba(255,255,255,0.74)" : riverMode ? "rgba(17,17,17,0.62)" : badgeColor
                    }]}>Today • {today}</Text>
                    {profile?.birthday && isToday(profile.birthday) ? (
                        <Text style={[tw`text-xs font-semibold text-orange-200`, {fontFamily: fonts.body}]}>
                            Happy birthday!
                        </Text>
                    ) : null}
                </View>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open today's journal prompt"
                    onPress={() => onOpenJournalPrompt(latestPrompt?.id ?? null)}
                    onLayout={(event) => {
                        const nextHeight = event.nativeEvent.layout.height;
                        setQuoteHeight((current) => Math.abs(current - nextHeight) > 0.5 ? nextHeight : current);
                    }}
                    style={({pressed}) => [
                        tw`absolute left-4 right-4 top-[57px] z-10 items-center`,
                        pressed && tw`opacity-85`,
                    ]}
                >
                    <Text style={[tw`text-center px-4 py-1 text-lg font-semibold`, {
                        fontFamily: fonts.heading,
                        color: quoteHeaderTextColor
                    }]}>
                        QUOTE OF THE DAY
                    </Text>
                    <Text style={[tw`mt-3 pb-[7px] text-center text-lg leading-snug`, {
                        fontFamily: fonts.body,
                        color: quoteBodyTextColor
                    }]}
                          numberOfLines={3}>
                        {todaysQuote}
                    </Text>
                </Pressable>
                <ScrollView
                    style={[tw`flex-1`, {marginTop: homeContentTopPadding}]}
                    contentContainerStyle={[
                        tw`flex-grow justify-end px-4 pb-28 gap-4`,
                    ]}
                    bounces={false}
                    alwaysBounceVertical={false}
                    overScrollMode="never"
                    showsVerticalScrollIndicator={false}
                >
                    {showTutorial && onDismissTutorial ? (
                        <TutorialCard
                            title="Home"
                            body="Tap cards to jump in. Use sticky notes for quick thoughts."
                            onDismiss={onDismissTutorial}
                        />
                    ) : null}

                    <Pressable
                        onPress={onOpenWeeklyGoal}
                        style={({pressed}) => [pressed && tw`opacity-85`]}
                    >
                        <TranslucentCard radius={24} style={tw`p-4`}>
                            <Text style={[tw`text-sm font-semibold`, {
                                fontFamily: fonts.heading,
                                color: primaryTextColor
                            }]}>Weekly
                                goal</Text>
                            {weeklyGoal ? (
                                <>
                                    <Text
                                        style={[tw`mt-2 text-base`, {fontFamily: fonts.body, color: primaryTextColor}]}
                                        numberOfLines={3}>
                                        {weeklyGoal.text}
                                    </Text>
                                    <Text
                                        style={[tw`mt-2 text-[11px] font-semibold`, {
                                            fontFamily: fonts.body,
                                            color: mutedTextColor
                                        }]}>
                                        Week of {weeklyGoal.weekStartDate}
                                    </Text>
                                    <Text
                                        style={[
                                            tw`mt-1 text-[11px] font-semibold`,
                                            {
                                                fontFamily: fonts.body,
                                                color: weeklyGoal.achievedAt ? "#B55941" : mutedTextColor
                                            },
                                        ]}
                                    >
                                        {weeklyGoal.achievedAt ? "Completed" : "Not completed"}
                                    </Text>
                                </>
                            ) : (
                                <Text style={[tw`mt-2 text-sm`, secondaryTextClass, {fontFamily: fonts.body}]}>Choose a
                                    weekly
                                    goal from Calendar.</Text>
                            )}
                            <View style={tw`mt-3 flex-row items-center justify-between`}>
                                <Text style={[tw`text-xs`, secondaryTextClass, {fontFamily: fonts.body}]}>
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
                                                tintColor: badgeColor,
                                            },
                                        ]}
                                    />
                                    <Text style={[tw`text-xs`, secondaryTextClass, {fontFamily: fonts.body}]}>
                                        Badges: {weeklyGoalProgress.badges}
                                    </Text>
                                </View>
                            </View>
                        </TranslucentCard>
                    </Pressable>

                    <Pressable
                        onPress={() => onOpenGratitude(latestGratitude?.id ?? null)}
                        style={({pressed}) => [pressed && tw`opacity-85`]}
                    >
                        <TranslucentCard radius={24} style={tw`p-4`}>
                            <Text
                                style={[tw`text-sm font-semibold`, {
                                    fontFamily: fonts.heading,
                                    color: primaryTextColor
                                }]}>Gratitude</Text>
                            {latestGratitude ? (
                                <Text style={[tw`mt-2 text-base`, {fontFamily: fonts.body, color: primaryTextColor}]}
                                      numberOfLines={4}>
                                    {latestGratitude.text}
                                </Text>
                            ) : (
                                <Text style={[tw`mt-2 text-sm`, secondaryTextClass, {fontFamily: fonts.body}]}>No
                                    gratitude
                                    entry
                                    yet for
                                    today.</Text>
                            )}
                        </TranslucentCard>
                    </Pressable>

                    <Pressable
                        onPress={onOpenTasks}
                        style={({pressed}) => [tw`mb-1`, pressed && tw`opacity-85`]}
                    >
                        <TranslucentCard radius={24} style={tw`p-4`}>
                            <View style={tw`flex-row items-center gap-2`}>
                                <SvgUri width={16} height={16} uri={tasksIconUri} fill={taskIconColor}
                                        stroke={taskIconColor}/>
                                <Text
                                    style={[tw`text-sm font-semibold`, {
                                        fontFamily: fonts.heading,
                                        color: primaryTextColor
                                    }]}>Tasks</Text>
                            </View>
                            {dueToday.length === 0 ? (
                                <Text style={[tw`mt-2 text-sm`, secondaryTextClass, {fontFamily: fonts.body}]}>Nothing
                                    due
                                    today.</Text>
                            ) : (
                                dueToday.map((task) => {
                                    const taskContent = (
                                        <>
                                            <Text
                                                style={[tw`text-base`, {
                                                    fontFamily: fonts.heading,
                                                    color: primaryTextColor
                                                }]}>{task.title}</Text>
                                            {task.description ? (
                                                <Text
                                                    style={[tw`mt-1 text-xs`, secondaryTextClass, {fontFamily: fonts.body}]}
                                                    numberOfLines={2}>
                                                    {task.description}
                                                </Text>
                                            ) : null}
                                            <View style={tw`mt-2 flex-row items-center justify-between`}>
                                                <Text
                                                    style={[tw`text-[11px] font-semibold`, {
                                                        fontFamily: fonts.body,
                                                        color: georgiaMode ? "rgba(255,255,255,0.78)" : riverMode ? "rgba(17,17,17,0.72)" : "rgba(228,224,212,0.8)"
                                                    }]}>
                                                    {statusLabel[task.status]}{task.dueTime ? ` • ${task.dueTime}` : ""}
                                                </Text>
                                                {task.priority ? (
                                                    <Text
                                                        style={[
                                                            tw`text-[11px] font-semibold`,
                                                            {
                                                                fontFamily: fonts.body,
                                                                color: visualMode === "river" ? badgeColor : "#FDBA74",
                                                            },
                                                        ]}>
                                                        {task.priority} priority
                                                    </Text>
                                                ) : null}
                                            </View>
                                        </>
                                    );

                                    if (georgiaMode || sonnyMode || riverMode) {
                                        return (
                                            <View key={task.id} style={[tw`mt-2`, calendarTaskShellStyle]}>
                                                <TranslucentCard radius={16} style={[tw`p-3`, calendarTaskCardStyle]}>
                                                    {taskContent}
                                                </TranslucentCard>
                                            </View>
                                        );
                                    }

                                    return (
                                        <View key={task.id} style={homeTaskItemStyle}>
                                            {taskContent}
                                        </View>
                                    );
                                })
                            )}
                        </TranslucentCard>
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
        </ScreenBackground>
    );
}
