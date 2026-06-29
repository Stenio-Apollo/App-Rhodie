import {type ComponentProps, useEffect, useMemo, useRef, useState} from "react";
import {Animated, Easing, ImageBackground, Pressable, ScrollView, Text, TextInput, View} from "react-native";
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
import type {VisualMode} from "../state/useVisualMode";
import {useKeyboardInset} from "../lib/useKeyboardInset";

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
    showTutorial?: boolean;
    onDismissTutorial?: () => void;
    onPromptEntryOpenChange?: (open: boolean) => void;
}

function JournalRouteEntry({
                               label,
                               icon,
                               active,
                               onPress,
                           }: {
    label: string;
    icon: ComponentProps<typeof Ionicons>["name"];
    active: boolean;
    onPress: () => void;
}) {
    const color = active ? "#000000" : "#E4E0D4";

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
                                  showTutorial,
                                  onDismissTutorial,
                                  onPromptEntryOpenChange,
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
    const bg = visualMode === "sunset"
        ? require("../../public/images/rhbull1.jpg")
        : require("../../public/images/rh201.jpg");
    const promptEntryBg = require("../../public/images/newspaper 1.jpg");
    const {keyboardInset} = useKeyboardInset();

    const todaysQuote = useMemo(() => getDailyStoicQuote(selectedDate), [selectedDate]);
    const todaysPrompt = useMemo(() => getDailyJournalPrompt(selectedDate), [selectedDate]);

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
        <ImageBackground source={bg} style={tw`flex-1`} imageStyle={tw`opacity-39`}>
            <Animated.View
                style={[
                    tw`flex-1 bg-black/47`,
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
                    />
                    <JournalRouteEntry
                        label="Memory"
                        icon="albums-outline"
                        active={route === "memory"}
                        onPress={() => setRoute("memory")}
                    />
                    <JournalRouteEntry
                        label="Audio"
                        icon="mic-outline"
                        active={route === "audio"}
                        onPress={() => setRoute("audio")}
                    />
                </View>
                {route === "write" ? (
                    <View pointerEvents="none" style={tw`absolute left-3 right-20 top-3 z-10 items-center`}>
                        <Text
                            style={[tw`text-center px-4 py-1 text-lg font-semibold`, {
                                fontFamily: fonts.heading,
                                color: "#E4E0D4"
                            }]}>
                            QUOTE OF THE DAY
                        </Text>
                        <Text
                            style={[tw`text-center text-xs font-semibold`, {
                                fontFamily: fonts.body,
                                color: "rgba(228,224,212,0.7)"
                            }]}>{selectedDate}</Text>

                        <Text
                            style={[tw`mt-7 text-center text-lg leading-tight`, {
                                fontFamily: fonts.body,
                                color: "#E4E0D4"
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

                                <View style={tw`rounded-3xl bg-black/63 border border-[#2c2c2c] p-3`}>
                                    <View style={tw`flex-row items-start justify-between gap-3`}>
                                        <View style={tw`flex-1`}>
                                            <Text
                                                style={[tw`text-sm font-semibold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                                Prompt of the day
                                            </Text>
                                            <Text style={[tw`mt-2 text-base leading-snug`, {
                                                fontFamily: fonts.body,
                                                color: "#E4E0D4"
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
                                                    tw`mb-1 text-[10px] font-bold text-[#E4E0D4]`,
                                                    {fontFamily: fonts.heading},
                                                ]}
                                            >
                                                Write
                                            </Text>
                                            <Ionicons name="create-outline" size={22} color="#E4E0D4"/>
                                        </Pressable>
                                    </View>
                                </View>

                                <View style={tw`mt-4 rounded-2xl border border-[#2c2c2c] bg-black/63 p-3`}>
                                    <View style={tw`flex-row items-start justify-between gap-3`}>
                                        <View style={tw`flex-1`}>
                                            <Text
                                                style={[tw`text-sm font-semibold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                                3 Good Things Today
                                            </Text>
                                            <Text style={[tw`mt-1 text-xs text-slate-400`, {fontFamily: fonts.body}]}>
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
                                                    tw`mb-1 text-[10px] font-bold text-[#E4E0D4]`,
                                                    {fontFamily: fonts.heading},
                                                ]}
                                            >
                                                Write
                                            </Text>
                                            <Ionicons name="create-outline" size={22} color="#E4E0D4"/>
                                        </Pressable>
                                    </View>
                                </View>

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
                            <View style={tw`rounded-[28px] border border-[#F5DBC9]/33 bg-black/39 p-4`}>
                                <Text style={[tw`text-sm`, {fontFamily: fonts.heading, color: "#E4E0D4"}]}>
                                    Audio Journal
                                </Text>
                                <Text style={[tw`mt-1 text-xs`, {
                                    fontFamily: fonts.body,
                                    color: "rgba(228,224,212,0.68)"
                                }]}>
                                    Record voice reflections here when audio journaling is ready.
                                </Text>
                                <View
                                    style={tw`mt-5 items-center justify-center rounded-[24px] border border-[#F5DBC9]/33 bg-black/35 px-4 py-8`}>
                                    <Ionicons name="mic-outline" size={34} color="#E4E0D4"/>
                                    <Text
                                        style={[tw`mt-3 text-center text-sm text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                        Audio entry point
                                    </Text>
                                    <Text
                                        style={[tw`mt-1 text-center text-xs leading-5 text-slate-300`, {fontFamily: fonts.body}]}>
                                        This route is ready for the recorder controls.
                                    </Text>
                                </View>
                            </View>
                        ) : null}

                    </Animated.View>
                </ScrollView>
                {(route === "promptEntry" || route === "gratitudeEntry") ? (
                    <ImageBackground
                        source={promptEntryBg}
                        style={tw`absolute inset-0 z-30 bg-black`}
                        imageStyle={tw`opacity-11`}
                    >
                        <Animated.View style={[tw`flex-1 bg-black/88`, {paddingBottom: keyboardInset}]}>
                            <Animated.View
                                style={[
                                    tw`flex-1`,
                                    {opacity: routeOpacity, transform: [{translateY: routeTranslateY}]},
                                ]}
                            >
                                <View
                                    style={tw`relative flex-row items-center justify-center border-b border-slate-700 px-4 py-3`}>
                                    <Text style={[tw`text-xl text-white`, {fontFamily: fonts.heading}]}>
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
                                        <Ionicons name="close" size={20} color="#ffffff"/>
                                    </Pressable>
                                </View>

                                <View style={tw`flex-1 px-4 pb-4 pt-4`}>
                                    {route === "promptEntry" ? (
                                        <>
                                            <View style={tw`rounded-[24px] border border-[#F5DBC9]/33 bg-black/70 p-4`}>
                                                <View style={tw`flex-row items-start justify-between gap-3`}>
                                                    <Text style={[tw`flex-1 text-sm`, {
                                                        fontFamily: fonts.heading,
                                                        color: "#E4E0D4"
                                                    }]}>
                                                        Journal prompt
                                                    </Text>
                                                    <Text style={[tw`text-[11px] font-semibold`, {
                                                        fontFamily: fonts.body,
                                                        color: "rgba(228,224,212,0.68)"
                                                    }]}>
                                                        {selectedDate}
                                                    </Text>
                                                </View>
                                                <Text style={[tw`mt-3 text-base leading-6`, {
                                                    fontFamily: fonts.body,
                                                    color: "#E4E0D4"
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
                                                style={[tw`mt-4 flex-1 rounded-[24px] border border-[#2c2c2c] bg-black/79 px-4 py-4 text-base leading-6 text-[#E4E0D4]`, {fontFamily: fonts.body}]}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <View style={tw`rounded-[24px] border border-[#F5DBC9]/33 bg-black/70 p-4`}>
                                                <View style={tw`flex-row items-start justify-between gap-3`}>
                                                    <Text style={[tw`flex-1 text-sm`, {
                                                        fontFamily: fonts.heading,
                                                        color: "#E4E0D4"
                                                    }]}>
                                                        List 3 good things about today.
                                                    </Text>
                                                    <Text style={[tw`text-[11px] font-semibold`, {
                                                        fontFamily: fonts.body,
                                                        color: "rgba(228,224,212,0.68)"
                                                    }]}>
                                                        {selectedDate}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View
                                                style={tw`mt-4 flex-1 rounded-[24px] border border-[#2c2c2c] bg-black/79 px-4 py-4`}>
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
                                                        placeholderTextColor="#6b7280"
                                                        style={[tw`mb-3 rounded-2xl border border-slate-50/15 bg-black/35 px-3 py-3 text-base text-[#E4E0D4]`, {fontFamily: fonts.body}]}
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
                                            <Ionicons name="send" size={17} color="#E4E0D4"/>
                                        </Pressable>
                                    </View>
                                </View>
                            </Animated.View>
                        </Animated.View>
                    </ImageBackground>
                ) : null}
            </Animated.View>
        </ImageBackground>
    );
}
