import {useMemo, useState} from "react";
import {ImageBackground, ScrollView, Text, View} from "react-native";
import {Calendar, type DateData} from "react-native-calendars";
import {STATUS_ORDER} from "../lib/task-utils";
import tw from "../lib/tw";
import type {Task, TaskPriority, TaskStatus} from "../types";
import {KanbanColumn} from "../components/KanbanColumn";
import {Button} from "../components/ui/Button";
import {Input} from "../components/ui/Input";
import {fonts} from "../theme/fonts";
import type {Session} from "@supabase/supabase-js";

interface KanbanScreenProps {
    tasksState: {
        tasks: Task[];
        grouped: {
            todo: Task[];
            in_progress: Task[];
            completed: Task[];
        };
        addTask: (payload: {
            title: string;
            description: string;
            dueDate: string | null;
            priority: TaskPriority;
            status?: TaskStatus;
        }) => void;
        deleteTask: (taskId: string) => void;
        move: (taskId: string, toStatus: TaskStatus, toIndex: number) => void;
    };
    session: Session | null;
}

export function KanbanScreen({tasksState}: KanbanScreenProps) {
    const {tasks, grouped, addTask, deleteTask, move} = tasksState;
    const bg = require("../../public/images/rh6.jpg");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [priority, setPriority] = useState<TaskPriority>("medium");
    const [showCalendar, setShowCalendar] = useState(false);
    const [filterDate, setFilterDate] = useState<string | null>(null);

    const filteredGrouped = useMemo(() => {
        if (!filterDate) return grouped;
        return {
            todo: grouped.todo.filter(t => t.dueDate === filterDate),
            in_progress: grouped.in_progress.filter(t => t.dueDate === filterDate),
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

    function handleAddTask() {
        if (!title.trim()) return;

        addTask({title, description, dueDate: dueDate.trim() ? dueDate.trim() : null, priority, status: "todo"});

        setTitle("");
        setDescription("");
        setDueDate("");
        setPriority("medium");
    }

    return (
        <ImageBackground source={bg} style={tw`flex-1`} imageStyle={tw`opacity-79`}>
            <View style={tw`flex-1 bg-black/1`}>
                <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-6`}>
                    <View style={tw`px-4 pt-2`}>
                        <View style={tw`mt-3 gap-2 rounded-2xl border border-[#2c2c2c] bg-black/50 p-3`}>
                            <Input value={title} onChangeText={setTitle} placeholder="Task title"
                                   style={tw`text-white gap-2 rounded-lg border border-[#2c2c2c] bg-black/33 p-3`}/>
                            <Input value={description} onChangeText={setDescription} placeholder="Description"
                                   style={tw`text-white gap-2 rounded-lg border border-[#2c2c2c] bg-black/33 p-3`}/>

                            <View style={tw`flex-row gap-2`}>
                                <View style={tw`flex-1`}>
                                    <Input value={dueDate} onChangeText={setDueDate} placeholder="Due date YYYY-MM-DD"
                                           style={tw`text-slate-400/70 gap-2 rounded-lg border border-[#2c2c2c] bg-black/23 p-3`}/>
                                </View>
                                <Button
                                    label={showCalendar ? "Hide Calendar" : "Show Calendar"}
                                    variant="secondary"
                                    onPress={() => setShowCalendar(!showCalendar)}
                                />
                            </View>

                            {showCalendar && (
                                <View style={tw`overflow-hidden rounded-xl border border-slate-300 bg-black/33`}>
                                    <Calendar
                                        markedDates={markedDates}
                                        onDayPress={(day: DateData) => {
                                            setDueDate(day.dateString);
                                            setFilterDate(day.dateString);
                                        }}
                                    />
                                    {filterDate && (
                                        <View style={tw`p-2`}>
                                            <Button
                                                label={`Clear Filter (${filterDate})`}
                                                variant="secondary"
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
                                                onPress={() => setPriority(item)}/>
                                    ))}
                                </View>
                            </ScrollView>

                            <Button label="Add Task" variant="danger" onPress={handleAddTask}/>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`pt-3`}>
                            <View style={tw`flex-row gap-3`}>
                                {STATUS_ORDER.map((lane) => (
                                    <KanbanColumn
                                        key={lane}
                                        status={lane}
                                        tasks={filteredGrouped[lane]}
                                        onMove={(taskId, toStatus, toIndex) => move(taskId, toStatus, toIndex)}
                                        onDelete={deleteTask}
                                    />
                                ))}
                            </View>
                        </ScrollView>

                        <Text style={[tw`mt-2 text-xs font-semibold text-slate-700`, {fontFamily: fonts.body}]}>Tip: Use
                            Prev/Next and Up/Down on
                            each
                            card.</Text>
                    </View>
                </ScrollView>
            </View>
        </ImageBackground>
    );
}
