import {type ComponentProps, useEffect, useMemo, useRef, useState} from "react";
import {Alert, Animated, Easing, Image, Modal, Pressable, ScrollView, Text, TextInput, View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
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
import {PurposePhotoFrame} from "../components/PurposePhotoFrame";
import {imagePickerAssetToDataUri} from "../lib/image-picker-data-uri";

const GEORGIA_SURFACE_COLOR = "#111111";
const GEORGIA_ACCENT_COLOR = "#DAC8AE";

function isoToday(): string {
    return toLocalISODate();
}

type JournalRoute = "write" | "promptEntry" | "gratitudeEntry" | "memory" | "audio" | "purpose";

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
    onClearHomeAction?: () => void;
}

function JournalRouteEntry({
                               label,
                               icon,
                               active,
                               onPress,
                               activeColor,
                               darkContent = false,
                               whiteContent = false,
                           }: {
    label: string;
    icon: ComponentProps<typeof Ionicons>["name"];
    active: boolean;
    onPress: () => void;
    activeColor?: string;
    darkContent?: boolean;
    whiteContent?: boolean;
}) {
    const badgeColor = "#ba885a";
    const color = active ? activeColor ?? badgeColor : whiteContent ? "#FFFFFF" : darkContent ? "#000000" : "#E4E0D4";

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
                                  onClearHomeAction,
                              }: JournalScreenProps) {
    const {byDate, addEntry} = journal;
    const [selectedDate, setSelectedDate] = useState<string>(isoToday());
    const [text, setText] = useState("");
    const [promptText, setPromptText] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState("");
    const [route, setRoute] = useState<JournalRoute>("write");
    const [viewingPurposeImageId, setViewingPurposeImageId] = useState<string | null>(null);
    const [deletingPurposeImageId, setDeletingPurposeImageId] = useState<string | null>(null);
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
    const georgiaMode = visualMode === "georgia";
    const riverMode = visualMode === "river";
    const solidSurfaceColor = GEORGIA_SURFACE_COLOR;
    const solidMode = georgiaMode;
    const badgeColor = "#ba885a";
    const primaryTextColor = georgiaMode ? "#FFFFFF" : riverMode ? "#111111" : "#E4E0D4";
    const mutedTextColor = georgiaMode ? "rgba(255,255,255,0.7)" : riverMode ? "rgba(17,17,17,0.68)" : "rgba(228,224,212,0.7)";
    const journalContentTextColor = georgiaMode ? "#FFFFFF" : primaryTextColor;
    const journalMutedTextColor = georgiaMode ? "rgba(255,255,255,0.7)" : mutedTextColor;
    const entryHeaderStyle = georgiaMode
        ? [
            tw`relative flex-row items-center justify-center border-b px-4 py-3`,
            {borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(0,0,0,0.22)"},
        ]
        : tw`relative flex-row items-center justify-center border-b border-slate-700 px-4 py-3`;
    const entrySurfaceStyle = georgiaMode
        ? tw`p-4`
        : riverMode
        ? [
            tw`rounded-[24px] border p-4`,
            tw`border-black/10`,
            {backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.24)"},
        ]
        : tw`rounded-[24px] border border-slate-700/60 bg-black/22 p-4`;
    const entryInputStyle = georgiaMode
        ? tw`flex-1 px-4 py-4 text-base leading-6 text-white`
        : riverMode
        ? [
            tw`mt-4 flex-1 rounded-[24px] border px-4 py-4 text-base leading-6`,
            tw`border-black/10 text-[#111111]`,
            {backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.24)"},
        ]
        : tw`mt-4 flex-1 rounded-[24px] border border-slate-700/60 bg-black/22 px-4 py-4 text-base leading-6 text-[#E4E0D4]`;
    const gratitudeInputShellStyle = georgiaMode
        ? tw`mt-4 flex-1 px-4 py-4`
        : riverMode
            ? [
                tw`mt-4 flex-1 rounded-[24px] border px-4 py-4`,
                tw`border-black/10`,
                {backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.24)"},
            ]
            : tw`mt-4 flex-1 rounded-[24px] border border-slate-700/60 bg-black/22 px-4 py-4`;
    const gratitudeInputStyle = georgiaMode
        ? [
            tw`mb-3 rounded-2xl border border-white/10 px-3 py-3 text-base text-white`,
            {backgroundColor: "rgba(255,255,255,0.08)"},
        ]
        : riverMode
            ? [
                tw`mb-3 rounded-2xl border px-3 py-3 text-base`,
                tw`border-black/10 text-[#111111]`,
                {backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.24)"},
            ]
            : tw`mb-3 rounded-2xl border border-slate-700/60 bg-black/22 px-3 py-3 text-base text-[#E4E0D4]`;
    const entryPlaceholderTextColor = georgiaMode ? "rgba(255,255,255,0.55)" : "#6b7280";
    const entryActionColor = georgiaMode ? GEORGIA_ACCENT_COLOR : journalContentTextColor;
    const entryHeaderTextColor = georgiaMode ? GEORGIA_ACCENT_COLOR : riverMode ? badgeColor : journalContentTextColor;

    const todaysQuote = useMemo(() => getDailyStoicQuote(selectedDate), [selectedDate]);
    const todaysPrompt = useMemo(() => getDailyJournalPrompt(selectedDate), [selectedDate]);
    const quoteHeaderTextColor = georgiaMode ? "#DAC8AE" : riverMode ? badgeColor : primaryTextColor;
    const journalSectionHeaderTextColor = georgiaMode ? GEORGIA_ACCENT_COLOR : riverMode ? badgeColor : primaryTextColor;
    const quoteBodyTextColor = georgiaMode ? "#FFFFFF" : riverMode ? "#000000" : quoteHeaderTextColor;
    const quoteHeaderDateColor = georgiaMode ? "rgba(255,255,255,0.82)" : riverMode ? "rgba(0,0,0,0.79)" : badgeColor;
    const purposeImages = journal.purposeImages.filter((image) => image.date === selectedDate);
    const purposeImageRows = purposeImages.reduce<typeof purposeImages[]>((rows, image, index) => {
        if (index % 3 === 0) rows.push([]);
        rows[rows.length - 1].push(image);
        return rows;
    }, []);
    const viewingPurposeImage = journal.purposeImages.find((image) => image.id === viewingPurposeImageId) ?? null;
    const deletingPurposeImage = journal.purposeImages.find((image) => image.id === deletingPurposeImageId) ?? null;
    const purposeDialogSurfaceColor = georgiaMode
        ? GEORGIA_SURFACE_COLOR
        : riverMode
                ? "#FFFFFF"
                : "#0f0f0f";
    const purposeDialogTextColor = georgiaMode || visualMode === "sonny" ? "#FFFFFF" : "#111111";
    const purposeDialogMutedColor = georgiaMode || visualMode === "sonny" ? "rgba(255,255,255,0.68)" : "rgba(17,17,17,0.66)";
    const purposeDialogBorderColor = georgiaMode || visualMode === "sonny" ? "rgba(255,255,255,0.16)" : "rgba(17,17,17,0.14)";

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
        onClearHomeAction?.();
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
        onClearHomeAction?.();
        setRoute("write");
    }

    function closeEntryRoute() {
        haptics.navigation();
        onClearHomeAction?.();
        setRoute("write");
    }

    async function addPurposeImage() {
        try {
            if (journal.purposeImages.length >= 9) {
                Alert.alert("Limit reached", "You can keep up to 9 My Reason photos.");
                return;
            }

            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert("Photo access needed", "Allow photo access to add encrypted My Reason images.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: "images",
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.25,
                base64: true,
            });

            if (result.canceled || result.assets.length === 0) return;

            const asset = result.assets[0];
            const {dataUri, mimeType} = await imagePickerAssetToDataUri(asset, "image/jpeg");
            await journal.addPurposeImage(dataUri, selectedDate, mimeType);
            haptics.saveJournalEntry();
        } catch (error) {
            Alert.alert("Image not added", error instanceof Error ? error.message : "That image could not be encrypted.");
        }
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
    }, [byDate, homeAction?.entryId, homeAction?.key, homeAction?.target]);

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
                {route !== "promptEntry" && route !== "gratitudeEntry" ? (
                    <View style={tw`absolute right-3 top-16 z-20 items-center gap-5`}>
                        <JournalRouteEntry
                            label="Write"
                            icon="create-outline"
                            active={route === "write"}
                            onPress={() => setRoute("write")}
                            activeColor={georgiaMode ? GEORGIA_ACCENT_COLOR : undefined}
                            darkContent={riverMode || georgiaMode}
                            whiteContent={georgiaMode}
                        />
                        <JournalRouteEntry
                            label="Memory"
                            icon="albums-outline"
                            active={route === "memory"}
                            onPress={() => setRoute("memory")}
                            activeColor={georgiaMode ? GEORGIA_ACCENT_COLOR : undefined}
                            darkContent={riverMode || georgiaMode}
                            whiteContent={georgiaMode}
                        />
                        <JournalRouteEntry
                            label="Audio"
                            icon="mic-outline"
                            active={route === "audio"}
                            onPress={() => setRoute("audio")}
                            activeColor={georgiaMode ? GEORGIA_ACCENT_COLOR : undefined}
                            darkContent={riverMode || georgiaMode}
                            whiteContent={georgiaMode}
                        />
                        <JournalRouteEntry
                            label="My Reason"
                            icon="image-outline"
                            active={route === "purpose"}
                            onPress={() => setRoute("purpose")}
                            activeColor={georgiaMode ? GEORGIA_ACCENT_COLOR : undefined}
                            darkContent={riverMode || georgiaMode}
                            whiteContent={georgiaMode}
                        />
                    </View>
                ) : null}
                {route === "memory" || route === "audio" || route === "purpose" ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={route === "memory" ? "Close memory shelf" : route === "purpose" ? "Close my reason images" : "Close audio journal"}
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
                                            title="Journal"
                                            body="Answer the prompt or list three good things."
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
                                    color: journalSectionHeaderTextColor
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

                        {route === "purpose" ? (
                            <TranslucentCard radius={28} style={tw`p-4`}>
                                <View style={tw`flex-row items-start justify-between gap-3`}>
                                    <View style={tw`flex-1`}>
                                        <Text style={[tw`text-xl`, {
                                            fontFamily: fonts.heading,
                                            color: journalSectionHeaderTextColor
                                        }]}>
                                            My Reason
                                        </Text>
                                        <Text
                                            style={[tw`mt-1 text-xs leading-5`, {fontFamily: fonts.body, color: mutedTextColor}]}>
                                            Keep visual reminders tied to this day.
                                        </Text>
                                    </View>
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel="Add my reason image"
                                        onPress={() => {
                                            void addPurposeImage();
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
                                                {fontFamily: fonts.heading, color: primaryTextColor},
                                            ]}
                                        >
                                            Add
                                        </Text>
                                        <Ionicons name="image-outline" size={24} color={primaryTextColor}/>
                                    </Pressable>
                                </View>

                                <Text
                                    style={[tw`mt-4 text-center text-[11px] font-semibold`, {
                                        fontFamily: fonts.body,
                                        color: mutedTextColor
                                    }]}
                                >
                                    {selectedDate}
                                </Text>

                                {purposeImages.length === 0 ? (
                                    <View style={tw`mt-4 gap-1.5`}>
                                        {[0, 1, 2].map((row) => (
                                            <View key={`purpose-template-row-${row}`} style={tw`flex-row gap-1.5`}>
                                                {[0, 1, 2].map((column) => (
                                                    <View key={`purpose-template-${row}-${column}`} style={tw`flex-1 opacity-60`}>
                                                        <PurposePhotoFrame placeholder/>
                                                    </View>
                                                ))}
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={tw`mt-4 gap-1.5`}>
                                        {purposeImageRows.map((row, rowIndex) => (
                                            <View key={`purpose-row-${rowIndex}`} style={tw`flex-row gap-1.5`}>
                                                {row.map((image) => (
                                                    <Pressable
                                                        key={image.id}
                                                        accessibilityRole="button"
                                                        accessibilityLabel="View my reason image"
                                                        onPress={() => {
                                                            haptics.selection();
                                                            setViewingPurposeImageId(image.id);
                                                        }}
                                                        onLongPress={() => {
                                                            haptics.longPressTask();
                                                            setDeletingPurposeImageId(image.id);
                                                        }}
                                                        delayLongPress={220}
                                                        style={[
                                                            tw`flex-1`,
                                                        ]}
                                                    >
                                                        <PurposePhotoFrame uri={image.dataUri}/>
                                                    </Pressable>
                                                ))}
                                                {row.length < 3
                                                    ? Array.from({length: 3 - row.length}).map((_, placeholderIndex) => (
                                                        <View
                                                            key={`purpose-placeholder-${rowIndex}-${placeholderIndex}`}
                                                            pointerEvents="none"
                                                            style={tw`flex-1 opacity-0`}
                                                        />
                                                    ))
                                                    : null}
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </TranslucentCard>
                        ) : null}

                    </Animated.View>
                </ScrollView>
                {(route === "promptEntry" || route === "gratitudeEntry") ? (
                    <ScreenBackground
                        visualMode={visualMode}
                        source={promptEntryBg}
                        style={[
                            tw`absolute inset-0 z-30`,
                            georgiaMode ? {backgroundColor: "rgba(17,17,17,0.18)"} : null,
                        ]}
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
                                {georgiaMode ? (
                                    <View style={tw`px-4 pt-3`}>
                                        <TranslucentCard radius={24} style={tw`relative flex-row items-center justify-center px-4 py-3`}>
                                            <Text style={[tw`text-xl`, {fontFamily: fonts.heading, color: entryHeaderTextColor}]}>
                                                {route === "promptEntry" ? "Prompt Entry" : "Gratitude Entry"}
                                            </Text>
                                            <Pressable
                                                accessibilityRole="button"
                                                accessibilityLabel="Close journal entry"
                                                onPress={closeEntryRoute}
                                                style={({pressed}) => [
                                                    tw`absolute right-4 h-8 w-8 items-center justify-center rounded-full`,
                                                    pressed && tw`opacity-70`,
                                                ]}
                                            >
                                                <Ionicons name="close" size={20} color={journalContentTextColor}/>
                                            </Pressable>
                                        </TranslucentCard>
                                    </View>
                                ) : (
                                    <View style={entryHeaderStyle}>
                                        <Text style={[tw`text-xl`, {fontFamily: fonts.heading, color: entryHeaderTextColor}]}>
                                            {route === "promptEntry" ? "Prompt Entry" : "Gratitude Entry"}
                                        </Text>
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel="Close journal entry"
                                            onPress={closeEntryRoute}
                                            style={({pressed}) => [
                                                tw`absolute right-4 h-8 w-8 items-center justify-center rounded-full`,
                                                pressed && tw`opacity-70`,
                                            ]}
                                        >
                                            <Ionicons name="close" size={20} color={journalContentTextColor}/>
                                        </Pressable>
                                    </View>
                                )}

                                <View style={tw`flex-1 px-4 pb-4 pt-4`}>
                                    {route === "promptEntry" ? (
                                        <>
                                            {georgiaMode ? (
                                                <TranslucentCard radius={24} style={entrySurfaceStyle}>
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
                                                </TranslucentCard>
                                            ) : (
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
                                            )}

                                            {georgiaMode ? (
                                                <TranslucentCard
                                                    radius={24}
                                                    containerStyle={tw`mt-4 flex-1`}
                                                    style={tw`flex-1`}
                                                >
                                                    <TextInput
                                                        ref={promptInputRef}
                                                        value={promptText}
                                                        onChangeText={setPromptText}
                                                        keyboardAppearance="dark"
                                                        multiline
                                                        autoFocus
                                                        placeholder="Write what is on your mind..."
                                                        placeholderTextColor={entryPlaceholderTextColor}
                                                        textAlignVertical="top"
                                                        style={[entryInputStyle, {fontFamily: fonts.body}]}
                                                    />
                                                </TranslucentCard>
                                            ) : (
                                                <TextInput
                                                    ref={promptInputRef}
                                                    value={promptText}
                                                    onChangeText={setPromptText}
                                                    keyboardAppearance="dark"
                                                    multiline
                                                    autoFocus
                                                    placeholder="Write what is on your mind..."
                                                    placeholderTextColor={entryPlaceholderTextColor}
                                                    textAlignVertical="top"
                                                    style={[entryInputStyle, {fontFamily: fonts.body}]}
                                                />
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {georgiaMode ? (
                                                <TranslucentCard radius={24} style={entrySurfaceStyle}>
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
                                                </TranslucentCard>
                                            ) : (
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
                                            )}

                                            {georgiaMode ? (
                                                <TranslucentCard
                                                    radius={24}
                                                    containerStyle={tw`mt-4 flex-1`}
                                                    style={tw`flex-1 px-4 py-4`}
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
                                                            placeholderTextColor={entryPlaceholderTextColor}
                                                            style={[
                                                                gratitudeInputStyle,
                                                                {fontFamily: fonts.body},
                                                            ]}
                                                        />
                                                    ))}
                                                </TranslucentCard>
                                            ) : (
                                                <View
                                                    style={gratitudeInputShellStyle}
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
                                                            placeholderTextColor={entryPlaceholderTextColor}
                                                            style={[
                                                                gratitudeInputStyle,
                                                                {fontFamily: fonts.body},
                                                            ]}
                                                        />
                                                    ))}
                                                </View>
                                            )}
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
                                            <Ionicons name="send" size={17} color={entryActionColor}/>
                                        </Pressable>
                                    </View>
                                </View>
                            </Animated.View>
                        </Animated.View>
                    </ScreenBackground>
                ) : null}
                <Modal
                    visible={Boolean(viewingPurposeImage)}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setViewingPurposeImageId(null)}
                >
                    <View style={tw`flex-1 justify-center px-4`}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Close my reason image"
                            onPress={() => setViewingPurposeImageId(null)}
                            style={tw`absolute inset-0 bg-black/88`}
                        />
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Close my reason image"
                            onPress={() => setViewingPurposeImageId(null)}
                            hitSlop={12}
                            style={({pressed}) => [
                                tw`absolute right-5 top-12 z-20 h-8 w-8 items-center justify-center`,
                                pressed && {opacity: 0.72, transform: [{translateY: 1}]},
                            ]}
                        >
                            <Ionicons name="close" size={20} color="#FFFFFF"/>
                        </Pressable>
                        {viewingPurposeImage ? (
                            <PurposePhotoFrame uri={viewingPurposeImage.dataUri} enlarged/>
                        ) : null}
                    </View>
                </Modal>
                <Modal
                    visible={Boolean(deletingPurposeImage)}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setDeletingPurposeImageId(null)}
                >
                    <View style={tw`flex-1 justify-center px-5`}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Cancel my reason image action"
                            onPress={() => setDeletingPurposeImageId(null)}
                            style={tw`absolute inset-0 bg-black/72`}
                        />
                        <View
                            style={[
                                tw`rounded-[28px] border p-5`,
                                {
                                    backgroundColor: purposeDialogSurfaceColor,
                                    borderColor: purposeDialogBorderColor,
                                    shadowColor: "#000000",
                                    shadowOffset: {width: 0, height: 16},
                                    shadowOpacity: 0.36,
                                    shadowRadius: 24,
                                    elevation: 12,
                                },
                            ]}
                        >
                            <Text
                                style={[tw`text-xs uppercase tracking-[2px]`, {
                                    fontFamily: fonts.body,
                                    color: purposeDialogMutedColor
                                }]}
                            >
                                My Reason
                            </Text>
                            <Text
                                style={[tw`mt-1 text-2xl`, {
                                    fontFamily: fonts.heading,
                                    color: purposeDialogTextColor
                                }]}
                            >
                                My Reason photo
                            </Text>
                            <Text
                                style={[tw`mt-3 text-sm leading-5`, {
                                    fontFamily: fonts.body,
                                    color: purposeDialogMutedColor
                                }]}
                            >
                                Delete this encrypted photo from My Reason.
                            </Text>
                            <View style={tw`mt-5 gap-2`}>
                                <View style={tw`flex-row gap-2`}>
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel="Cancel my reason image action"
                                        onPress={() => setDeletingPurposeImageId(null)}
                                        style={({pressed}) => [
                                            tw`flex-1 rounded-xl border px-3 py-3`,
                                            {
                                                borderColor: purposeDialogBorderColor,
                                                backgroundColor: "rgba(255,255,255,0.08)",
                                            },
                                            pressed && {opacity: 0.75, transform: [{translateY: 1}]},
                                        ]}
                                    >
                                        <Text
                                            style={[tw`text-center text-xs`, {
                                                fontFamily: fonts.button,
                                                color: purposeDialogTextColor
                                            }]}
                                        >
                                            Cancel
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel="Delete my reason image"
                                        onPress={() => {
                                            if (!deletingPurposeImage) return;
                                            haptics.deleteTask();
                                            void journal.deletePurposeImage(deletingPurposeImage.id);
                                            setDeletingPurposeImageId(null);
                                            if (viewingPurposeImageId === deletingPurposeImage.id) {
                                                setViewingPurposeImageId(null);
                                            }
                                        }}
                                        style={({pressed}) => [
                                            tw`flex-1 rounded-xl border px-3 py-3`,
                                            {
                                                borderColor: "#C82D00",
                                                backgroundColor: "#FF3800",
                                            },
                                            pressed && {opacity: 0.75, transform: [{translateY: 1}]},
                                        ]}
                                    >
                                        <Text
                                            style={[tw`text-center text-xs`, {
                                                fontFamily: fonts.button,
                                                color: "#FFF6E8"
                                            }]}
                                        >
                                            Delete
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </View>
                </Modal>
            </Animated.View>
        </ScreenBackground>
    );
}
