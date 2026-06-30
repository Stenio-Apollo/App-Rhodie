import {useEffect, useMemo, useRef, useState} from "react";
import {Alert, Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import type {Task, TaskPriority, TaskStatus} from "../types";
import {KanbanColumn} from "../components/KanbanColumn";
import {TranslucentCalendar} from "../components/TranslucentCalendar";
import {haptics} from "../lib/haptics";
import {toLocalISODate} from "../lib/date-utils";
import {TutorialCard} from "../components/TutorialCard";
import {fonts} from "../theme/fonts";
import type {VisualMode} from "../state/useVisualMode";
import {useKeyboardInset} from "../lib/useKeyboardInset";
import {ScreenBackground, useScreenVisualMode} from "../components/ScreenBackground";

const ACCENT = "#FF3800";
const SONNY_ACCENT = "#FF3800";
const CREAM = "#DFC4AA";
const TEXT_PRIMARY = "#E4E0D4";
const COAST_SURFACE_COLOR = "#708090";
const GEORGIA_SURFACE_COLOR = "#2F4F4F";
const SOLID_THEME_PLACEHOLDER_COLOR = "rgba(247,247,247,0.77)";

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

function ThemedField({
                         value,
                         onChangeText,
                         placeholder,
                         inputRef,
                     }: {
    value: string;
    onChangeText: (next: string) => void;
    placeholder: string;
    inputRef?: React.RefObject<TextInput>;
}) {
    const visualMode = useScreenVisualMode();
    const coastOrRiver = visualMode === "river" || visualMode === "coast";
    const coastMode = visualMode === "coast";
    const georgiaMode = visualMode === "georgia";
    const solidSurfaceColor = georgiaMode ? GEORGIA_SURFACE_COLOR : COAST_SURFACE_COLOR;
    const solidMode = coastMode || georgiaMode;
    const sonnyMode = visualMode === "sonny";
    const fieldTextColor = coastMode || georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : sonnyMode ? "#FFFFFF" : TEXT_PRIMARY;
    const fieldPlaceholderColor = georgiaMode || sonnyMode ? SOLID_THEME_PLACEHOLDER_COLOR : coastOrRiver ? "rgba(17,17,17,0.45)" : "rgba(223,196,170,0.5)";
    return (
        <View
            style={[
                tw`overflow-hidden rounded-xl border px-3 py-2.5`,
                coastOrRiver || georgiaMode
                    ? {
                        borderColor: coastOrRiver ? "rgba(17,17,17,0.14)" : "rgba(51,65,85,0.6)",
                        backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.34)",
                        ...buttonDepthStyle,
                    }
                    : {borderColor: sonnyMode ? "rgba(247,247,247,0.18)" : "#2c2c2c", backgroundColor: sonnyMode ? "#000000" : "rgba(15,15,15,0.94)", ...buttonDepthStyle},
            ]}
        >
            <ButtonShine/>
            <TextInput
                ref={inputRef}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={fieldPlaceholderColor}
                keyboardAppearance={visualMode === "river" ? "light" : "dark"}
                style={[tw`text-sm`, {fontFamily: fonts.body, color: fieldTextColor}]}
            />
        </View>
    );
}

function ThemedButton({
                          label,
                          icon,
                          onPress,
                          accent = false,
                          disabled = false,
                      }: {
    label: string;
    icon?: React.ComponentProps<typeof Ionicons>["name"];
    onPress: () => void;
    accent?: boolean;
    disabled?: boolean;
}) {
    const visualMode = useScreenVisualMode();
    const coastOrRiver = visualMode === "river" || visualMode === "coast";
    const coastMode = visualMode === "coast";
    const georgiaMode = visualMode === "georgia";
    const solidSurfaceColor = georgiaMode ? GEORGIA_SURFACE_COLOR : COAST_SURFACE_COLOR;
    const solidMode = coastMode || georgiaMode;
    const sonnyMode = visualMode === "sonny";
    const accentColor = visualMode === "sonny" ? SONNY_ACCENT : ACCENT;
    const georgiaButtonTextColor = "#FFFFFF";
    const pickDateButton = label === "Pick date" || label === "Hide";
    const badgeButton = pickDateButton;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            disabled={disabled}
            onPress={onPress}
            style={({pressed}) => [
                tw`overflow-hidden flex-row items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5`,
                accent
                    ? {borderColor: accentColor, backgroundColor: accentColor, ...buttonDepthStyle}
                    : badgeButton
                        ? {borderColor: "#ba885a", backgroundColor: "#ba885a", ...buttonDepthStyle}
                    : coastOrRiver || georgiaMode
                        ? {
                            borderColor: coastOrRiver ? "rgba(17,17,17,0.14)" : "rgba(51,65,85,0.6)",
                            backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.34)",
                            ...buttonDepthStyle,
                        }
                        : {borderColor: sonnyMode ? "rgba(247,247,247,0.18)" : "rgba(223,196,170,0.42)", backgroundColor: sonnyMode ? "#000000" : "rgba(15,15,15,0.92)", ...buttonDepthStyle},
                disabled && tw`opacity-50`,
                pressed && !disabled && {opacity: 0.78, transform: [{translateY: 1}]},
            ]}
        >
            <ButtonShine/>
            {icon ? (
                <Ionicons name={icon} size={14} color={coastMode || georgiaMode ? georgiaButtonTextColor : badgeButton ? "#0f0f0f" : accent ? "#FFF6E8" : coastOrRiver ? "#111111" : sonnyMode ? georgiaButtonTextColor : CREAM}/>
            ) : null}
            <Text
                style={[tw`text-[12px] font-semibold`, {
                    fontFamily: fonts.strong,
                    color: coastMode || georgiaMode ? georgiaButtonTextColor : badgeButton ? "#0f0f0f" : accent ? "#FFF6E8" : coastOrRiver ? "#111111" : sonnyMode ? georgiaButtonTextColor : CREAM,
                }]}
            >
                {label}
            </Text>
        </Pressable>
    );
}

interface KanbanScreenProps {
    tasksState: {
        tasks: Task[];
        grouped: {
            todo: Task[];
            completed: Task[];
        };
        addTask: (payload: {
            title: string;
            description: string;
            dueDate: string | null;
            dueTime: string | null;
            priority: TaskPriority;
            status?: TaskStatus;
        }) => void;
        deleteTask: (taskId: string) => void;
        move: (taskId: string, toStatus: TaskStatus, toIndex: number) => void;
    };
    focusTaskFormKey?: number;
    visualMode: VisualMode;
    showTutorial?: boolean;
    onDismissTutorial?: () => void;
    onBack?: () => void;
}

export function KanbanScreen({
                                 tasksState,
                                 focusTaskFormKey,
                                 visualMode,
                                 showTutorial,
                                 onDismissTutorial,
                                 onBack,
                             }: KanbanScreenProps) {
    const {tasks, grouped, addTask, deleteTask, move} = tasksState;
    const bg = visualMode === "georgia"
        ? require("../../public/images/rhCowboy.png")
        : require("../../public/images/rh28.jpg");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState<string | null>(null);
    const [priority, setPriority] = useState<TaskPriority>("medium");
    const [showCalendar, setShowCalendar] = useState(false);
    const [filterDate, setFilterDate] = useState<string | null>(null);
    const titleInputRef = useRef<TextInput>(null);
    const {keyboardInset} = useKeyboardInset();
    const fabBottom = useMemo(() => Animated.add(keyboardInset, 47), [keyboardInset]);
    const coastMode = visualMode === "coast";
    const georgiaMode = visualMode === "georgia";
    const solidSurfaceColor = georgiaMode ? GEORGIA_SURFACE_COLOR : COAST_SURFACE_COLOR;
    const solidMode = coastMode || georgiaMode;
    const coastOrRiver = visualMode === "river" || coastMode;
    const sonnyMode = visualMode === "sonny";
    const themeAccent = visualMode === "sonny" ? SONNY_ACCENT : ACCENT;
    const primaryTextColor = coastMode || georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : sonnyMode ? "#FFFFFF" : TEXT_PRIMARY;
    const accentTextColor = coastMode || georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : CREAM;

    const filteredGrouped = useMemo(() => {
        if (!filterDate) return grouped;
        return {
            todo: grouped.todo.filter((t) => t.dueDate === filterDate),
            completed: grouped.completed.filter((t) => t.dueDate === filterDate),
        };
    }, [grouped, filterDate]);

    const markedDates = useMemo(() => {
        const map: Record<string, { marked?: boolean; selected?: boolean; selectedColor?: string }> = {};

        tasks.forEach((task) => {
            if (!task.dueDate) return;
            map[task.dueDate] = {...(map[task.dueDate] ?? {}), marked: true};
        });

        if (dueDate) {
            map[dueDate] = {...(map[dueDate] ?? {}), selected: true, selectedColor: themeAccent};
        }
        if (filterDate && filterDate !== dueDate) {
            map[filterDate] = {...(map[filterDate] ?? {}), selected: true, selectedColor: themeAccent};
        }
        return map;
    }, [dueDate, filterDate, tasks, themeAccent]);

    const formattedDueDate = useMemo(() => {
        if (!dueDate) return null;
        const [year, month, day] = dueDate.split("-").map(Number);
        const date = new Date(year, (month ?? 1) - 1, day ?? 1);
        return date.toLocaleDateString(undefined, {weekday: "short", month: "short", day: "numeric"});
    }, [dueDate]);

    useEffect(() => {
        if (!focusTaskFormKey) return;
        const today = toLocalISODate();
        setDueDate(today);
        setFilterDate(today);
        setTimeout(() => {
            titleInputRef.current?.focus();
        }, 80);
    }, [focusTaskFormKey]);

    function handleAddTask() {
        if (!title.trim()) {
            Alert.alert("Title required", "Please enter a task title.");
            return;
        }

        addTask({title, description, dueDate, dueTime: null, priority, status: "todo"});
        haptics.createNewTask();

        setTitle("");
        setDescription("");
        setDueDate(null);
        setPriority("medium");
    }

    return (
        <ScreenBackground visualMode={visualMode} source={bg}>
            <View
                style={[
                    tw`flex-1`,
                    {paddingHorizontal: 1},
                ]}
            >
                <View style={tw`flex-1 px-2 pt-[51px]`}>
                        {showTutorial && onDismissTutorial ? (
                            <View style={tw`mb-3`}>
                                <TutorialCard
                                    title="get things done here!"
                                    body="Create.. Complete... Delete.. Repeat."
                                    onDismiss={onDismissTutorial}
                                />
                            </View>
                        ) : null}

                        <View style={[tw`mt-2 overflow-hidden rounded-[28px] p-1`, {backgroundColor: solidMode ? solidSurfaceColor : coastOrRiver ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}]}>
                            <BlurView
                                intensity={30}
                                tint={coastOrRiver ? "light" : "dark"}
                                style={[tw`overflow-hidden rounded-[24px] border`, {borderColor: coastOrRiver ? "rgba(17,17,17,0.14)" : "rgba(51,65,85,0.6)"}]}
                            >
                                <View
                                    pointerEvents="none"
                                    style={[StyleSheet.absoluteFill, {backgroundColor: solidMode ? solidSurfaceColor : coastOrRiver ? "rgba(255,255,255,0.34)" : "rgba(0,0,0,0.22)"}]}
                                />
                                <LinearGradient
                                    colors={["rgba(181,89,65,0.06)", "rgba(255,255,255,0.015)", "transparent"]}
                                    locations={[0, 0.5, 1]}
                                    pointerEvents="none"
                                    style={[tw`absolute left-0 right-0 top-0`, {height: "45%"}]}
                                />
                                <LinearGradient
                                    colors={["transparent", "rgba(0,0,0,0.18)"]}
                                    pointerEvents="none"
                                    style={[tw`absolute left-0 right-0 bottom-0`, {height: "28%"}]}
                                />

                                <View style={tw`gap-2 p-3`}>
                                    <Text style={[tw`text-[10px] uppercase tracking-[1px]`, {
                                        fontFamily: fonts.strong,
                                        color: accentTextColor,
                                        opacity: 0.7,
                                    }]}>
                                        New task
                                    </Text>
                                    <ThemedField
                                        inputRef={titleInputRef}
                                        value={title}
                                        onChangeText={setTitle}
                                        placeholder="Task title"
                                    />
                                    <ThemedField
                                        value={description}
                                        onChangeText={setDescription}
                                        placeholder="Description"
                                    />

                                    <View style={tw`flex-row items-center justify-between gap-2`}>
                                        <View
                                            style={[
                                                tw`flex-1 overflow-hidden flex-row items-center gap-2 rounded-xl border px-3 py-2.5`,
                                                coastOrRiver || georgiaMode
                                                    ? {
                                                        borderColor: coastOrRiver ? "rgba(17,17,17,0.14)" : "rgba(51,65,85,0.6)",
                                                        backgroundColor: solidMode ? solidSurfaceColor : "rgba(255,255,255,0.34)",
                                                        ...buttonDepthStyle,
                                                    }
                                                    : {borderColor: sonnyMode ? "rgba(247,247,247,0.18)" : "#2c2c2c", backgroundColor: sonnyMode ? "#000000" : "rgba(15,15,15,0.94)", ...buttonDepthStyle},
                                            ]}
                                        >
                                            <ButtonShine/>
                                            <Ionicons name="calendar-outline" size={14} color={coastMode || georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : sonnyMode ? "#FFFFFF" : CREAM}/>
                                            <Text style={[tw`flex-1 text-sm`, {
                                                fontFamily: fonts.body,
                                                color: dueDate
                                                    ? primaryTextColor
                                                    : georgiaMode || sonnyMode ? SOLID_THEME_PLACEHOLDER_COLOR : coastOrRiver ? "rgba(17,17,17,0.45)" : "rgba(223,196,170,0.55)",
                                            }]}>
                                                {dueDate ? `Due ${formattedDueDate}` : "No due date"}
                                            </Text>
                                            {dueDate ? (
                                                <Pressable
                                                    accessibilityRole="button"
                                                    accessibilityLabel="Clear due date"
                                                    onPress={() => {
                                                        haptics.selection();
                                                        setDueDate(null);
                                                    }}
                                                    hitSlop={8}
                                                >
                                                    <Ionicons name="close-circle" size={16} color={coastMode || georgiaMode ? "#FFFFFF" : coastOrRiver ? "#111111" : sonnyMode ? "#FFFFFF" : CREAM}/>
                                                </Pressable>
                                            ) : null}
                                        </View>
                                        <ThemedButton
                                            label={showCalendar ? "Hide" : "Pick date"}
                                            icon={showCalendar ? "chevron-up" : "calendar-outline"}
                                            onPress={() => setShowCalendar(!showCalendar)}
                                        />
                                    </View>

                                    {showCalendar && (
                                        <View>
                                            <TranslucentCalendar
                                                markedDates={markedDates}
                                                onDayPress={(day) => {
                                                    haptics.calendarDateSelected();
                                                    setDueDate(day.dateString);
                                                    setFilterDate(day.dateString);
                                                }}
                                            />
                                            {filterDate && (
                                                <View style={tw`pt-2`}>
                                                    <ThemedButton
                                                        label={`Clear filter (${filterDate})`}
                                                        icon="close-circle-outline"
                                                        onPress={() => setFilterDate(null)}
                                                    />
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    <View style={tw`mt-1`}>
                                        <Text style={[tw`mb-2 text-[10px] uppercase tracking-[1px]`, {
                                            fontFamily: fonts.strong,
                                            color: sonnyMode ? "#FFFFFF" : accentTextColor,
                                            opacity: 0.7,
                                        }]}>
                                            Priority
                                        </Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            <View style={tw`flex-row gap-2`}>
                                                {(["low", "medium", "high"] as TaskPriority[]).map((item) => {
                                                    const isActive = priority === item;
                                                    return (
                                                        <Pressable
                                                            key={item}
                                                            onPress={() => {
                                                                haptics.selection();
                                                                setPriority(item);
                                                            }}
                                                            style={({pressed}) => [
                                                                tw`overflow-hidden rounded-xl border px-3.5 py-2`,
                                                                isActive
                                                                ? {
                                                                        borderColor: georgiaMode ? "#DAC8AE" : coastOrRiver ? "#8FBBD0" : sonnyMode ? "#DAC8AE" : CREAM,
                                                                        backgroundColor: georgiaMode ? GEORGIA_SURFACE_COLOR : coastOrRiver ? "#B9D8E8" : sonnyMode ? "#DAC8AE" : CREAM,
                                                                        ...buttonDepthStyle,
                                                                    }
                                                                    : coastOrRiver || georgiaMode
                                                                        ? {
                                                                            borderColor: "rgba(17,17,17,0.14)",
                                                                            backgroundColor: "rgba(255,255,255,0.78)",
                                                                            ...buttonDepthStyle,
                                                                        }
                                                                : {
                                                                            borderColor: sonnyMode ? "rgba(247,247,247,0.18)" : "rgba(223,196,170,0.42)",
                                                                            backgroundColor: "rgba(15,15,15,0.92)",
                                                                            ...buttonDepthStyle,
                                                                        },
                                                                pressed && {opacity: 0.78, transform: [{translateY: 1}]},
                                                            ]}
                                                        >
                                                            <ButtonShine/>
                                                            <Text style={[tw`text-[11px] font-semibold uppercase tracking-[1px]`, {
                                                                fontFamily: fonts.strong,
                                                                color: georgiaMode ? (isActive ? "#FFFFFF" : "#0f0f0f") : coastOrRiver ? "#0f0f0f" : sonnyMode ? (isActive ? "#0f0f0f" : "#FFFFFF") : isActive ? "#0f0f0f" : CREAM,
                                                            }]}>
                                                                {item}
                                                            </Text>
                                                        </Pressable>
                                                    );
                                                })}
                                            </View>
                                        </ScrollView>
                                    </View>

                                </View>
                            </BlurView>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`pt-[5px]`}>
                            <View style={tw`flex-row gap-3`}>
                                <KanbanColumn
                                    status="todo"
                                    tasks={filteredGrouped.todo}
                                    onDelete={deleteTask}
                                    onComplete={(taskId) => move(taskId, "completed", Number.MAX_SAFE_INTEGER)}
                                    visualMode={visualMode}
                                />
                                <KanbanColumn
                                    status="completed"
                                    tasks={filteredGrouped.completed}
                                    onDelete={deleteTask}
                                    visualMode={visualMode}
                                />
                            </View>
                        </ScrollView>
                </View>

                {onBack ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Close tasks"
                        onPress={() => {
                            haptics.navigation();
                            onBack();
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

                <Animated.View
                    pointerEvents="box-none"
                    style={[
                        tw`absolute right-4`,
                        {bottom: fabBottom},
                    ]}
                >
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Add task"
                        onPress={handleAddTask}
                        style={({pressed}) => [
                            tw`h-11 w-11 items-center justify-center overflow-hidden rounded-full border`,
                            {
                                borderColor: themeAccent,
                                backgroundColor: themeAccent,
                                shadowColor: "#000000",
                                shadowOffset: {width: 0, height: 8},
                                shadowOpacity: 0.42,
                                shadowRadius: 12,
                                elevation: 10,
                            },
                            pressed && {opacity: 0.82, transform: [{translateY: 1}]},
                        ]}
                    >
                        <ButtonShine/>
                        <Ionicons name="add" size={22} color="#FFF6E8"/>
                    </Pressable>
                </Animated.View>
            </View>
        </ScreenBackground>
    );
}
