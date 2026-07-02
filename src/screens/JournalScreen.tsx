import {type ComponentProps, useEffect, useMemo, useRef, useState} from "react";
import {Animated, Easing, Image, Pressable, ScrollView, Text, TextInput, View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import {getDailyStoicQuote} from "../lib/quotes";
import {getDailyJournalPrompt} from "../lib/prompts";
import type {JournalState} from "../state/useJournal";
import {fonts} from "../theme/fonts";
import {toLocalISODate} from "../lib/date-utils";
import {haptics} from "../lib/haptics";
import {TutorialCard} from "../components/TutorialCard";
import {MemoryShelf} from "../components/MemoryShelf";
import {TranslucentCard} from "../components/TranslucentCard";
import type {VisualMode} from "../state/useVisualMode";
import {useKeyboardInset} from "../lib/useKeyboardInset";
import {ScreenBackground} from "../components/ScreenBackground";

const COAST_SURFACE_COLOR = "#708090";
const GEORGIA_SURFACE_COLOR = "#111111";

function isoToday(): string {
    return toLocalISODate();
}

type JournalRoute = "write" | "promptEntry" | "gratitudeEntry" | "memory" | "audio";

interface JournalScreenProps {
    journal: JournalState;
    homeAction?: {
        key: number;
        target: "prompt" | "gratitude";
        entryId?: string | null;
    } | null;
    visualMode: VisualMode;
    badgeCount?: number;
    showTutorial?: boolean;
    onDismissTutorial?: () => void;
    onPromptEntryOpenChange?: (open: boolean) => void;
    onMemoryRouteChange?: (open: boolean) => void;
}

function JournalRouteEntry({
                               label,
                               icon,
                               active,
                               onPress,
                               coastOrRiver = false,
                               whiteContent = false,
                           }: {
    label: string;
    icon: ComponentProps<typeof Ionicons>["name"];
    active: boolean;
    onPress: () => void;
    coastOrRiver?: boolean;
    whiteContent?: boolean;
}) {
    const badgeColor = "#ba885a";
    const color = whiteContent ? "#FFFFFF" : active ? badgeColor : coastOrRiver ? "#000000" : "#E4E0D4";

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => {
                haptics.navigation();
                onPress();
            }}
            style={({pressed}) => [
                tw`items-center justify-center px-1 py-0.5`,
                pressed && {transform: [{scale: 0.94}], opacity: 0.85},
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

export function JournalScreen({
                                  journal,
                                  homeAction,
                                  visualMode,
                                  badgeCount = 0,
                                  showTutorial,
                                  onDismissTutorial,
                                  onPromptEntryOpenChange,
                                  onMemoryRouteChange,
                              }: JournalScreenProps) {
    const {byDate, addEntry} = journal;
    const [selectedDate, setSelectedDate] = useState<string>(isoToday());
    const [text, setText] = useState("");
    const [promptText, setPromptText] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState("");
    const [route, setRoute] = useState<JournalRoute>("write");
    const scrollRef = useRef<ScrollView>(null);
    const promptInputRef = useRef<TextInput>(null);
    const gratitudeInputRef = useRef<TextInput>(null);
    const routeOpacity = useRef(new Animated.Value(1)).current;
    const routeTranslateY = useRef(new Animated.Value(0)).current;
    const bg = visualMode === "georgia"
        ? require("../../public/images/rhbull1.jpg")
        : require("../../public/images/rh201.jpg");
    const badgeIcon = require("../../public/images/badge.png");
    const promptEntryBg = require("../../public/images/newspaper 1.jpg");
    const {keyboardInset} = useKeyboardInset();
    const coastMode = visualMode === "coast";
    const georgiaMode = visualMode === "georgia";
    const solidSurfaceColor = georgiaMode ? GEORGIA_SURFACE_COLOR : COAST_SURFACE_COLOR;
    const solidMode = coastMode || georgiaMode;
    const coastOrRiver = visualMode === "river" || coastMode;
    const badgeColor = "#ba885a";
    const primaryTextColor = georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : "#E4E0D4";
    const mutedTextColor = georgiaMode ? "rgba(255,255,255,0.7)" : coastOrRiver ? "rgba(17,17,17,0.68)" : "rgba(228,224,212,0.7)";
    const journalContentTextColor = coastMode || georgiaMode ? "#FFFFFF" : primaryTextColor;
    const journalMutedTextColor = coastMode || georgiaMode ? "rgba(255,255,255,0.7)" : mutedTextColor;
    const entrySurfaceStyle = coastOrRiver || georgiaMode
        ? [
            tw`rounded-[24px] border p-4`,
            georgiaMode ? tw`border-white/10` : coastOrRiver ? tw`border-black/10` : tw`border-slate-700/60`,
            {backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.24)"},
        ]
        : tw`rounded-[24px] border border-slate-700/60 bg-black/22 p-4`;
    const entryInputStyle = coastOrRiver || georgiaMode
        ? [
            tw`mt-4 flex-1 rounded-[24px] border px-4 py-4 text-base leading-6`,
            coastMode || georgiaMode ? tw`border-black/10 text-white` : coastOrRiver ? tw`border-black/10 text-[#111111]` : tw`border-slate-700/60 text-[#E4E0D4]`,
            {backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.24)"},
        ]
        : tw`mt-4 flex-1 rounded-[24px] border border-slate-700/60 bg-black/22 px-4 py-4 text-base leading-6 text-[#E4E0D4]`;

    const todaysQuote = useMemo(() => getDailyStoicQuote(selectedDate), [selectedDate]);
    const todaysPrompt = useMemo(() => getDailyJournalPrompt(selectedDate), [selectedDate]);
    const quoteHeaderTextColor = coastMode || georgiaMode ? "#FFFFFF" : primaryTextColor;
    const quoteBodyTextColor = georgiaMode ? "#FFFFFF" : coastMode ? primaryTextColor : quoteHeaderTextColor;
    const quoteHeaderDateColor = georgiaMode ? "rgba(255,255,255,0.82)" : coastOrRiver ? "rgba(0,0,0,0.79)" : badgeColor;

    function openPromptEntry() {
        haptics.navigation();
        setRoute("promptEntry");
        setTimeout(() => {
            promptInputRef.current?.focus();
        }, 280);
    }

    function savePromptEntry() {
        const body = promptText.trim();
        if (!body) return;
        haptics.saveJournalEntry();
        addEntry(body, selectedDate, "prompt");
        setPromptText("");
        setRoute("write");
    }

    function openGratitudeEntry() {
        haptics.navigation();
        setRoute("gratitudeEntry");
        setTimeout(() => {
            gratitudeInputRef.current?.focus();
        }, 280);
    }

    function saveGratitudeEntry() {
        const items = text
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
        if (items.length === 0) return;
        haptics.saveGratitudeEntry();
        const bulletText = items.slice(0, 3).map((item) => `• ${item}`).join("\n");
        addEntry(bulletText, selectedDate, "gratitude");
        setText("");
        setRoute("write");
    }

    useEffect(() => {
        routeOpacity.setValue(0);
        routeTranslateY.setValue(-14);
        scrollRef.current?.scrollTo({y: 0, animated: false});

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
    }, [route, routeOpacity, routeTranslateY]);

    useEffect(() => {
        onPromptEntryOpenChange?.(route === "promptEntry" || route === "gratitudeEntry");
        return () => onPromptEntryOpenChange?.(false);
    }, [onPromptEntryOpenChange, route]);

    useEffect(() => {
        onMemoryRouteChange?.(route === "memory");
        return () => onMemoryRouteChange?.(false);
    }, [onMemoryRouteChange, route]);

    useEffect(() => {
        if (!homeAction) return;
        const today = isoToday();
        setSelectedDate(today);

        if (homeAction.target === "prompt") {
            if (homeAction.entryId) {
                const entry = byDate[today]?.find((item) => item.id === homeAction.entryId);
                if (entry) {
                    setRoute("memory");
                    setEditingId(entry.id);
                    setEditingText(entry.text);
                    setTimeout(() => {
                        scrollRef.current?.scrollTo({y: 170, animated: true});
                    }, 80);
                    return;
                }
            }

            setRoute("promptEntry");
            setEditingId(null);
            setEditingText("");
            setTimeout(() => {
                promptInputRef.current?.focus();
            }, 280);
            return;
        }

        if (homeAction.entryId) {
            const entry = byDate[today]?.find((item) => item.id === homeAction.entryId);
            if (entry) {
                setRoute("memory");
                setEditingId(entry.id);
                setEditingText(entry.text);
                setTimeout(() => {
                    scrollRef.current?.scrollTo({y: 170, animated: true});
                }, 80);
                return;
            }
        }

        setRoute("gratitudeEntry");
        setEditingId(null);
        setEditingText("");
        setTimeout(() => {
            gratitudeInputRef.current?.focus();
        }, 280);
    }, [byDate, homeAction]);

    return (
        <ScreenBackground visualMode={visualMode} source={bg}>
            <Animated.View
                style={[
                    tw`flex-1`,
                    {
                        paddingHorizontal: 1,
                        paddingBottom: route === "promptEntry" || route === "gratitudeEntry" ? 0 : keyboardInset
                    },
                ]}
            >
                <View style={tw`absolute right-3 top-16 z-20 items-center gap-5`}>
                    <JournalRouteEntry
                        label="Write"
                        icon="create-outline"
                        active={route === "write" || route === "promptEntry" || route === "gratitudeEntry"}
                        onPress={() => setRoute("write")}
                        coastOrRiver={coastOrRiver || georgiaMode}
                        whiteContent={coastMode || georgiaMode}
                    />
                    <JournalRouteEntry
                        label="Memory"
                        icon="albums-outline"
                        active={route === "memory"}
                        onPress={() => setRoute("memory")}
                        coastOrRiver={coastOrRiver || georgiaMode}
                        whiteContent={coastMode || georgiaMode}
                    />
                    <JournalRouteEntry
                        label="Audio"
                        icon="mic-outline"
                        active={route === "audio"}
                        onPress={() => setRoute("audio")}
                        coastOrRiver={coastOrRiver || georgiaMode}
                        whiteContent={coastMode || georgiaMode}
                    />
                </View>
                {route === "memory" || route === "audio" ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={route === "memory" ? "Close memory shelf" : "Close audio journal"}
                        onPress={() => {
                            haptics.navigation();
                            setRoute("write");
                        }}
                        hitSlop={10}
                        style={({pressed}) => [
                            tw`absolute right-4 top-2 z-30 h-9 w-9 items-center justify-center`,
                            pressed && {opacity: 0.6, transform: [{translateY: 1}]},
                        ]}
                    >
                        <Ionicons name="close" size={18} color={primaryTextColor}/>
                    </Pressable>
                ) : null}
                {route === "write" ? (
                    <View pointerEvents="none" style={tw`absolute left-3 right-20 top-3 z-10 items-center`}>
                        <View style={tw`flex-row items-center justify-center px-4 py-1`}>
                            <Text
                                style={[tw`text-center text-lg font-semibold`, {
                                    fontFamily: fonts.heading,
                                    color: quoteHeaderTextColor
                                }]}>
                                QUOTE OF THE DAY
                            </Text>
                            <View style={tw`ml-2 flex-row items-center`}>
                                <Image
                                    source={badgeIcon}
                                    resizeMode="contain"
                                    style={{
                                        width: 25,
                                        height: 18,
                                        tintColor: badgeColor,
                                    }}
                                />
                                <Text
                                    style={[tw`ml-0.5 text-[11px] font-semibold`, {
                                        fontFamily: fonts.body,
                                        color: quoteHeaderTextColor,
                                    }]}
                                >
                                    {badgeCount}
                                </Text>
                            </View>
                        </View>
                        <Text
                            style={[tw`text-center text-xs font-semibold`, {
                                fontFamily: fonts.body,
                                color: quoteHeaderDateColor
                            }]}>{selectedDate}</Text>

                        <Text
                            style={[tw`mt-7 text-center text-lg leading-tight`, {
                                fontFamily: fonts.body,
                                color: quoteBodyTextColor
                            }]}
                            numberOfLines={3}>{todaysQuote}</Text>
                    </View>
                ) : null}
                <ScrollView
                    ref={scrollRef}
                    style={tw`flex-1`}
                    contentContainerStyle={[tw`pl-3 pr-20 pb-28`, route === "write" ? tw`pt-[190px]` : tw`pt-3`]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                >
                    <Animated.View style={{opacity: routeOpacity, transform: [{translateY: routeTranslateY}]}}>
                        {route === "write" ? (
                            <>
                                {showTutorial && onDismissTutorial ? (
                                    <View style={tw`mb-3`}>
                                        <TutorialCard
                                            title="Let's talk about it"
                                            body="I'll give you a prompt you give me your thoughts. Let's get started!"
                                            onDismiss={onDismissTutorial}
                                        />
                                    </View>
                                ) : null}

                                <TranslucentCard radius={24} style={tw`p-3`}>
                                    <View style={tw`flex-row items-start justify-between gap-3`}>
                                        <View style={tw`flex-1`}>
                                            <Text
                                                style={[tw`text-sm font-semibold`, {
                                                    fontFamily: fonts.heading,
                                                    color: journalContentTextColor
                                                }]}>
                                                Prompt of the day
                                            </Text>
                                            <Text style={[tw`mt-2 text-base leading-snug`, {
                                                fontFamily: fonts.body,
                                                color: journalContentTextColor
                                            }]}
                                                  numberOfLines={5}>
                                                {todaysPrompt}
                                            </Text>
                                        </View>
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel="Write prompt response"
                                            onPress={openPromptEntry}
                                            style={({pressed}) => [
                                                tw`items-center justify-center px-1 py-0.5`,
                                                pressed && {transform: [{scale: 0.94}], opacity: 0.85},
                                            ]}
                                        >
                                            <Text
                                                numberOfLines={1}
                                                style={[
                                                    tw`mb-1 text-[10px] font-bold`,
                                                    {fontFamily: fonts.heading, color: journalContentTextColor},
                                                ]}
                                            >
                                                Write
                                            </Text>
                                            <Ionicons name="create-outline" size={22} color={journalContentTextColor}/>
                                        </Pressable>
                                    </View>
                                </TranslucentCard>

                                <TranslucentCard radius={16} style={tw`mt-4 p-3`}>
                                    <View style={tw`flex-row items-start justify-between gap-3`}>
                                        <View style={tw`flex-1`}>
                                            <Text
                                                style={[tw`text-sm font-semibold`, {
                                                    fontFamily: fonts.heading,
                                                    color: journalContentTextColor
                                                }]}>
                                                3 Good Things Today
                                            </Text>
                                            <Text style={[tw`mt-1 text-xs`, {fontFamily: fonts.body, color: journalMutedTextColor}]}>
                                                List three good things about today.
                                            </Text>
                                        </View>
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel="Write gratitude entry"
                                            onPress={openGratitudeEntry}
                                            style={({pressed}) => [
                                                tw`items-center justify-center px-1 py-0.5`,
                                                pressed && {transform: [{scale: 0.94}], opacity: 0.85},
                                            ]}
                                        >
                                            <Text
                                                numberOfLines={1}
                                                style={[
                                                    tw`mb-1 text-[10px] font-bold`,
                                                    {fontFamily: fonts.heading, color: journalContentTextColor},
                                                ]}
                                            >
                                                Write
                                            </Text>
                                            <Ionicons name="create-outline" size={22} color={journalContentTextColor}/>
                                        </Pressable>
                                    </View>
                                </TranslucentCard>

                            </>
                        ) : null}

                        {route === "memory" ? (
                            <MemoryShelf
                                journal={journal}
                                selectedDate={selectedDate}
                                setSelectedDate={setSelectedDate}
                                editingId={editingId}
                                setEditingId={setEditingId}
                                editingText={editingText}
                                setEditingText={setEditingText}
                            />
                        ) : null}

                        {route === "audio" ? (
                            <TranslucentCard radius={28} style={tw`items-center p-4`}>
                                <Text style={[tw`text-center text-xl`, {
                                    fontFamily: fonts.heading,
                                    color: primaryTextColor
                                }]}>
                                    Audio Journal
                                </Text>
                                <View
                                    style={tw`mt-4 w-full items-center justify-center rounded-[24px] border border-slate-700/60 bg-black/22 px-4 py-6`}>
                                    <Ionicons name="mic-outline" size={34} color={primaryTextColor}/>
                                    <Text
                                        style={[tw`mt-3 text-center text-md`, {
                                            fontFamily: fonts.heading,
                                            color: primaryTextColor
                                        }]}>
                                        Coming Soon...
                                    </Text>
                                    <Text
                                        style={[tw`mt-1 text-center text-xs leading-5`, {fontFamily: fonts.body, color: mutedTextColor}]}>
                                        This route is for audio journaling.
                                    </Text>
                                </View>
                            </TranslucentCard>
                        ) : null}

                    </Animated.View>
                </ScrollView>
                {(route === "promptEntry" || route === "gratitudeEntry") ? (
                    <ScreenBackground
                        visualMode={visualMode}
                        source={promptEntryBg}
                        style={tw`absolute inset-0 z-30`}
                    >
                        <Animated.View
                            style={[
                                tw`flex-1`,
                                {paddingBottom: keyboardInset},
                            ]}
                        >
                            <Animated.View
                                style={[
                                    tw`flex-1`,
                                    {opacity: routeOpacity, transform: [{translateY: routeTranslateY}]},
                                ]}
                            >
                                <View
                                    style={tw`relative flex-row items-center justify-center border-b border-slate-700 px-4 py-3`}>
                                    <Text style={[tw`text-xl`, {fontFamily: fonts.heading, color: journalContentTextColor}]}>
                                        {route === "promptEntry" ? "Prompt Entry" : "Gratitude Entry"}
                                    </Text>
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel="Close journal entry"
                                        onPress={() => {
                                            haptics.navigation();
                                            setRoute("write");
                                        }}
                                        style={({pressed}) => [
                                            tw`absolute right-4 h-8 w-8 items-center justify-center rounded-full`,
                                            pressed && tw`opacity-70`,
                                        ]}
                                    >
                                        <Ionicons name="close" size={20} color={journalContentTextColor}/>
                                    </Pressable>
                                </View>

                                <View style={tw`flex-1 px-4 pb-4 pt-4`}>
                                    {route === "promptEntry" ? (
                                        <>
                                            <View style={entrySurfaceStyle}>
                                                <View style={tw`flex-row items-start justify-between gap-3`}>
                                                    <Text style={[tw`flex-1 text-sm`, {
                                                        fontFamily: fonts.heading,
                                                        color: journalContentTextColor
                                                    }]}>
                                                        Journal prompt
                                                    </Text>
                                                    <Text style={[tw`text-[11px] font-semibold`, {
                                                        fontFamily: fonts.body,
                                                        color: journalMutedTextColor
                                                    }]}>
                                                        {selectedDate}
                                                    </Text>
                                                </View>
                                                <Text style={[tw`mt-3 text-base leading-6`, {
                                                    fontFamily: fonts.body,
                                                    color: journalContentTextColor
                                                }]}>
                                                    {todaysPrompt}
                                                </Text>
                                            </View>

                                            <TextInput
                                                ref={promptInputRef}
                                                value={promptText}
                                                onChangeText={setPromptText}
                                                keyboardAppearance="dark"
                                                multiline
                                                autoFocus
                                                textAlignVertical="top"
                                                style={[entryInputStyle, {fontFamily: fonts.body}]}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <View style={entrySurfaceStyle}>
                                                <View style={tw`flex-row items-start justify-between gap-3`}>
                                                    <Text style={[tw`flex-1 text-sm`, {
                                                        fontFamily: fonts.heading,
                                                        color: journalContentTextColor
                                                    }]}>
                                                        List 3 good things about today.
                                                    </Text>
                                                    <Text style={[tw`text-[11px] font-semibold`, {
                                                        fontFamily: fonts.body,
                                                        color: journalMutedTextColor
                                                    }]}>
                                                        {selectedDate}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View
                                                style={coastOrRiver || georgiaMode
                                                    ? [
                                                        tw`mt-4 flex-1 rounded-[24px] border px-4 py-4`,
                                                        georgiaMode ? tw`border-white/10` : coastOrRiver ? tw`border-black/10` : tw`border-slate-700/60`,
                                                        {backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.24)"},
                                                    ]
                                                    : tw`mt-4 flex-1 rounded-[24px] border border-slate-700/60 bg-black/22 px-4 py-4`}
                                            >
                                                {[0, 1, 2].map((idx) => (
                                                    <TextInput
                                                        ref={idx === 0 ? gratitudeInputRef : undefined}
                                                        key={idx}
                                                        value={text.split("\n")[idx] ?? ""}
                                                        onChangeText={(val) => {
                                                            const parts = text.split("\n");
                                                            parts[idx] = val;
                                                            setText(parts.slice(0, 3).join("\n"));
                                                        }}
                                                        keyboardAppearance="dark"
                                                        placeholder="•"
                                                        placeholderTextColor={coastMode || georgiaMode ? "rgba(255,255,255,0.55)" : "#6b7280"}
                                                        style={[
                                                            coastOrRiver || georgiaMode
                                                                ? [
                                                                    tw`mb-3 rounded-2xl border px-3 py-3 text-base`,
                                                                    coastMode || georgiaMode ? tw`border-black/10 text-white` : coastOrRiver ? tw`border-black/10 text-[#111111]` : tw`border-slate-700/60 text-[#E4E0D4]`,
                                                                    {backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.24)"},
                                                                ]
                                                                : tw`mb-3 rounded-2xl border border-slate-700/60 bg-black/22 px-3 py-3 text-base text-[#E4E0D4]`,
                                                            {fontFamily: fonts.body},
                                                        ]}
                                                    />
                                                ))}
                                            </View>
                                        </>
                                    )}

                                    <View style={tw`mt-4 flex-row justify-end`}>
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel={route === "promptEntry" ? "Add prompt entry" : "Add gratitude entry"}
                                            disabled={route === "promptEntry" ? promptText.trim().length === 0 : text.trim().length === 0}
                                            onPress={route === "promptEntry" ? savePromptEntry : saveGratitudeEntry}
                                            style={({pressed}) => [
                                                tw`h-10 w-10 items-center justify-center rounded-full`,
                                                (route === "promptEntry" ? promptText.trim().length === 0 : text.trim().length === 0) && tw`opacity-40`,
                                                pressed && (route === "promptEntry" ? promptText.trim().length > 0 : text.trim().length > 0) && tw`opacity-75`,
                                            ]}
                                        >
                                            <Ionicons name="send" size={17} color={journalContentTextColor}/>
                                        </Pressable>
                                    </View>
                                </View>
                            </Animated.View>
                        </Animated.View>
                    </ScreenBackground>
                ) : null}
            </Animated.View>
        </ScreenBackground>
    );
}
