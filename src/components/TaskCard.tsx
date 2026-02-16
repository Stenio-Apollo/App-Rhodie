import {Pressable, Text, View} from "react-native";
import {STATUS_ORDER} from "../lib/task-utils";
import tw from "../lib/tw";
import type {Task, TaskStatus} from "../types";
import {Badge} from "./ui/Badge";
import {Card} from "./ui/Card";

interface TaskCardProps {
    task: Task;
    status: TaskStatus;
    index: number;
    total: number;
    onDelete: (taskId: string) => void;
    onMove: (taskId: string, toStatus: TaskStatus, toIndex: number) => void;
}

function priorityDotColor(priority: Task["priority"]): string {
    if (priority === "high") return "#fd3535";
    if (priority === "low") return "#10b981";
    return "#ffaa7c";
}

export function TaskCard({task, status, index, total, onDelete, onMove}: TaskCardProps) {
    const statusIndex = STATUS_ORDER.indexOf(status);
    const prevStatus = statusIndex > 0 ? STATUS_ORDER[statusIndex - 1] : null;
    const nextStatus = statusIndex < STATUS_ORDER.length - 1 ? STATUS_ORDER[statusIndex + 1] : null;

    return (
        <View style={tw`mb-2.5`}>
            <Card>
                <View style={tw`flex-row items-start justify-between gap-2`}>
                    <Text style={tw`flex-1 text-base font-bold text-zinc-900`}>{task.title}</Text>
                    <View
                        style={[tw`mt-1 h-2.5 w-2.5 rounded-full`, {backgroundColor: priorityDotColor(task.priority)}]}/>
                </View>

                {task.description ? <Text style={tw`mt-2 text-sm text-black`}>{task.description}</Text> : null}

                <View style={tw`mt-2.5 flex-row items-center justify-between`}>
                    <Badge label={task.priority.toUpperCase()}/>
                    {task.dueDate ?
                        <Text style={tw`text-xs font-semibold text-blue-900`}>Due {task.dueDate}</Text> : null}
                </View>

                <View style={tw`mt-2.5 flex-row items-center justify-between gap-2`}>
                    <View style={tw`flex-row items-center gap-1.5`}>
                        {prevStatus ? (
                            <Pressable style={tw`rounded-lg bg-blue-200 px-2 py-1`}
                                       onPress={() => onMove(task.id, prevStatus, Number.MAX_SAFE_INTEGER)}>
                                <Text style={tw`text-xs font-bold text-slate-700`}>◀ Prev</Text>
                            </Pressable>
                        ) : null}
                        {nextStatus ? (
                            <Pressable style={tw`rounded-lg bg-blue-200 px-2 py-1`}
                                       onPress={() => onMove(task.id, nextStatus, Number.MAX_SAFE_INTEGER)}>
                                <Text style={tw`text-xs font-bold text-slate-700`}>Next ▶</Text>
                            </Pressable>
                        ) : null}
                    </View>

                    <View style={tw`flex-row items-center gap-1.5`}>
                        {index > 0 ? (
                            <Pressable style={tw`rounded-lg bg-blue-200 px-2 py-1`}
                                       onPress={() => onMove(task.id, status, index - 1)}>
                                <Text style={tw`text-xs font-bold text-slate-700`}>↑</Text>
                            </Pressable>
                        ) : null}
                        {index < total - 1 ? (
                            <Pressable style={tw`rounded-lg bg-blue-200 px-2 py-1`}
                                       onPress={() => onMove(task.id, status, index + 1)}>
                                <Text style={tw`text-xs font-bold text-slate-700`}>↓</Text>
                            </Pressable>
                        ) : null}
                        <Pressable onPress={() => onDelete(task.id)} style={tw`rounded-lg bg-orange-200 px-2.5 py-1`}>
                            <Text style={tw`text-xs font-bold text-black`}>Delete</Text>
                        </Pressable>
                    </View>
                </View>
            </Card>
        </View>
    );
}
