import {useEffect, useMemo, useRef, useState} from "react";
import {Alert, ImageBackground, ScrollView, StyleSheet, TextInput, View} from "react-native";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
import tw from "../lib/tw";
import type {Task, TaskPriority, TaskStatus} from "../types";
import {KanbanColumn} from "../components/KanbanColumn";
import {TranslucentCalendar} from "../components/TranslucentCalendar";
import {Button} from "../components/ui/Button";
import {Input} from "../components/ui/Input";
import type {Session} from "@supabase/supabase-js";
import {haptics} from "../lib/haptics";
import {toLocalISODate} from "../lib/date-utils";
import {TutorialCard} from "../components/TutorialCard";
import type {VisualMode} from "../state/useVisualMode";

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
    session: Session | null;
    focusTaskFormKey?: number;
    visualMode: VisualMode;
    showTutorial?: boolean;
    onDismissTutorial?: () => void;
}

export function KanbanScreen({
                                 tasksState,
                                 focusTaskFormKey,
                                 visualMode,
                                 showTutorial,
                                 onDismissTutorial
                             }: KanbanScreenProps) {
    const {tasks, grouped, addTask, deleteTask, move} = tasksState;
    const bg = visualMode === "warm"
        ? require("../../public/images/rhox.jpg")
        : require("../../public/images/rh28.jpg");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [dueTime, setDueTime] = useState("");
    const [priority, setPriority] = useState<TaskPriority>("medium");
    const [showCalendar, setShowCalendar] = useState(false);
    const [filterDate, setFilterDate] = useState<string | null>(null);
    const scrollRef = useRef<ScrollView>(null);
    const titleInputRef = useRef<TextInput>(null);
    const filteredGrouped = useMemo(() => {
        if (!filterDate) return grouped;
        return {
            todo: grouped.todo.filter(t => t.dueDate === filterDate),
            completed: grouped.completed.filter(t => t.dueDate === filterDate),
        };
    }, [grouped, filterDate]);

    const markedDates = useMemo(() => {
        const map: Record<string, { marked?: boolean; selected?: boolean; selectedColor?: string }> = {};

        tasks.forEach((task) => {
            if (!task.dueDate) return;
            map[task.dueDate] = {...(map[task.dueDate] ?? {}), marked: true};
        });

        if (dueDate) {
            map[dueDate] = {...(map[dueDate] ?? {}), selected: true, selectedColor: "#EF4444"};
        }
        if (filterDate && filterDate !== dueDate) {
            map[filterDate] = {...(map[filterDate] ?? {}), selected: true, selectedColor: "#3B82F6"};
        }
        return map;
    }, [dueDate, filterDate, tasks]);

    useEffect(() => {
        if (!focusTaskFormKey) return;
        const today = toLocalISODate();
        setDueDate(today);
        setFilterDate(today);
        setTimeout(() => {
            scrollRef.current?.scrollTo({y: 0, animated: true});
            titleInputRef.current?.focus();
        }, 80);
    }, [focusTaskFormKey]);

    function handleAddTask() {
        if (!title.trim()) {
            Alert.alert("Title required", "Please enter a task title.");
            return;
        }

        const due = dueDate.trim();
        if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
            Alert.alert("Invalid date", "Use format YYYY-MM-DD or leave blank.");
            return;
        }
        const time = dueTime.trim();
        if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
            Alert.alert("Invalid time", "Use 24-hour format HH:MM or leave blank.");
            return;
        }

        addTask({title, description, dueDate: due ? due : null, dueTime: time ? time : null, priority, status: "todo"});
        haptics.createNewTask();

        setTitle("");
        setDescription("");
        setDueDate("");
        setDueTime("");
        setPriority("medium");
    }

    return (
        <ImageBackground source={bg} style={tw`flex-1`} imageStyle={tw`opacity-30`}>
            <View style={[tw`flex-1 bg-black/33`, {paddingHorizontal: 1}]}>
                <ScrollView
                    ref={scrollRef}
                    style={tw`flex-1`}
                    contentContainerStyle={tw`pb-28`}
                >
                    <View style={tw`px-2 pt-2`}>
                        {showTutorial && onDismissTutorial ? (
                            <View style={tw`mb-3`}>
                                <TutorialCard
                                    title="get things done here!"
                                    body="Create.. Complete... Delete.. Repeat."
                                    onDismiss={onDismissTutorial}
                                />
                            </View>
                        ) : null}

                        <View
                            style={[
                                tw`mt-2 overflow-hidden rounded-[28px] border bg-[black/10] p-1`,
                                {borderColor: visualMode === "warm" ? "rgba(223,196,170,0.11)" : "rgba(0,0,0,0.19)"},
                            ]}>
                            <BlurView
                                intensity={72}
                                tint="dark"
                                style={tw`overflow-hidden rounded-[24px] border border-black/49`}
                            >
                                <View
                                    pointerEvents="none"
                                    style={[StyleSheet.absoluteFill, {backgroundColor: "rgba(0,0,0,0.63)"}]}
                                />
                                <LinearGradient
                                    colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0.01)", "transparent"]}
                                    locations={[0, 0.5, 1]}
                                    pointerEvents="none"
                                    style={[tw`absolute left-0 right-0 top-0`, {height: "45%"}]}
                                />
                                <LinearGradient
                                    colors={["transparent", "rgba(0,0,0,0.35)"]}
                                    pointerEvents="none"
                                    style={[tw`absolute left-0 right-0 bottom-0`, {height: "28%"}]}
                                />

                                <View style={tw`gap-2 p-3`}>
                                    <Input ref={titleInputRef} value={title} onChangeText={setTitle}
                                           placeholder="Task title"
                                           style={tw`text-[#E4E0D4] gap-2 rounded-lg border border-[#2c2c2c] bg-black/33 p-3`}/>
                                    <Input value={description} onChangeText={setDescription} placeholder="Description"
                                           style={tw`text-[#E4E0D4] gap-2 rounded-lg border border-[#2c2c2c] bg-black/33 p-3`}/>

                                    <View style={tw`flex-row gap-2`}>
                                        <View style={tw`flex-1`}>
                                            <Input value={dueDate} onChangeText={setDueDate}
                                                   placeholder="Due date YYYY-MM-DD"
                                                   style={tw`text-slate-400/70 gap-2 rounded-lg border border-[#2c2c2c] bg-black/23 p-3`}/>
                                        </View>
                                        <View style={tw`flex-1`}>
                                            <Input value={dueTime} onChangeText={setDueTime}
                                                   placeholder="HH:MM"
                                                   style={tw`text-slate-400/70 gap-2 rounded-lg border border-[#2c2c2c] bg-black/23 p-3`}/>
                                        </View>
                                        <Button
                                            label={showCalendar ? "Hide Calendar" : "Show Calendar"}
                                            variant="secondary"
                                            style={tw`border-slate-600/79`}
                                            shine
                                            onPress={() => {
                                                setShowCalendar(!showCalendar);
                                            }}
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
                                                <View style={tw`p-2`}>
                                                    <Button
                                                        label={`Clear Filter (${filterDate})`}
                                                        variant="secondary"
                                                        shine
                                                        onPress={() => setFilterDate(null)}
                                                    />
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={tw`flex-row gap-2`}>
                                            {(["low", "medium", "high"] as TaskPriority[]).map((item) => (
                                                <Button key={item} label={item}
                                                        variant={priority === item ? "primary" : "secondary"}
                                                        style={priority === item ? [tw`border border-gray-900`, {backgroundColor: "#ba885a"}] : tw`border-slate-600/70`}
                                                        textStyle={priority === item ? tw`text-gray-950` : undefined}
                                                        shine
                                                        onPress={() => setPriority(item)}/>
                                            ))}
                                        </View>
                                    </ScrollView>

                                    <Button
                                        label="Add Task"
                                        variant="primary"
                                        style={tw`border border-slate-700/70 bg-gray-900/13`}
                                        shine
                                        onPress={handleAddTask}
                                        hapticAction={false}
                                    />
                                </View>
                            </BlurView>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`pt-3`}>
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
                </ScrollView>
            </View>
        </ImageBackground>
    );
}
