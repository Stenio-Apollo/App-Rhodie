import {useEffect, useMemo, useState} from "react";
import {Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View} from "react-native";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import {Input} from "./ui/Input";
import {Button} from "./ui/Button";
import {PLANNER_COLORS, type PlannerEventColor} from "../lib/planner-colors";
import type {CreatePlannerEventInput, PlannerEvent, UpdatePlannerEventInput} from "../state/usePlannerEvents";
import type {VisualMode} from "../state/useVisualMode";

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 23;
const SLOT_MINUTES = 30;
const ACCENT_PANEL_COLOR = "#DAC8AE";

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

interface PlannerEventSheetProps {
    visible: boolean;
    mode: "create" | "edit";
    date: string; // YYYY-MM-DD
    initialEvent?: PlannerEvent;
    initialStartAt?: string; // ISO datetime, for create mode
    onClose: () => void;
    onCreate: (input: CreatePlannerEventInput) => Promise<void>;
    onUpdate: (id: string, patch: UpdatePlannerEventInput) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    visualMode: VisualMode;
}

type SlotOption = { minutes: number; label: string; iso: (date: string) => string };
type DurationOption = { minutes: number; label: string };
type EventPreset = {
    title: string;
    color: PlannerEventColor;
    startMinute?: number;
    endMinute?: number;
};

const DURATIONS: ReadonlyArray<DurationOption> = [
    {minutes: 30, label: "30m"},
    {minutes: 60, label: "1h"},
    {minutes: 90, label: "1.5h"},
    {minutes: 120, label: "2h"},
    {minutes: 180, label: "3h"},
    {minutes: 240, label: "4h"},
];

const EVENT_PRESETS: ReadonlyArray<EventPreset> = [
    {title: "Breakfast", color: "personal", startMinute: 6 * 60, endMinute: 12 * 60},
    {title: "Brunch", color: "personal", startMinute: 12 * 60, endMinute: 13 * 60},
    {title: "Lunch", color: "personal", startMinute: 11 * 60, endMinute: 15 * 60},
    {title: "Dinner", color: "personal", startMinute: 17 * 60, endMinute: 22 * 60},
    {title: "Game Day", color: "social"},
    {title: "Graduation", color: "social"},
    {title: "Practice", color: "health"},
    {title: "Parent Teacher Meeting", color: "personal"},
    {title: "Project", color: "work"},
    {title: "Presentation", color: "work"},
    {title: "Panel", color: "work"},
    {title: "Meeting", color: "work"},
    {title: "Closing Day", color: "errand"},
];

function formatTimeLabel(hour: number, minute: number): string {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

function localSlotIso(date: string, hour: number, minute: number): string {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

function buildSlots(): SlotOption[] {
    const out: SlotOption[] = [];
    for (let hour = DAY_START_HOUR; hour <= DAY_END_HOUR; hour++) {
        for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
            if (hour === DAY_END_HOUR && minute > 0) continue;
            const minutesFromDayStart = (hour - DAY_START_HOUR) * 60 + minute;
            out.push({
                minutes: minutesFromDayStart,
                label: formatTimeLabel(hour, minute),
                iso: (date) => localSlotIso(date, hour, minute),
            });
        }
    }
    return out;
}

const SLOTS = buildSlots();

function isPresetVisibleForStart(preset: EventPreset, startMinutes: number): boolean {
    if (preset.startMinute === undefined || preset.endMinute === undefined) return true;
    const absoluteStartMinutes = DAY_START_HOUR * 60 + startMinutes;
    return absoluteStartMinutes >= preset.startMinute && absoluteStartMinutes < preset.endMinute;
}

function minutesSinceDayStart(iso: string): number {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 0;
    return (d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes();
}

function nearestSlotMinutes(minutes: number): number {
    const max = SLOTS[SLOTS.length - 1].minutes;
    if (minutes < 0) return 0;
    if (minutes > max) return max;
    return Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}

export function PlannerEventSheet({
                                      visible,
                                      mode,
                                      date,
                                      initialEvent,
                                      initialStartAt,
                                      onClose,
                                      onCreate,
                                      onUpdate,
                                      onDelete,
                                      visualMode,
                                  }: PlannerEventSheetProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startMinutes, setStartMinutes] = useState(0);
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [color, setColor] = useState<PlannerEventColor>("personal");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) return;
        setError(null);
        setBusy(false);
        if (mode === "edit" && initialEvent) {
            setTitle(initialEvent.title);
            setDescription(initialEvent.description ?? "");
            const startMin = nearestSlotMinutes(minutesSinceDayStart(initialEvent.startAt));
            const endMin = nearestSlotMinutes(minutesSinceDayStart(initialEvent.endAt));
            const duration = Math.max(SLOT_MINUTES, endMin - startMin);
            setStartMinutes(startMin);
            setDurationMinutes(duration);
            setColor(initialEvent.color);
        } else {
            setTitle("");
            setDescription("");
            const startMin = initialStartAt
                ? nearestSlotMinutes(minutesSinceDayStart(initialStartAt))
                : 0;
            setStartMinutes(startMin);
            setDurationMinutes(30);
            setColor("personal");
        }
    }, [visible, mode, initialEvent, initialStartAt]);

    const startSlot = useMemo(
        () => SLOTS.find((s) => s.minutes === startMinutes) ?? SLOTS[0],
        [startMinutes],
    );
    const visiblePresets = useMemo(
        () => EVENT_PRESETS.filter((preset) => isPresetVisibleForStart(preset, startMinutes)),
        [startMinutes],
    );
    const georgiaMode = visualMode === "georgia" || visualMode === "evergreen" || visualMode === "navy";
    const riverMode = visualMode === "river";
    const sonnyMode = visualMode === "sonny";
    const lightMode = riverMode;
    const themeSurfaceColor = georgiaMode ? "rgba(0,0,0,0.12)" : riverMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)";
    const themeTextColor = georgiaMode || sonnyMode ? "#FFFFFF" : riverMode ? "#111111" : "#E4E0D4";
    const themeMutedTextColor = georgiaMode || sonnyMode ? "rgba(255,255,255,0.68)" : riverMode ? "rgba(17,17,17,0.58)" : "rgba(228,224,212,0.68)";
    const themeBorderColor = georgiaMode ? "rgba(255,255,255,0.22)" : riverMode ? "rgba(17,17,17,0.14)" : sonnyMode ? "rgba(255,255,255,0.24)" : "#334155";
    const themeInputBackgroundColor = georgiaMode ? "rgba(0,0,0,0.32)" : riverMode ? "rgba(255,255,255,0.34)" : sonnyMode ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.35)";
    const themePressedBackgroundColor = georgiaMode ? "rgba(0,0,0,0.32)" : riverMode ? "rgba(255,255,255,0.34)" : sonnyMode ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.35)";
    const sheetOverlayColor = georgiaMode ? "rgba(0,0,0,0.28)" : riverMode ? "rgba(255,255,255,0.42)" : sonnyMode ? "rgba(0,0,0,0.34)" : "rgba(0,0,0,0.77)";
    const sheetGradientTopColor = georgiaMode ? "rgba(255,255,255,0.14)" : riverMode ? "rgba(232,244,255,0.30)" : sonnyMode ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.04)";
    const sheetGradientMidColor = georgiaMode ? "rgba(255,255,255,0.04)" : riverMode ? "rgba(210,232,255,0.06)" : sonnyMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)";
    const sheetGradientBottomColor = georgiaMode ? "rgba(0,0,0,0.1)" : riverMode ? "rgba(223,196,170,0.16)" : "rgba(0,0,0,0.35)";
    const inputStyle = {
        borderColor: themeBorderColor,
        backgroundColor: themeInputBackgroundColor,
        color: themeTextColor,
    };
    const inactiveChipStyle = {
        borderColor: themeBorderColor,
        backgroundColor: themePressedBackgroundColor,
        ...buttonDepthStyle,
    };
    const activeChipStyle = {
        borderColor: ACCENT_PANEL_COLOR,
        backgroundColor: ACCENT_PANEL_COLOR,
        ...buttonDepthStyle,
    };
    const activeChipTextColor = "#0f0f0f";

    const endMinutesAbs = startMinutes + durationMinutes;
    const endHour = DAY_START_HOUR + Math.floor(endMinutesAbs / 60);
    const endMinute = endMinutesAbs % 60;
    const endLabel = formatTimeLabel(endHour > 23 ? 23 : endHour, endHour > 23 ? 30 : endMinute);

    function buildStartIso(): string {
        return startSlot.iso(date);
    }

    function buildEndIso(): string {
        const startIso = buildStartIso();
        const start = new Date(startIso);
        const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
        return end.toISOString();
    }

    async function handleSubmit() {
        if (!title.trim()) {
            setError("Title is required");
            return;
        }
        Keyboard.dismiss();
        setBusy(true);
        setError(null);
        try {
            if (mode === "edit" && initialEvent) {
                await onUpdate(initialEvent.id, {
                    title,
                    description: description || null,
                    startAt: buildStartIso(),
                    endAt: buildEndIso(),
                    color,
                });
            } else {
                await onCreate({
                    title,
                    description: description || null,
                    startAt: buildStartIso(),
                    endAt: buildEndIso(),
                    color,
                });
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save");
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete() {
        if (!initialEvent) return;
        Keyboard.dismiss();
        setBusy(true);
        try {
            await onDelete(initialEvent.id);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not delete");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={tw`flex-1 justify-center bg-black/72 px-5`} onPress={Keyboard.dismiss}>
                <View style={[tw`overflow-hidden rounded-[28px] border p-1`, {
                    borderColor: themeBorderColor,
                    backgroundColor: themeSurfaceColor,
                }]}>
                    <BlurView
                        intensity={72}
                        tint={lightMode ? "light" : "dark"}
                        style={[tw`overflow-hidden rounded-[24px] border`, {borderColor: themeBorderColor}]}
                    >
                        <View
                            pointerEvents="none"
                            style={[StyleSheet.absoluteFill, {backgroundColor: sheetOverlayColor}]}
                        />
                        <LinearGradient
                            colors={[sheetGradientTopColor, sheetGradientMidColor, "transparent"]}
                            locations={[0, 0.5, 1]}
                            pointerEvents="none"
                            style={[tw`absolute left-0 right-0 top-0`, {height: "45%"}]}
                        />
                        <LinearGradient
                            colors={["transparent", sheetGradientBottomColor]}
                            pointerEvents="none"
                            style={[tw`absolute left-0 right-0 bottom-0`, {height: "28%"}]}
                        />

                        <View style={tw`p-5`}>
                            <Text style={[tw`text-xl`, {fontFamily: fonts.heading, color: themeTextColor}]}>
                                {mode === "edit" ? "Edit event" : "New event"}
                            </Text>

                            {mode === "create" ? (
                                <>
                                    <Text style={[tw`mt-4 text-xs`, {fontFamily: fonts.body, color: themeMutedTextColor}]}>
                                        Presets
                                    </Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={tw`mt-2`}
                                    >
                                        <View style={tw`flex-row gap-2`}>
                                            {visiblePresets.map((preset) => {
                                                const active = title.trim().toLowerCase() === preset.title.toLowerCase();
                                                return (
                                                    <Pressable
                                                        key={preset.title}
                                                        onPress={() => {
                                                            haptics.selection();
                                                            setTitle(preset.title);
                                                            setColor(preset.color);
                                                        }}
                                                        style={({pressed}) => [
                                                            tw`overflow-hidden rounded-full border px-3 py-1.5`,
                                                            active ? activeChipStyle : inactiveChipStyle,
                                                            pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                                                        ]}
                                                    >
                                                        <ButtonShine/>
                                                        <Text
                                                            style={[
                                                                tw`text-xs`,
                                                                {
                                                                    fontFamily: fonts.body,
                                                                    color: active ? activeChipTextColor : themeMutedTextColor,
                                                                },
                                                            ]}
                                                        >
                                                            {preset.title}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    </ScrollView>
                                </>
                            ) : null}

                            <Input
                                placeholder="Title"
                                value={title}
                                onChangeText={setTitle}
                                placeholderTextColor={themeMutedTextColor}
                                keyboardAppearance={lightMode ? "light" : "dark"}
                                style={[tw`mt-4 px-4 py-3`, inputStyle]}
                            />
                            <Input
                                placeholder="Description (optional)"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                placeholderTextColor={themeMutedTextColor}
                                keyboardAppearance={lightMode ? "light" : "dark"}
                                style={[tw`mt-3 px-4 py-3 min-h-[60px]`, inputStyle]}
                            />

                            <Text style={[tw`mt-4 text-xs`, {fontFamily: fonts.body, color: themeMutedTextColor}]}>
                                Start time
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={tw`mt-2`}
                            >
                                <View style={tw`flex-row gap-2`}>
                                    {SLOTS.map((slot) => {
                                        const active = slot.minutes === startMinutes;
                                        return (
                                            <Pressable
                                                key={slot.minutes}
                                                onPress={() => {
                                                    haptics.selection();
                                                    setStartMinutes(slot.minutes);
                                                }}
                                                style={({pressed}) => [
                                                    tw`overflow-hidden rounded-full border px-3 py-1.5`,
                                                    active
                                                        ? activeChipStyle
                                                        : inactiveChipStyle,
                                                    pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                                                ]}
                                            >
                                                <ButtonShine/>
                                                <Text
                                                    style={[
                                                        tw`text-xs`,
                                                        {fontFamily: fonts.body, color: active ? activeChipTextColor : themeMutedTextColor},
                                                    ]}
                                                >
                                                    {slot.label}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </ScrollView>

                            <Text style={[tw`mt-4 text-xs`, {fontFamily: fonts.body, color: themeMutedTextColor}]}>
                                Duration ({endLabel})
                            </Text>
                            <View style={tw`mt-2 flex-row flex-wrap gap-2`}>
                                {DURATIONS.map((opt) => {
                                    const active = opt.minutes === durationMinutes;
                                    return (
                                        <Pressable
                                            key={opt.minutes}
                                            onPress={() => {
                                                haptics.selection();
                                                setDurationMinutes(opt.minutes);
                                            }}
                                            style={({pressed}) => [
                                                tw`overflow-hidden rounded-full border px-3 py-1.5`,
                                                active
                                                    ? activeChipStyle
                                                    : inactiveChipStyle,
                                                pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                                            ]}
                                        >
                                            <ButtonShine/>
                                            <Text
                                                style={[
                                                    tw`text-xs`,
                                                    {fontFamily: fonts.body, color: active ? activeChipTextColor : themeMutedTextColor},
                                                ]}
                                            >
                                                {opt.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            <Text style={[tw`mt-4 text-xs`, {fontFamily: fonts.body, color: themeMutedTextColor}]}>
                                Color
                            </Text>
                            <View style={tw`mt-2 flex-row flex-wrap gap-2`}>
                                {PLANNER_COLORS.map((c) => {
                                    const active = c.id === color;
                                    return (
                                        <Pressable
                                            key={c.id}
                                            onPress={() => {
                                                haptics.selection();
                                                setColor(c.id);
                                            }}
                                            style={({pressed}) => [
                                                tw`h-10 w-10 overflow-hidden rounded-full items-center justify-center`,
                                                {
                                                    backgroundColor: c.hex,
                                                    borderWidth: active ? 2 : 0,
                                                    borderColor: themeTextColor,
                                                    ...buttonDepthStyle,
                                                },
                                                pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                                            ]}
                                        >
                                            <ButtonShine/>
                                            {active ? (
                                                <Text
                                                    style={[tw`text-xs text-white`, {fontFamily: fonts.heading}]}>✓</Text>
                                            ) : null}
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {error ? (
                                <Text style={[tw`mt-4 text-xs text-rose-300`, {fontFamily: fonts.body}]}>{error}</Text>
                            ) : null}

                            <View style={tw`mt-5 flex-row justify-between gap-2`}>
                                <Button
                                    label="Cancel"
                                    variant="secondary"
                                    style={{
                                        borderColor: themeBorderColor,
                                        backgroundColor: lightMode ? "rgba(17,17,17,0.14)" : "rgba(255,255,255,0.16)",
                                        ...buttonDepthStyle,
                                    }}
                                    textStyle={{color: themeTextColor}}
                                    shine
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        onClose();
                                    }}
                                />
                                <View style={tw`flex-row gap-2`}>
                                    {mode === "edit" && initialEvent ? (
                                        <Button
                                            label="Delete"
                                            variant="danger"
                                            style={{
                                                borderColor: "#FF3800",
                                                backgroundColor: "#FF3800",
                                                ...buttonDepthStyle,
                                            }}
                                            textStyle={{color: "#FFFFFF"}}
                                            shine
                                            onPress={() => {
                                                void handleDelete();
                                            }}
                                            disabled={busy}
                                        />
                                    ) : null}
                                    <Button
                                        label={busy ? "Saving..." : "Save"}
                                        variant="outlineAccent"
                                        style={{
                                            borderColor: ACCENT_PANEL_COLOR,
                                            backgroundColor: ACCENT_PANEL_COLOR,
                                            ...buttonDepthStyle,
                                        }}
                                        textStyle={{color: activeChipTextColor}}
                                        shine
                                        onPress={() => {
                                            void handleSubmit();
                                        }}
                                        disabled={busy}
                                    />
                                </View>
                            </View>
                        </View>
                    </BlurView>
                </View>
            </Pressable>
        </Modal>
    );
}
