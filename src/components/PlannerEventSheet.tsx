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

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 23;
const SLOT_MINUTES = 30;

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
                <View style={tw`overflow-hidden rounded-[28px] border border-slate-200/11 bg-black/10 p-1`}>
                    <BlurView
                        intensity={72}
                        tint="dark"
                        style={tw`overflow-hidden rounded-[24px] border border-slate-200/39`}
                    >
                        <View
                            pointerEvents="none"
                            style={[StyleSheet.absoluteFill, {backgroundColor: "rgba(0,0,0,0.47)"}]}
                        />
                        <LinearGradient
                            colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.04)", "transparent"]}
                            locations={[0, 0.5, 1]}
                            pointerEvents="none"
                            style={[tw`absolute left-0 right-0 top-0`, {height: "45%"}]}
                        />
                        <LinearGradient
                            colors={["transparent", "rgba(0,0,0,0.35)"]}
                            pointerEvents="none"
                            style={[tw`absolute left-0 right-0 bottom-0`, {height: "28%"}]}
                        />

                        <View style={tw`p-5`}>
                            <Text style={[tw`text-xl text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                                {mode === "edit" ? "Edit event" : "New event"}
                            </Text>

                            {mode === "create" ? (
                                <>
                                    <Text style={[tw`mt-4 text-xs text-slate-400`, {fontFamily: fonts.body}]}>
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
                                                            tw`rounded-full border px-3 py-1.5`,
                                                            active
                                                                ? {
                                                                    borderColor: "#E4E0D4",
                                                                    backgroundColor: "rgba(228,224,212,0.14)",
                                                                }
                                                                : {borderColor: "rgba(226,232,240,0.39)"},
                                                            pressed && tw`opacity-80`,
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                tw`text-xs`,
                                                                {
                                                                    fontFamily: fonts.body,
                                                                    color: active ? "#E4E0D4" : "#94a3b8",
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
                                style={tw`mt-4 px-4 py-3`}
                            />
                            <Input
                                placeholder="Description (optional)"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                style={tw`mt-3 px-4 py-3 min-h-[60px]`}
                            />

                            <Text style={[tw`mt-4 text-xs text-slate-400`, {fontFamily: fonts.body}]}>
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
                                                    tw`rounded-full border px-3 py-1.5`,
                                                    active
                                                        ? {
                                                            borderColor: "#B55941",
                                                            backgroundColor: "rgba(181,89,65,0.18)"
                                                        }
                                                        : {borderColor: "#2c2c2c"},
                                                    pressed && tw`opacity-80`,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        tw`text-xs`,
                                                        {fontFamily: fonts.body, color: active ? "#E4E0D4" : "#94a3b8"},
                                                    ]}
                                                >
                                                    {slot.label}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </ScrollView>

                            <Text style={[tw`mt-4 text-xs text-slate-400`, {fontFamily: fonts.body}]}>
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
                                                tw`rounded-full border px-3 py-1.5`,
                                                active
                                                    ? {borderColor: "#B55941", backgroundColor: "rgba(181,89,65,0.18)"}
                                                    : {borderColor: "#2c2c2c"},
                                                pressed && tw`opacity-80`,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    tw`text-xs`,
                                                    {fontFamily: fonts.body, color: active ? "#E4E0D4" : "#94a3b8"},
                                                ]}
                                            >
                                                {opt.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            <Text style={[tw`mt-4 text-xs text-slate-400`, {fontFamily: fonts.body}]}>
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
                                                tw`h-10 w-10 rounded-full items-center justify-center`,
                                                {
                                                    backgroundColor: c.hex,
                                                    borderWidth: active ? 2 : 0,
                                                    borderColor: "#E4E0D4",
                                                },
                                                pressed && tw`opacity-80`,
                                            ]}
                                        >
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
                                            onPress={() => {
                                                void handleDelete();
                                            }}
                                            disabled={busy}
                                        />
                                    ) : null}
                                    <Button
                                        label={busy ? "Saving..." : "Save"}
                                        variant="outlineAccent"
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
