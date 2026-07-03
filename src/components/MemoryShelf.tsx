import {useMemo, useState} from "react";
import {Pressable, StyleSheet, Text, TextInput, View} from "react-native";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import {toLocalISODate} from "../lib/date-utils";
import {getDailyJournalPrompt} from "../lib/prompts";
import type {JournalEntry, JournalState} from "../state/useJournal";
import {useScreenVisualMode} from "./ScreenBackground";

type CategoryFilter = "all" | "prompt" | "gratitude";

const ACCENT = "#FF3800";
const SONNY_ACCENT = "#FF3800";
const DARK_BADGE_COLOR = "#ba885a";
const COAST_BADGE_COLOR = DARK_BADGE_COLOR;
const CREAM = "#F0F8FF";
const TEXT_PRIMARY = "#E4E0D4";
const COAST_SURFACE_COLOR = "#708090";
const GEORGIA_SURFACE_COLOR = "#111111";
const GEORGIA_FROST_SURFACE_COLOR = "rgba(0,0,0,0.28)";
const GEORGIA_FROST_PANEL_COLOR = "rgba(0,0,0,0.32)";
const GEORGIA_FROST_BORDER_COLOR = "rgba(255,255,255,0.22)";

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

interface MemoryShelfProps {
    journal: JournalState;
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    editingId: string | null;
    setEditingId: (id: string | null) => void;
    editingText: string;
    setEditingText: (text: string) => void;
}

function shiftDateString(iso: string, deltaDays: number): string {
    const [year, month, day] = iso.split("-").map(Number);
    const date = new Date(year, (month ?? 1) - 1, day ?? 1);
    date.setDate(date.getDate() + deltaDays);
    return toLocalISODate(date);
}

function computeStreak(uniqueDatesDescending: string[]): number {
    if (uniqueDatesDescending.length === 0) return 0;
    const today = toLocalISODate();
    const yesterday = shiftDateString(today, -1);
    const dateSet = new Set(uniqueDatesDescending);
    if (!dateSet.has(today) && !dateSet.has(yesterday)) return 0;
    let cursor = dateSet.has(today) ? today : yesterday;
    let streak = 0;
    while (dateSet.has(cursor)) {
        streak += 1;
        cursor = shiftDateString(cursor, -1);
    }
    return streak;
}

function formatLookbackLabel(deltaDays: number): string {
    if (deltaDays === 7) return "A week ago";
    if (deltaDays === 30) return "A month ago";
    if (deltaDays === 90) return "Three months ago";
    if (deltaDays === 180) return "Half a year ago";
    if (deltaDays === 365) return "A year ago";
    return `${deltaDays} days ago`;
}

function StatPill({label, value}: {label: string; value: string | number}) {
    const visualMode = useScreenVisualMode();
    const coastMode = visualMode === "coast";
    const georgiaMode = visualMode === "georgia";
    const solidSurfaceColor = georgiaMode ? GEORGIA_SURFACE_COLOR : COAST_SURFACE_COLOR;
    const coastOrRiver = visualMode === "river" || coastMode;
    const borderColor = georgiaMode ? GEORGIA_FROST_BORDER_COLOR : coastOrRiver ? "rgba(17,17,17,0.14)" : "rgba(245,219,201,0.22)";
    const backgroundColor = coastMode ? solidSurfaceColor : georgiaMode ? GEORGIA_FROST_PANEL_COLOR : coastOrRiver ? "rgba(255,255,255,0.34)" : "rgba(0,0,0,0.4)";
    return (
        <View
            style={[
                tw`flex-1 overflow-hidden rounded-2xl border px-3 py-2.5`,
                {
                    borderColor,
                    backgroundColor,
                    ...buttonDepthStyle,
                },
            ]}
        >
            <ButtonShine/>
            <Text style={[tw`text-[10px] uppercase tracking-[1px]`, {
                fontFamily: fonts.strong,
                color: georgiaMode ? "rgba(255,255,255,0.65)" : coastOrRiver ? "rgba(17,17,17,0.55)" : "rgba(228,224,212,0.55)",
            }]}>
                {label}
            </Text>
            <Text style={[tw`mt-1 text-lg`, {fontFamily: fonts.heading, color: georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : TEXT_PRIMARY}]}>
                {value}
            </Text>
        </View>
    );
}

function FilterChip({
                        label,
                        active,
                        onPress,
                    }: {
    label: string;
    active: boolean;
    onPress: () => void;
}) {
    const visualMode = useScreenVisualMode();
    const coastMode = visualMode === "coast";
    const georgiaMode = visualMode === "georgia";
    const solidSurfaceColor = georgiaMode ? GEORGIA_SURFACE_COLOR : COAST_SURFACE_COLOR;
    const coastOrRiver = visualMode === "river" || coastMode;
    const accentColor = visualMode === "sonny" ? SONNY_ACCENT : ACCENT;
    const accentBorderColor = visualMode === "sonny" ? "#CB0000" : "#C82D00";
    const inactiveBorderColor = georgiaMode ? GEORGIA_FROST_BORDER_COLOR : coastOrRiver ? "rgba(17,17,17,0.14)" : "rgba(223,196,170,0.28)";
    const inactiveBackgroundColor = coastMode ? solidSurfaceColor : georgiaMode ? GEORGIA_FROST_PANEL_COLOR : coastOrRiver ? "rgba(255,255,255,0.78)" : "rgba(15,15,15,0.85)";
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Filter ${label}`}
            onPress={() => {
                haptics.selection();
                onPress();
            }}
            style={({pressed}) => [
                tw`overflow-hidden rounded-full border px-3.5 py-1.5`,
                active
                    ? {borderColor: coastOrRiver ? "#C82D00" : visualMode === "sonny" ? accentBorderColor : CREAM, backgroundColor: coastOrRiver ? "#FF3800" : visualMode === "sonny" ? accentColor : CREAM, ...buttonDepthStyle}
                    : {
                        borderColor: inactiveBorderColor,
                        backgroundColor: inactiveBackgroundColor,
                        ...buttonDepthStyle,
                    },
                pressed && {opacity: 0.78, transform: [{translateY: 1}]},
            ]}
        >
            <ButtonShine/>
            <Text style={[tw`text-[11px] font-semibold`, {
                fontFamily: fonts.strong,
                color: georgiaMode ? (active ? "#111111" : "#FFFFFF") : active ? (coastOrRiver || visualMode === "sonny" ? "#FFF6E8" : "#0f0f0f") : coastOrRiver ? "#111111" : CREAM,
            }]}>
                {label}
            </Text>
        </Pressable>
    );
}

function EntryCard({
                       entry,
                       isEditing,
                       editingText,
                       setEditingText,
                       onStartEdit,
                       onCancelEdit,
                       onSaveEdit,
                       onDelete,
                   }: {
    entry: JournalEntry;
    isEditing: boolean;
    editingText: string;
    setEditingText: (text: string) => void;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSaveEdit: () => void;
    onDelete: () => void;
}) {
    const isPrompt = entry.category === "prompt";
    const entryPrompt = isPrompt ? getDailyJournalPrompt(entry.date) : null;
    const visualMode = useScreenVisualMode();
    const coastMode = visualMode === "coast";
    const georgiaMode = visualMode === "georgia";
    const solidSurfaceColor = georgiaMode ? GEORGIA_SURFACE_COLOR : COAST_SURFACE_COLOR;
    const coastOrRiver = visualMode === "river" || coastMode;
    const badgeColor = georgiaMode ? "#DAC8AE" : coastOrRiver ? COAST_BADGE_COLOR : DARK_BADGE_COLOR;
    const cardBorderColor = georgiaMode ? GEORGIA_FROST_BORDER_COLOR : coastOrRiver ? "rgba(17,17,17,0.14)" : "rgba(223,196,170,0.28)";
    const cardBackgroundColor = coastMode ? solidSurfaceColor : georgiaMode ? GEORGIA_FROST_PANEL_COLOR : coastOrRiver ? "rgba(255,255,255,0.34)" : "rgba(0,0,0,0.35)";
    const primaryTextColor = georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : TEXT_PRIMARY;
    const secondaryTextColor = georgiaMode ? "rgba(255,255,255,0.7)" : coastOrRiver ? "rgba(17,17,17,0.68)" : "rgba(228,224,212,0.58)";
    return (
        <View
            style={[
                tw`overflow-hidden rounded-2xl border p-4`,
                {
                    borderColor: cardBorderColor,
                    backgroundColor: cardBackgroundColor,
                    ...buttonDepthStyle,
                },
            ]}
        >
            <ButtonShine/>
            <View style={tw`flex-row items-center justify-between`}>
                <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : CREAM}]}>
                    {entry.date}
                </Text>
                <View
                    style={[
                        tw`rounded-full border px-3 py-1`,
                        {borderColor: badgeColor, backgroundColor: badgeColor},
                    ]}
                >
                    <Text style={[tw`text-[10px] tracking-[1px]`, {
                        fontFamily: fonts.strong,
                        color: "#0f0f0f",
                    }]}>
                        {isPrompt ? "PROMPT" : "GRATITUDE"}
                    </Text>
                </View>
            </View>
            <Text style={[tw`mt-2 text-[11px]`, {
                fontFamily: fonts.body,
                color: secondaryTextColor,
            }]}>
                {new Date(entry.createdAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                })}
            </Text>
            {entryPrompt ? (
                <View style={[tw`mt-3 rounded-xl border p-3`, {borderColor: cardBorderColor}]}>
                    <Text style={[tw`text-[10px] uppercase tracking-[1px]`, {fontFamily: fonts.strong, color: georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : CREAM}]}>
                        Prompt responded to
                    </Text>
                    <Text
                        style={[tw`mt-1 text-sm leading-5`, {fontFamily: fonts.body, color: primaryTextColor}]}
                        numberOfLines={4}
                    >
                        {entryPrompt}
                    </Text>
                </View>
            ) : null}
            {isEditing ? (
                <TextInput
                    value={editingText}
                    onChangeText={setEditingText}
                    keyboardAppearance={visualMode === "river" ? "light" : "dark"}
                    multiline
                    style={[
                        georgiaMode ? [tw`mt-3 rounded-xl border px-3 py-2`, {borderColor: GEORGIA_FROST_BORDER_COLOR, backgroundColor: "rgba(255,255,255,0.08)"}] : coastOrRiver ? [tw`mt-3 rounded-xl border border-black/10 px-3 py-2`, {backgroundColor: coastMode ? solidSurfaceColor : "rgba(255,255,255,0.34)"}] : tw`mt-3 rounded-xl border border-[#2c2c2c] bg-[#0a0a0a] px-3 py-2`,
                        {fontFamily: fonts.body, color: primaryTextColor},
                    ]}
                />
            ) : (
                <Text
                    style={[tw`mt-3 text-sm leading-5`, {
                        fontFamily: fonts.body,
                        color: primaryTextColor,
                    }]}
                    numberOfLines={5}
                >
                    {entry.text}
                </Text>
            )}
            <View style={tw`mt-3 flex-row items-center justify-between`}>
                <Text style={[tw`text-[11px] font-semibold`, {fontFamily: fonts.body, color: georgiaMode ? "rgba(255,255,255,0.65)" : coastOrRiver ? "rgba(17,17,17,0.55)" : "rgba(228,224,212,0.55)"}]}>
                    {new Date(entry.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </Text>
                {isEditing ? (
                    <View style={tw`flex-row gap-2`}>
                        <ActionPill label="Cancel" onPress={onCancelEdit}/>
                        <ActionPill label="Save" onPress={onSaveEdit} accent/>
                    </View>
                ) : (
                    <View style={tw`flex-row gap-2`}>
                        <ActionPill label="Edit" icon="create-outline" onPress={onStartEdit}/>
                        <ActionPill label="Delete" icon="trash-outline" onPress={onDelete}/>
                    </View>
                )}
            </View>
        </View>
    );
}

function ActionPill({
                        label,
                        icon,
                        onPress,
                        accent = false,
                    }: {
    label: string;
    icon?: React.ComponentProps<typeof Ionicons>["name"];
    onPress: () => void;
    accent?: boolean;
}) {
    const visualMode = useScreenVisualMode();
    const coastMode = visualMode === "coast";
    const georgiaMode = visualMode === "georgia";
    const solidSurfaceColor = georgiaMode ? GEORGIA_SURFACE_COLOR : COAST_SURFACE_COLOR;
    const coastOrRiver = visualMode === "river" || coastMode;
    const accentColor = visualMode === "sonny" ? SONNY_ACCENT : ACCENT;
    const accentBorderColor = visualMode === "sonny" ? "#CB0000" : ACCENT;
    const inactiveBorderColor = georgiaMode ? GEORGIA_FROST_BORDER_COLOR : coastOrRiver ? "rgba(17,17,17,0.14)" : "rgba(223,196,170,0.42)";
    const inactiveBackgroundColor = coastMode ? solidSurfaceColor : georgiaMode ? GEORGIA_FROST_PANEL_COLOR : coastOrRiver ? "rgba(255,255,255,0.34)" : "rgba(0,0,0,0.4)";
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => {
                haptics.selection();
                onPress();
            }}
            style={({pressed}) => [
                tw`overflow-hidden rounded-lg border px-3 py-1.5 flex-row items-center gap-1`,
                accent
                    ? {borderColor: coastOrRiver ? "#C82D00" : accentBorderColor, backgroundColor: coastOrRiver ? "#FF3800" : accentColor, ...buttonDepthStyle}
                    : {
                        borderColor: inactiveBorderColor,
                        backgroundColor: inactiveBackgroundColor,
                        ...buttonDepthStyle,
                    },
                pressed && {opacity: 0.78, transform: [{translateY: 1}]},
            ]}
        >
            <ButtonShine/>
            {icon ? (
                <Ionicons name={icon} size={12} color={georgiaMode ? "#FFFFFF" : accent ? "#FFF6E8" : coastOrRiver ? "#111111" : CREAM}/>
            ) : null}
            <Text style={[tw`text-[11px] font-semibold`, {
                fontFamily: fonts.strong,
                color: georgiaMode ? "#FFFFFF" : accent ? "#FFF6E8" : coastOrRiver ? "#111111" : CREAM,
            }]}>
                {label}
            </Text>
        </Pressable>
    );
}

export function MemoryShelf({
                                journal,
                                selectedDate,
                                setSelectedDate,
                                editingId,
                                setEditingId,
                                editingText,
                                setEditingText,
                            }: MemoryShelfProps) {
    const {entries, byDate, deleteEntry, editEntry} = journal;
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
    const [scopeToDate, setScopeToDate] = useState<boolean>(() => Boolean(editingId));

    const today = toLocalISODate();

    const uniqueDatesDescending = useMemo(
        () => [...new Set(entries.map((entry) => entry.date))].sort((a, b) => (a > b ? -1 : 1)),
        [entries],
    );

    const stats = useMemo(() => {
        const promptCount = entries.filter((e) => e.category === "prompt").length;
        const gratitudeCount = entries.filter((e) => e.category === "gratitude").length;
        const thisMonthPrefix = today.slice(0, 7);
        const monthDays = new Set(
            entries
                .filter((entry) => entry.date.startsWith(thisMonthPrefix))
                .map((entry) => entry.date),
        );
        return {
            total: entries.length,
            promptCount,
            gratitudeCount,
            streak: computeStreak(uniqueDatesDescending),
            monthDays: monthDays.size,
        };
    }, [entries, today, uniqueDatesDescending]);

    const lookback = useMemo(() => {
        return [7, 30, 90, 180, 365]
            .map((delta) => {
                const date = shiftDateString(today, -delta);
                const dayEntries = byDate[date] ?? [];
                if (dayEntries.length === 0) return null;
                return {delta, date, count: dayEntries.length, sample: dayEntries[0]};
            })
            .filter((item): item is {delta: number; date: string; count: number; sample: JournalEntry} => Boolean(item))
            .slice(0, 3);
    }, [byDate, today]);

    const visibleEntries = useMemo(() => {
        let pool = entries;
        if (scopeToDate) {
            pool = pool.filter((entry) => entry.date === selectedDate);
        }
        if (categoryFilter !== "all") {
            pool = pool.filter((entry) => entry.category === categoryFilter);
        }
        const term = searchTerm.trim().toLowerCase();
        if (term) {
            pool = pool.filter((entry) => entry.text.toLowerCase().includes(term));
        }
        return [...pool].sort((a, b) => {
            if (a.date !== b.date) return a.date > b.date ? -1 : 1;
            return b.createdAt.localeCompare(a.createdAt);
        });
    }, [categoryFilter, entries, scopeToDate, searchTerm, selectedDate]);

    function handleSelectDate(date: string) {
        haptics.selection();
        setSelectedDate(date);
        setScopeToDate(true);
    }

    function handleClearDateScope() {
        haptics.navigation();
        setScopeToDate(false);
    }

    function handleSurpriseMe() {
        if (entries.length === 0) return;
        haptics.selection();
        const random = entries[Math.floor(Math.random() * entries.length)];
        setSelectedDate(random.date);
        setScopeToDate(true);
    }

    const hasAnyEntries = entries.length > 0;
    const isFiltered = Boolean(searchTerm.trim()) || categoryFilter !== "all" || scopeToDate;
    const visualMode = useScreenVisualMode();
    const coastMode = visualMode === "coast";
    const georgiaMode = visualMode === "georgia";
    const solidSurfaceColor = georgiaMode ? GEORGIA_SURFACE_COLOR : COAST_SURFACE_COLOR;
    const solidMode = coastMode || georgiaMode;
    const coastOrRiver = visualMode === "river" || coastMode;
    const sonnyMode = visualMode === "sonny";
    const accentColor = sonnyMode ? SONNY_ACCENT : coastOrRiver ? "#FF3800" : ACCENT;
    const primaryTextColor = georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : TEXT_PRIMARY;
    const secondaryTextColor = georgiaMode ? "rgba(255,255,255,0.7)" : coastOrRiver ? "rgba(17,17,17,0.68)" : "rgba(228,224,212,0.7)";
    const mutedTextColor = georgiaMode ? "rgba(255,255,255,0.65)" : coastOrRiver ? "rgba(17,17,17,0.55)" : "rgba(228,224,212,0.55)";
    const panelBorderColor = georgiaMode ? GEORGIA_FROST_BORDER_COLOR : coastOrRiver ? "rgba(17,17,17,0.14)" : "#2c2c2c";
    const panelBackgroundColor = coastMode ? solidSurfaceColor : georgiaMode ? GEORGIA_FROST_PANEL_COLOR : coastOrRiver ? "rgba(255,255,255,0.34)" : "rgba(0,0,0,0.4)";
    const shellBackgroundColor = coastMode ? solidSurfaceColor : georgiaMode ? "rgba(0,0,0,0.12)" : coastOrRiver ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)";
    const blurSurfaceColor = coastMode ? solidSurfaceColor : georgiaMode ? GEORGIA_FROST_SURFACE_COLOR : coastOrRiver ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.77)";
    const blurBorderColor = georgiaMode ? GEORGIA_FROST_BORDER_COLOR : coastOrRiver ? "rgba(17,17,17,0.14)" : "#334155";

    return (
        <View
            style={[
                tw`overflow-hidden rounded-[28px] p-1`,
                {backgroundColor: shellBackgroundColor},
            ]}
        >
            <BlurView
                intensity={72}
                tint={coastOrRiver ? "light" : "dark"}
                style={[
                    tw`overflow-hidden rounded-[24px] border`,
                    {borderColor: blurBorderColor},
                ]}
            >
                <View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, {backgroundColor: blurSurfaceColor}]}
                />
                <LinearGradient
                    colors={coastMode || georgiaMode ? ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)", "transparent"] : coastOrRiver ? ["rgba(255,255,255,0.32)", "rgba(255,255,255,0.04)", "transparent"] : ["rgba(255,255,255,0.04)", "rgba(255,255,255,0.02)", "transparent"]}
                    locations={[0, 0.5, 1]}
                    pointerEvents="none"
                    style={[tw`absolute left-0 right-0 top-0`, {height: "45%"}]}
                />
                <LinearGradient
                    colors={solidMode ? ["transparent", "rgba(0,0,0,0.1)"] : coastOrRiver ? ["transparent", "rgba(223,196,170,0.16)"] : ["transparent", "rgba(0,0,0,0.35)"]}
                    pointerEvents="none"
                    style={[tw`absolute left-0 right-0 bottom-0`, {height: "28%"}]}
                />

                <View style={tw`p-3`}>
                    <View style={tw`flex-row items-center justify-between`}>
                        <View style={tw`flex-1`}>
                            <Text style={[tw`text-base font-bold`, {fontFamily: fonts.heading, color: primaryTextColor}]}>
                                Memory shelf
                            </Text>
                            <Text style={[tw`mt-1 text-xs`, {
                                fontFamily: fonts.body,
                                color: secondaryTextColor,
                            }]}>
                                Search, revisit, and reflect on what you've written.
                            </Text>
                        </View>
                        {hasAnyEntries ? (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Surprise me with a random memory"
                                onPress={handleSurpriseMe}
                                style={({pressed}) => [
                                    tw`overflow-hidden flex-row items-center gap-1 rounded-full border px-3 py-2`,
                                    {borderColor: accentColor, backgroundColor: accentColor, ...buttonDepthStyle},
                                    pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                                ]}
                            >
                                <ButtonShine/>
                                <Ionicons name="shuffle" size={14} color={georgiaMode ? "#FFFFFF" : "#FFF6E8"}/>
                                <Text style={[tw`text-[11px] font-semibold`, {
                                    fontFamily: fonts.strong,
                                    color: georgiaMode ? "#FFFFFF" : "#FFF6E8",
                                }]}>
                                    Surprise me
                                </Text>
                            </Pressable>
                        ) : null}
                    </View>

                    {hasAnyEntries ? (
                        <>
                            <View style={tw`mt-4 flex-row gap-2`}>
                                <StatPill label="Entries" value={stats.total}/>
                                <StatPill label="Streak" value={`${stats.streak}d`}/>
                                <StatPill label="This month" value={`${stats.monthDays}d`}/>
                            </View>

                            <View style={tw`mt-2 flex-row gap-2`}>
                                <StatPill label="Prompts" value={stats.promptCount}/>
                                <StatPill label="Gratitudes" value={stats.gratitudeCount}/>
                            </View>

                            <View
                                style={[
                                    tw`mt-4 overflow-hidden flex-row items-center gap-2 rounded-2xl border px-3 py-2.5`,
                                    {borderColor: panelBorderColor, backgroundColor: panelBackgroundColor, ...buttonDepthStyle},
                                ]}
                            >
                                <ButtonShine/>
                                <Ionicons name="search" size={16} color={georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : CREAM}/>
                                <TextInput
                                    value={searchTerm}
                                    onChangeText={setSearchTerm}
                                    placeholder="Search your entries"
                                    placeholderTextColor={georgiaMode ? "rgba(255,255,255,0.5)" : coastOrRiver ? "rgba(17,17,17,0.45)" : "rgba(228,224,212,0.5)"}
                                    keyboardAppearance={visualMode === "river" ? "light" : "dark"}
                                    returnKeyType="search"
                                    style={[tw`flex-1 text-sm`, {fontFamily: fonts.body, color: primaryTextColor}]}
                                />
                                {searchTerm.length > 0 ? (
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel="Clear search"
                                        onPress={() => setSearchTerm("")}
                                        hitSlop={8}
                                    >
                                        <Ionicons name="close-circle" size={16} color={georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : CREAM}/>
                                    </Pressable>
                                ) : null}
                            </View>

                            <View style={tw`mt-3 flex-row flex-wrap gap-2`}>
                                <FilterChip label="All" active={categoryFilter === "all"} onPress={() => setCategoryFilter("all")}/>
                                <FilterChip label="Prompts" active={categoryFilter === "prompt"} onPress={() => setCategoryFilter("prompt")}/>
                                <FilterChip label="Gratitude" active={categoryFilter === "gratitude"} onPress={() => setCategoryFilter("gratitude")}/>
                            </View>

                            <View
                                style={[
                                    tw`mt-4 overflow-hidden rounded-2xl border p-3`,
                                    {borderColor: panelBorderColor, backgroundColor: panelBackgroundColor, ...buttonDepthStyle},
                                ]}
                            >
                                <ButtonShine/>
                                <View style={tw`flex-row items-center justify-between`}>
                                    <Text style={[tw`text-[10px] uppercase tracking-[1px]`, {
                                        fontFamily: fonts.strong,
                                        color: mutedTextColor,
                                    }]}>
                                        Recent days
                                    </Text>
                                    {scopeToDate ? (
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel="Show all dates"
                                            onPress={handleClearDateScope}
                                            style={({pressed}) => [
                                                tw`overflow-hidden rounded-full border px-3 py-1`,
                                                {borderColor: coastOrRiver ? "rgba(17,17,17,0.14)" : CREAM, backgroundColor: panelBackgroundColor},
                                                pressed && {opacity: 0.78},
                                            ]}
                                        >
                                            <Text style={[tw`text-[10px] font-semibold`, {
                                                fontFamily: fonts.strong,
                                                color: georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : CREAM,
                                            }]}>
                                                Show all dates
                                            </Text>
                                        </Pressable>
                                    ) : null}
                                </View>
                                <View style={tw`mt-2 flex-row flex-wrap gap-2`}>
                                    {uniqueDatesDescending.slice(0, 7).map((date) => {
                                        const isSelected = scopeToDate && date === selectedDate;
                                        const isToday = date === today;
                                        return (
                                            <Pressable
                                                key={date}
                                                accessibilityRole="button"
                                                accessibilityLabel={`View entries from ${date}`}
                                                onPress={() => handleSelectDate(date)}
                                                style={({pressed}) => [
                                                    tw`overflow-hidden rounded-full border px-3 py-1.5`,
                                                    isSelected
                                                        ? {borderColor: accentColor, backgroundColor: coastOrRiver ? "rgba(255,56,0,0.12)" : "rgba(255,56,0,0.42)", ...buttonDepthStyle}
                                                        : {borderColor: coastOrRiver ? "rgba(17,17,17,0.14)" : "rgba(223,196,170,0.32)", backgroundColor: panelBackgroundColor, ...buttonDepthStyle},
                                                    pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                                                ]}
                                            >
                                                <ButtonShine/>
                                                <Text style={[tw`text-[11px] font-semibold`, {
                                                    fontFamily: fonts.strong,
                                                    color: georgiaMode ? (isSelected ? "#111111" : "#FFFFFF") : isSelected ? (coastOrRiver ? accentColor : "#FFF6E8") : coastOrRiver ? "#111111" : CREAM,
                                                }]}>
                                                    {isToday ? `${date} • today` : date}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>

                            {lookback.length > 0 ? (
                                <View style={tw`mt-4`}>
                                    <Text style={[tw`text-[10px] uppercase tracking-[1px]`, {
                                        fontFamily: fonts.strong,
                                        color: mutedTextColor,
                                    }]}>
                                        Looking back
                                    </Text>
                                    <View style={tw`mt-2 gap-2`}>
                                        {lookback.map((item) => (
                                            <Pressable
                                                key={item.date}
                                                accessibilityRole="button"
                                                accessibilityLabel={`View entries from ${formatLookbackLabel(item.delta)}`}
                                                onPress={() => handleSelectDate(item.date)}
                                                style={({pressed}) => [
                                                    tw`overflow-hidden rounded-2xl border px-3 py-3`,
                                                    {borderColor: panelBorderColor, backgroundColor: panelBackgroundColor, ...buttonDepthStyle},
                                                    pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                                                ]}
                                            >
                                                <ButtonShine/>
                                                <View style={tw`flex-row items-center justify-between`}>
                                                    <View style={tw`flex-row items-center gap-1.5`}>
                                                        <Ionicons name="time-outline" size={12} color={accentColor}/>
                                                        <Text style={[tw`text-[10px] uppercase tracking-[1px]`, {
                                                            fontFamily: fonts.strong,
                                                            color: mutedTextColor,
                                                        }]}>
                                                            {formatLookbackLabel(item.delta)}
                                                        </Text>
                                                    </View>
                                                    <Text style={[tw`text-[11px] font-semibold`, {
                                                        fontFamily: fonts.strong,
                                                        color: georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : CREAM,
                                                    }]}>
                                                        {item.date}
                                                    </Text>
                                                </View>
                                                <Text
                                                    style={[tw`mt-2 text-sm leading-5`, {
                                                        fontFamily: fonts.body,
                                                        color: primaryTextColor,
                                                    }]}
                                                    numberOfLines={2}
                                                >
                                                    {item.sample.text}
                                                </Text>
                                                <Text style={[tw`mt-1 text-[10px]`, {
                                                    fontFamily: fonts.body,
                                                    color: mutedTextColor,
                                                }]}>
                                                    {item.count} {item.count === 1 ? "entry" : "entries"}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            ) : null}
                        </>
                    ) : null}

                    <View style={tw`mt-4`}>
                        {!hasAnyEntries ? (
                            <View
                                style={[
                                    tw`overflow-hidden rounded-2xl border px-3 py-5`,
                                    {borderColor: panelBorderColor, backgroundColor: panelBackgroundColor, ...buttonDepthStyle},
                                ]}
                            >
                                <ButtonShine/>
                                <Text style={[tw`text-center text-sm`, {
                                    fontFamily: fonts.heading,
                                    color: primaryTextColor,
                                }]}>
                                    Your shelf is empty.
                                </Text>
                                <Text style={[tw`mt-2 text-center text-xs leading-5`, {
                                    fontFamily: fonts.body,
                                    color: georgiaMode ? "rgba(255,255,255,0.72)" : coastOrRiver ? "rgba(17,17,17,0.65)" : "rgba(228,224,212,0.65)",
                                }]}>
                                    Write a prompt response or list three good things to add your first memory here.
                                </Text>
                            </View>
                        ) : visibleEntries.length === 0 ? (
                            <View
                                style={[
                                    tw`overflow-hidden rounded-2xl border px-3 py-5`,
                                    {borderColor: panelBorderColor, backgroundColor: panelBackgroundColor, ...buttonDepthStyle},
                                ]}
                            >
                                <ButtonShine/>
                                <Text style={[tw`text-center text-sm`, {
                                    fontFamily: fonts.body,
                                    color: georgiaMode ? "rgba(255,255,255,0.78)" : coastOrRiver ? "rgba(17,17,17,0.78)" : "rgba(228,224,212,0.78)",
                                }]}>
                                    {isFiltered
                                        ? "Nothing matches the current filters."
                                        : "Nothing saved for this date yet."}
                                </Text>
                            </View>
                        ) : (
                            <View style={tw`gap-3`}>
                                {visibleEntries.map((entry) => {
                                    const isEditing = editingId === entry.id;
                                    return (
                                        <EntryCard
                                            key={entry.id}
                                            entry={entry}
                                            isEditing={isEditing}
                                            editingText={editingText}
                                            setEditingText={setEditingText}
                                            onStartEdit={() => {
                                                haptics.selection();
                                                setEditingId(entry.id);
                                                setEditingText(entry.text);
                                            }}
                                            onCancelEdit={() => {
                                                setEditingId(null);
                                                setEditingText("");
                                            }}
                                            onSaveEdit={() => {
                                                if (!editingId) return;
                                                editEntry(editingId, editingText);
                                                setEditingId(null);
                                                setEditingText("");
                                            }}
                                            onDelete={() => deleteEntry(entry.id)}
                                        />
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </View>
            </BlurView>
        </View>
    );
}
