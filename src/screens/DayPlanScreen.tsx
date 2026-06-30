import {useMemo, useState} from "react";
import {Pressable, ScrollView, Text, View} from "react-native";
import tw from "../lib/tw";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import {toLocalISODate} from "../lib/date-utils";
import {getPlannerColor} from "../lib/planner-colors";
import {PlannerEventSheet} from "../components/PlannerEventSheet";
import type {PlannerEvent, PlannerEventsState} from "../state/usePlannerEvents";
import {TutorialCard} from "../components/TutorialCard";
import type {VisualMode} from "../state/useVisualMode";
import {ScreenBackground} from "../components/ScreenBackground";

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 23;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 56;
const TIME_COLUMN_WIDTH = 64;
const EVENT_RIGHT_INSET = 12;
const EVENT_LEFT_INSET = TIME_COLUMN_WIDTH + 4;
const EVENT_COLUMN_GAP = 4;

interface SlotRow {
    minutes: number;
    label: string;
    isHourMark: boolean;
}

interface PositionedEvent {
    event: PlannerEvent;
    startMin: number;
    endMin: number;
    column: number;
    columnCount: number;
}

function buildSlots(): SlotRow[] {
    const out: SlotRow[] = [];
    for (let hour = DAY_START_HOUR; hour <= DAY_END_HOUR; hour++) {
        for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
            if (hour === DAY_END_HOUR && minute > 0) continue;
            const period = hour >= 12 ? "PM" : "AM";
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            const label = minute === 0 ? `${displayHour} ${period}` : "";
            out.push({
                minutes: (hour - DAY_START_HOUR) * 60 + minute,
                label,
                isHourMark: minute === 0,
            });
        }
    }
    return out;
}

const SLOTS = buildSlots();
const TIMELINE_HEIGHT = SLOTS.length * SLOT_HEIGHT;
const TIMELINE_END_MINUTES = SLOTS[SLOTS.length - 1].minutes + SLOT_MINUTES;

function slotStartIso(date: string, slotMinutes: number): string {
    const totalMinutes = DAY_START_HOUR * 60 + slotMinutes;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

function eventDayKey(event: PlannerEvent): string {
    return toLocalISODate(new Date(event.startAt));
}

function minutesFromDayStart(iso: string): number {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 0;
    return (d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes();
}

function clampTimelineMinute(minutes: number): number {
    if (minutes < 0) return 0;
    if (minutes > TIMELINE_END_MINUTES) return TIMELINE_END_MINUTES;
    return minutes;
}

function eventsOverlap(a: { startMin: number; endMin: number }, b: { startMin: number; endMin: number }): boolean {
    return a.startMin < b.endMin && b.startMin < a.endMin;
}

function shadeHex(hex: string, amount = 0.72): string {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) return hex;

    const value = Number.parseInt(clean, 16);
    const r = Math.max(0, Math.min(255, Math.round(((value >> 16) & 255) * amount)));
    const g = Math.max(0, Math.min(255, Math.round(((value >> 8) & 255) * amount)));
    const b = Math.max(0, Math.min(255, Math.round((value & 255) * amount)));

    return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) return hex;

    const value = Number.parseInt(clean, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function layoutOverlappingEvents(events: PlannerEvent[]): PositionedEvent[] {
    const normalized = events
        .map((event) => {
            const startMin = clampTimelineMinute(minutesFromDayStart(event.startAt));
            const rawEndMin = clampTimelineMinute(minutesFromDayStart(event.endAt));
            const endMin = Math.min(TIMELINE_END_MINUTES, Math.max(startMin + SLOT_MINUTES, rawEndMin));
            return {event, startMin, endMin};
        })
        .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin || a.event.id.localeCompare(b.event.id));

    const positioned: PositionedEvent[] = [];
    let cluster: typeof normalized = [];
    let clusterEnd = -1;

    function flushCluster() {
        if (cluster.length === 0) return;

        const columnEnds: number[] = [];
        const clusterItems: PositionedEvent[] = cluster.map((item) => {
            const reusableColumn = columnEnds.findIndex((endMin) => endMin <= item.startMin);
            const column = reusableColumn >= 0 ? reusableColumn : columnEnds.length;
            columnEnds[column] = item.endMin;

            return {
                ...item,
                column,
                columnCount: 1,
            };
        });

        const columnCount = Math.max(1, columnEnds.length);
        positioned.push(...clusterItems.map((item) => ({...item, columnCount})));
        cluster = [];
        clusterEnd = -1;
    }

    normalized.forEach((item) => {
        if (cluster.length > 0 && !eventsOverlap({startMin: item.startMin, endMin: item.endMin}, {
            startMin: cluster[0].startMin,
            endMin: clusterEnd,
        })) {
            flushCluster();
        }

        cluster.push(item);
        clusterEnd = Math.max(clusterEnd, item.endMin);
    });

    flushCluster();
    return positioned;
}

function formatDateHeader(date: string): string {
    const d = new Date(`${date}T00:00:00`);
    return d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
    });
}

function shiftDate(date: string, deltaDays: number): string {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + deltaDays);
    return toLocalISODate(d);
}

interface DayPlanScreenProps {
    planner: PlannerEventsState;
    visualMode: VisualMode;
    showTutorial?: boolean;
    onDismissTutorial?: () => void;
}

export function DayPlanScreen({planner, visualMode, showTutorial, onDismissTutorial}: DayPlanScreenProps) {
    const today = toLocalISODate();
    const [date, setDate] = useState(today);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
    const [sheetStartAt, setSheetStartAt] = useState<string | undefined>(undefined);
    const [sheetEvent, setSheetEvent] = useState<PlannerEvent | undefined>(undefined);
    const bg = visualMode === "georgia"
        ? require("../../public/images/rhbull3.jpg")
        : require("../../public/images/rh16.jpg");
    const coastMode = visualMode === "coast";
    const coastOrRiver = visualMode === "river" || coastMode;
    const georgiaMode = visualMode === "georgia";
    const primaryTextColor = coastOrRiver || georgiaMode ? "#111111" : "#E4E0D4";
    const mutedTextColor = coastOrRiver || georgiaMode ? "rgba(17,17,17,0.58)" : "rgba(228,224,212,0.55)";
    const planHeaderTextColor = coastMode || georgiaMode ? "#FFFFFF" : primaryTextColor;

    const dayEvents = useMemo(
        () =>
            planner.events
                .filter((e) => eventDayKey(e) === date)
                .sort((a, b) => a.startAt.localeCompare(b.startAt)),
        [planner.events, date],
    );
    const positionedEvents = useMemo(() => layoutOverlappingEvents(dayEvents), [dayEvents]);

    function openCreateForSlot(slotMinutes: number) {
        haptics.selection();
        setSheetMode("create");
        setSheetStartAt(slotStartIso(date, slotMinutes));
        setSheetEvent(undefined);
        setSheetVisible(true);
    }

    function openEditForEvent(event: PlannerEvent) {
        haptics.selection();
        setSheetMode("edit");
        setSheetStartAt(undefined);
        setSheetEvent(event);
        setSheetVisible(true);
    }

    function goPrev() {
        haptics.selection();
        setDate((d) => shiftDate(d, -1));
    }

    function goNext() {
        haptics.selection();
        setDate((d) => shiftDate(d, 1));
    }

    function goToday() {
        haptics.selection();
        setDate(today);
    }

    const isToday = date === today;

    return (
        <ScreenBackground visualMode={visualMode} source={bg}>
            <View
                style={[
                    tw`flex-1`,
                    {paddingHorizontal: 1},
                ]}
            >
                <View style={tw`flex-row items-center justify-between px-4 pt-3 pb-2`}>
                    <Pressable
                        onPress={goPrev}
                        style={({pressed}) => [
                            tw`h-9 w-9 items-center justify-center rounded-full border border-[#2c2c2c]`,
                            pressed && tw`opacity-70`,
                        ]}
                    >
                        <Text style={[tw`text-base`, {fontFamily: fonts.heading, color: planHeaderTextColor}]}>‹</Text>
                    </Pressable>

                    <View style={tw`flex-1 items-center`}>
                        <Text style={[tw`text-lg`, {fontFamily: fonts.heading, color: planHeaderTextColor}]}>
                            {formatDateHeader(date)}
                        </Text>
                        {!isToday ? (
                            <Pressable
                                onPress={goToday}
                                style={({pressed}) => [
                                    tw`mt-1 rounded-full border border-[#B55941]/69 px-3 py-0.5`,
                                    pressed && tw`opacity-70`,
                                ]}
                            >
                                <Text
                                    style={[tw`text-[10px] text-[#B55941]`, {fontFamily: fonts.button}]}
                                >
                                    Jump to today
                                </Text>
                            </Pressable>
                        ) : null}
                    </View>

                    <Pressable
                        onPress={goNext}
                        style={({pressed}) => [
                            tw`h-9 w-9 items-center justify-center rounded-full border border-[#2c2c2c]`,
                            pressed && tw`opacity-70`,
                        ]}
                    >
                        <Text style={[tw`text-base`, {fontFamily: fonts.heading, color: planHeaderTextColor}]}>›</Text>
                    </Pressable>
                </View>

                <ScrollView
                    style={tw`flex-1`}
                    contentContainerStyle={tw`pb-28`}
                    showsVerticalScrollIndicator={false}
                >
                    {showTutorial && onDismissTutorial ? (
                        <View style={tw`px-4 pb-3`}>
                            <TutorialCard
                                title="Beat the Burn-out"
                                body="Tap a time slot to plan it, I'll remind you 15 minutes before it starts."
                                onDismiss={onDismissTutorial}
                            />
                        </View>
                    ) : null}

                    <View style={{height: TIMELINE_HEIGHT, position: "relative"}}>
                        {SLOTS.map((slot) => (
                            <Pressable
                                key={slot.minutes}
                                onPress={() => openCreateForSlot(slot.minutes)}
                                style={({pressed}) => [
                                    tw`flex-row`,
                                    {
                                        position: "absolute",
                                        top: (slot.minutes / SLOT_MINUTES) * SLOT_HEIGHT,
                                        left: 0,
                                        right: 0,
                                        height: SLOT_HEIGHT,
                                    },
                                    pressed && {backgroundColor: "rgba(228,224,212,0.04)"},
                                ]}
                            >
                                <View style={{width: TIME_COLUMN_WIDTH, paddingLeft: 12}}>
                                    {slot.isHourMark ? (
                                        <Text
                                            style={[
                                                tw`text-[10px]`,
                                                {fontFamily: fonts.body, color: mutedTextColor},
                                            ]}
                                        >
                                            {slot.label}
                                        </Text>
                                    ) : null}
                                </View>
                                <View
                                    style={[
                                        tw`flex-1`,
                                        {
                                            borderTopWidth: slot.isHourMark ? 1 : 0.5,
                                            borderTopColor: slot.isHourMark
                                                ? coastOrRiver ? "rgba(17,17,17,0.24)" : "rgba(228,224,212,0.18)"
                                                : coastOrRiver ? "rgba(17,17,17,0.12)" : "rgba(228,224,212,0.08)",
                                        },
                                    ]}
                                />
                            </Pressable>
                        ))}

                        <View
                            pointerEvents="box-none"
                            style={{
                                position: "absolute",
                                top: 0,
                                bottom: 0,
                                left: EVENT_LEFT_INSET,
                                right: EVENT_RIGHT_INSET,
                            }}
                        >
                            {positionedEvents.map(({event, startMin, endMin, column, columnCount}) => {
                                const top = (startMin / SLOT_MINUTES) * SLOT_HEIGHT;
                                const height = Math.max(SLOT_HEIGHT - 4, ((endMin - startMin) / SLOT_MINUTES) * SLOT_HEIGHT - 4);
                                const columnWidth = 100 / columnCount;
                                const palette = getPlannerColor(event.color);
                                const shadedBorder = shadeHex(palette.hex, 0.55);
                                const showDescription = Boolean(event.description) && height >= 36;
                                const descriptionLines = height > SLOT_HEIGHT + 6 ? 2 : 1;

                                return (
                                    <Pressable
                                        key={event.id}
                                        onPress={() => openEditForEvent(event)}
                                        style={({pressed}) => [
                                            {
                                                position: "absolute",
                                                top: top + 2,
                                                left: `${column * columnWidth}%`,
                                                width: `${columnWidth}%`,
                                                height,
                                                paddingRight: column < columnCount - 1 ? EVENT_COLUMN_GAP : 0,
                                                zIndex: 10 + column,
                                            },
                                            pressed && {opacity: 0.85, transform: [{scale: 0.98}]},
                                        ]}
                                    >
                                        <View
                                            pointerEvents="none"
                                            style={{
                                                position: "absolute",
                                                top: 3,
                                                left: 2,
                                                right: column < columnCount - 1 ? EVENT_COLUMN_GAP + 1 : -1,
                                                bottom: -2,
                                                borderRadius: 13,
                                                backgroundColor: hexToRgba(shadedBorder, 0.72),
                                            }}
                                        />
                                        <View
                                            style={{
                                                flex: 1,
                                                backgroundColor: palette.softHex,
                                                borderWidth: 1.5,
                                                borderColor: palette.hex,
                                                borderRightColor: shadedBorder,
                                                borderBottomColor: shadedBorder,
                                                borderRadius: 12,
                                                paddingHorizontal: columnCount > 2 ? 7 : 10,
                                                paddingVertical: 6,
                                                overflow: "hidden",
                                            }}
                                        >
                                            <Text
                                                numberOfLines={1}
                                                style={[
                                                    tw`text-sm text-[#E4E0D4]`,
                                                    {fontFamily: fonts.heading},
                                                ]}
                                            >
                                                {event.title}
                                            </Text>
                                            {showDescription ? (
                                                <Text
                                                    numberOfLines={descriptionLines}
                                                    style={[
                                                        tw`mt-0.5 text-[10px] text-[#E4E0D4]/72`,
                                                        {fontFamily: fonts.body},
                                                    ]}
                                                >
                                                    {event.description}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    {dayEvents.length === 0 && planner.isLoaded ? (
                        <Text
                            style={[
                                tw`absolute top-1/3 self-center text-sm`,
                                {fontFamily: fonts.body, color: coastOrRiver || georgiaMode ? "rgba(17,17,17,0.6)" : "rgba(228,224,212,0.6)"},
                            ]}
                        >
                            Tap any slot to plan your day
                        </Text>
                    ) : null}
                </ScrollView>

                <PlannerEventSheet
                    visible={sheetVisible}
                    mode={sheetMode}
                    date={date}
                    initialStartAt={sheetStartAt}
                    initialEvent={sheetEvent}
                    onClose={() => setSheetVisible(false)}
                    onCreate={async (input) => {
                        await planner.createEvent(input);
                    }}
                    onUpdate={async (id, patch) => {
                        await planner.updateEvent(id, patch);
                    }}
                    onDelete={async (id) => {
                        await planner.deleteEvent(id);
                    }}
                />
            </View>
        </ScreenBackground>
    );
}
