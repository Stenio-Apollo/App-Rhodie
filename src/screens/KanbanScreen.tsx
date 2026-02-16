import {useState} from "react";
import {ScrollView, Text, View} from "react-native";
import {STATUS_ORDER} from "../lib/task-utils";
import tw from "../lib/tw";
import type {Task, TaskPriority, TaskStatus} from "../types";
import {KanbanColumn} from "../components/KanbanColumn";
import {Button} from "../components/ui/Button";
import {Input} from "../components/ui/Input";

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
}

export function KanbanScreen({tasksState}: KanbanScreenProps) {
    const {grouped, addTask, deleteTask, move} = tasksState;

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [priority, setPriority] = useState<TaskPriority>("medium");
    const [status, setStatus] = useState<TaskStatus>("todo");

    function handleAddTask() {
        if (!title.trim()) return;

        addTask({title, description, dueDate: dueDate.trim() ? dueDate.trim() : null, priority, status});

        setTitle("");
        setDescription("");
        setDueDate("");
        setPriority("medium");
        setStatus("todo");
    }

    return (
        <View style={tw`flex-1 bg-orange-100 px-4 pt-2 pb-3`}>
            <View style={tw`mt-3 gap-2 rounded-2xl border-b  border-orange-100 bg-orange-100 p-3`}>
                <Input value={title} onChangeText={setTitle} placeholder="Task title"/>
                <Input value={description} onChangeText={setDescription} placeholder="Description"/>
                <Input value={dueDate} onChangeText={setDueDate} placeholder="Due date YYYY-MM-DD"/>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={tw`flex-row gap-2`}>
                        {(["low", "medium", "high"] as TaskPriority[]).map((item) => (
                            <Button key={item} label={item} variant={priority === item ? "primary" : "secondary"}
                                    onPress={() => setPriority(item)}/>
                        ))}
                    </View>
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={tw`flex-row gap-2`}>
                        {STATUS_ORDER.map((item) => (
                            <Button
                                key={item}
                                label={item === "todo" ? "To Do" : item === "in_progress" ? "In Progress" : "Completed"}
                                variant={status === item ? "primary" : "secondary"}
                                onPress={() => setStatus(item)}
                            />
                        ))}
                    </View>
                </ScrollView>

                <Button className={"text-black"} label="Add Task" variant="danger" onPress={handleAddTask}/>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`pt-3`}>
                <View style={tw`flex-row gap-3`}>
                    {STATUS_ORDER.map((lane) => (
                        <KanbanColumn
                            key={lane}
                            status={lane}
                            tasks={grouped[lane]}
                            onMove={(taskId, toStatus, toIndex) => move(taskId, toStatus, toIndex)}
                            onDelete={deleteTask}
                        />
                    ))}
                </View>
            </ScrollView>

            <Text style={tw`mt-2 text-xs font-semibold text-slate-700`}>Tip: Use Prev/Next and Up/Down on each
                card.</Text>
        </View>
    );
}
