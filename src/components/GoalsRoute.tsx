import {forwardRef, useEffect, useState} from "react";
import {Image, Pressable, StyleSheet, Text, TextInput, View} from "react-native";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import {Input} from "./ui/Input";
import type {
    ArchivedWeeklyGoal,
    WeeklyGoal,
    WeeklyGoalPreset,
    WeeklyGoalProgress,
} from "../state/useWeeklyGoal";

const buttonDepthStyle = {
    shadowColor: "#000000",
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 6,
};

function ButtonShine() {
    return (
        <>
            <LinearGradient
                colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.01)", "rgba(0,0,0,0.14)"]}
                locations={[0, 0.48, 1]}
                pointerEvents="none"
                style={tw`absolute inset-0`}
            />
            <View
                pointerEvents="none"
                style={[
                    tw`absolute left-2 right-2 top-0.5 h-1 rounded-full`,
                    {backgroundColor: "rgba(255,255,255,0.035)"},
                ]}
            />
        </>
    );
}

function ProgressDots({filled, total}: {filled: number; total: number}) {
    return (
        <View style={tw`flex-row items-center gap-2`}>
            {Array.from({length: total}).map((_, index) => {
                const isFilled = index < filled;
                return (
                    <View
                        key={index}
                        style={[
                            tw`h-2.5 w-2.5 rounded-full`,
                            {
                                backgroundColor: isFilled ? "#B55941" : "rgba(228,224,212,0.18)",
                                borderWidth: 1,
                                borderColor: isFilled ? "#B55941" : "rgba(228,224,212,0.28)",
                            },
                        ]}
                    />
                );
            })}
        </View>
    );
}

const badgeIcon = require("../../public/images/badge.png");

interface GoalsRouteProps {
    weeklyGoal: WeeklyGoal | null;
    weeklyGoalProgress: WeeklyGoalProgress;
    weeklyGoalPresets: WeeklyGoalPreset[];
    customGoal: string;
    setCustomGoal: (value: string) => void;
    customGoalReady: boolean;
    isGoalLocked: boolean;
    goalSaveError: string | null;
    onSavePreset: (preset: WeeklyGoalPreset) => void;
    onSaveCustom: () => void;
    onMarkGoalAchieved: () => void;
    loadRecentAchievedGoals?: (limit?: number) => Promise<ArchivedWeeklyGoal[]>;
}

export const GoalsRoute = forwardRef<TextInput, GoalsRouteProps>(function GoalsRoute(
    {
        weeklyGoal,
        weeklyGoalProgress,
        weeklyGoalPresets,
        customGoal,
        setCustomGoal,
        customGoalReady,
        isGoalLocked,
        goalSaveError,
        onSavePreset,
        onSaveCustom,
        onMarkGoalAchieved,
        loadRecentAchievedGoals,
    },
    ref,
) {
    const [history, setHistory] = useState<ArchivedWeeklyGoal[]>([]);

    useEffect(() => {
        if (!loadRecentAchievedGoals) return;
        let cancelled = false;
        (async () => {
            const recent = await loadRecentAchievedGoals(4);
            if (cancelled) return;
            setHistory(recent);
        })();
        return () => {
            cancelled = true;
        };
    }, [loadRecentAchievedGoals, weeklyGoal?.achievedAt]);

    const filledForBadge = weeklyGoalProgress.points % 3;
    const pointsToNextBadge = 3 - filledForBadge;

    return (
        <>
            <Text
                style={[tw`self-center text-center text-2xl font-black text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                Goals
            </Text>
            <Text
                style={[tw`self-center text-center mt-1 text-sm text-slate-300`, {fontFamily: fonts.body}]}>
                Pick a focus for this week. Earn a point each time you hit it.
            </Text>

            <View style={tw`mt-4 overflow-hidden rounded-[28px] bg-black/10 p-1`}>
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
                        <View style={tw`rounded-2xl border border-[#F5DBC9]/22 bg-black/40 p-3`}>
                            <View style={tw`flex-row items-center justify-between`}>
                                <View style={tw`flex-1`}>
                                    <Text style={[tw`text-[10px] uppercase tracking-[1px]`, {
                                        fontFamily: fonts.strong,
                                        color: "rgba(228,224,212,0.55)",
                                    }]}>
                                        Your progress
                                    </Text>
                                    <Text style={[tw`mt-1 text-2xl`, {
                                        fontFamily: fonts.heading,
                                        color: "#E4E0D4",
                                    }]}>
                                        {weeklyGoalProgress.points} {weeklyGoalProgress.points === 1 ? "point" : "points"}
                                    </Text>
                                    <View style={tw`mt-2 flex-row items-center gap-2`}>
                                        <Image
                                            source={badgeIcon}
                                            resizeMode="contain"
                                            style={{width: 28, height: 20, tintColor: "#ba885a"}}
                                        />
                                        <Text style={[tw`text-xs`, {
                                            fontFamily: fonts.body,
                                            color: "#E4E0D4",
                                        }]}>
                                            {weeklyGoalProgress.badges} {weeklyGoalProgress.badges === 1 ? "badge" : "badges"} earned
                                        </Text>
                                    </View>
                                </View>
                                <View style={tw`items-end`}>
                                    <ProgressDots filled={filledForBadge} total={3}/>
                                    <Text style={[tw`mt-2 text-[10px]`, {
                                        fontFamily: fonts.body,
                                        color: "rgba(228,224,212,0.6)",
                                    }]}>
                                        {pointsToNextBadge} {pointsToNextBadge === 1 ? "point" : "points"} to next badge
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={tw`mt-4 flex-row items-start justify-between gap-3`}>
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
                            <View style={tw`mt-3 rounded-xl border border-[#2c2c2c] bg-black/35 px-3 py-3`}>
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
                                            day: "numeric",
                                        })}`
                                        : weeklyGoal.lastCheckedAt
                                            ? "Still in progress"
                                            : "Not checked yet"}
                                </Text>
                                {!weeklyGoal.achievedAt ? (
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel="Mark this week's goal as achieved"
                                        onPress={onMarkGoalAchieved}
                                        style={({pressed}) => [
                                            tw`mt-3 overflow-hidden rounded-xl px-3 py-2.5 items-center flex-row justify-center gap-2`,
                                            {backgroundColor: "#B55941", ...buttonDepthStyle},
                                            pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                                        ]}
                                    >
                                        <ButtonShine/>
                                        <Ionicons name="checkmark-circle-outline" size={16} color="#FFF6E8"/>
                                        <Text
                                            style={[tw`text-sm font-bold text-[#FFF6E8]`, {fontFamily: fonts.heading}]}>
                                            Mark as achieved
                                        </Text>
                                    </Pressable>
                                ) : null}
                            </View>
                        ) : null}

                        <Text style={[tw`mt-4 text-[10px] uppercase tracking-[1px]`, {
                            fontFamily: fonts.strong,
                            color: "rgba(228,224,212,0.55)",
                        }]}>
                            Suggested goals
                        </Text>
                        <View style={tw`mt-2 gap-2`}>
                            {weeklyGoalPresets.map((preset) => {
                                const selected = weeklyGoal?.presetId === preset.id;
                                return (
                                    <Pressable
                                        key={preset.id}
                                        disabled={isGoalLocked}
                                        onPress={() => {
                                            if (isGoalLocked) return;
                                            haptics.selection();
                                            onSavePreset(preset);
                                        }}
                                        style={({pressed}) => [
                                            tw`overflow-hidden rounded-xl border px-3 py-3 flex-row items-center gap-3`,
                                            selected
                                                ? {
                                                    borderColor: "#B55941",
                                                    backgroundColor: "rgba(181,89,65,0.18)",
                                                }
                                                : {
                                                    borderColor: "#2c2c2c",
                                                    backgroundColor: "rgba(0,0,0,0.35)",
                                                },
                                            buttonDepthStyle,
                                            isGoalLocked && tw`opacity-45`,
                                            pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                                        ]}
                                    >
                                        <ButtonShine/>
                                        <View style={[
                                            tw`h-10 w-10 items-center justify-center rounded-full`,
                                            {backgroundColor: selected ? "rgba(181,89,65,0.42)" : "rgba(228,224,212,0.08)"},
                                        ]}>
                                            <Ionicons
                                                name={(preset.icon ?? "flag-outline") as React.ComponentProps<typeof Ionicons>["name"]}
                                                size={20}
                                                color={selected ? "#FFF6E8" : "#E4E0D4"}
                                            />
                                        </View>
                                        <View style={tw`flex-1`}>
                                            <View style={tw`flex-row items-center justify-between gap-2`}>
                                                <Text
                                                    style={[tw`text-sm font-bold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                                    {preset.title}
                                                </Text>
                                                {preset.category ? (
                                                    <Text style={[tw`text-[9px] uppercase tracking-[1px]`, {
                                                        fontFamily: fonts.strong,
                                                        color: "rgba(228,224,212,0.55)",
                                                    }]}>
                                                        {preset.category}
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <Text
                                                style={[tw`mt-1 text-[11px] leading-4 text-slate-300`, {fontFamily: fonts.body}]}>
                                                {preset.description}
                                            </Text>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <View style={tw`mt-4`}>
                            <Text style={[tw`text-[10px] uppercase tracking-[1px]`, {
                                fontFamily: fonts.strong,
                                color: "rgba(228,224,212,0.55)",
                            }]}>
                                Or write your own
                            </Text>
                            {goalSaveError ? (
                                <Text
                                    style={[tw`mt-2 text-xs font-bold text-red-200`, {fontFamily: fonts.body}]}>
                                    {goalSaveError}
                                </Text>
                            ) : null}
                            <Input
                                ref={ref}
                                value={customGoal}
                                onChangeText={setCustomGoal}
                                placeholder="What will you focus on this week?"
                                returnKeyType="done"
                                maxLength={120}
                                editable={!isGoalLocked}
                                style={tw`mt-2`}
                            />
                            <Pressable
                                disabled={!customGoalReady || isGoalLocked}
                                onPress={() => {
                                    if (!customGoalReady || isGoalLocked) return;
                                    haptics.selection();
                                    onSaveCustom();
                                }}
                                style={({pressed}) => [
                                    tw`mt-2 overflow-hidden rounded-xl px-3 py-2.5 items-center`,
                                    {backgroundColor: "#B55941", ...buttonDepthStyle},
                                    (!customGoalReady || isGoalLocked) && tw`opacity-50`,
                                    pressed && customGoalReady && !isGoalLocked
                                        ? {opacity: 0.78, transform: [{translateY: 1}]}
                                        : null,
                                ]}
                            >
                                <ButtonShine/>
                                <Text
                                    style={[tw`text-sm font-bold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                    Use custom goal
                                </Text>
                            </Pressable>
                        </View>

                        {history.length > 0 ? (
                            <View style={tw`mt-4`}>
                                <Text style={[tw`text-[10px] uppercase tracking-[1px]`, {
                                    fontFamily: fonts.strong,
                                    color: "rgba(228,224,212,0.55)",
                                }]}>
                                    Recent wins
                                </Text>
                                <View style={tw`mt-2 gap-2`}>
                                    {history.map((archived) => (
                                        <View
                                            key={`${archived.weekStartDate}-${archived.achievedAt}`}
                                            style={tw`rounded-xl border border-[#2c2c2c] bg-black/35 px-3 py-2`}
                                        >
                                            <View style={tw`flex-row items-center justify-between`}>
                                                <Text style={[tw`text-[10px] uppercase tracking-[1px]`, {
                                                    fontFamily: fonts.strong,
                                                    color: "rgba(228,224,212,0.55)",
                                                }]}>
                                                    Week of {archived.weekStartDate}
                                                </Text>
                                                <Ionicons name="trophy-outline" size={14} color="#ba885a"/>
                                            </View>
                                            <Text
                                                style={[tw`mt-1 text-sm text-[#E4E0D4]`, {fontFamily: fonts.heading}]}
                                                numberOfLines={2}
                                            >
                                                {archived.text}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ) : null}
                    </View>
                </BlurView>
            </View>
        </>
    );
});
