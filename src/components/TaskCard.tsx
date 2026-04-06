import {Pressable, Text, View} from "react-native";
import {STATUS_ORDER} from "../lib/task-utils";
import tw from "../lib/tw";
import type {Task, TaskStatus} from "../types";
import {Badge} from "./ui/Badge";
import {Card} from "./ui/Card";
import {fonts} from "../theme/fonts";

interface TaskCardProps {
    task: Task;
    status: TaskStatus;
    index: number;
    total: number;
    onDelete: (taskId: string) => void;
    onMove: (taskId: string, toStatus: TaskStatus, toIndex: number) => void;
}

function priorityDotColor(priority: Task["priority"]): string {
    if (priority === "high") return "#B56941";
    if (priority === "low") return "#6BAA75";
    return "#E4E0D4";
}

export function TaskCard({task, status, index, total, onDelete, onMove}: TaskCardProps) {
    const statusIndex = STATUS_ORDER.indexOf(status);
    const prevStatus = statusIndex > 0 ? STATUS_ORDER[statusIndex - 1] : null;
    const nextStatus = statusIndex < STATUS_ORDER.length - 1 ? STATUS_ORDER[statusIndex + 1] : null;

    return (
        <View style={tw`mb-2.5`}>
            <Card>
                <View style={tw`flex-row items-start justify-between gap-2`}>
                    <Text
                        style={[tw`flex-1 text-base font-bold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>{task.title}</Text>
                    <View
                        style={[tw`mt-1 h-2.5 w-2.5 rounded-full`, {backgroundColor: priorityDotColor(task.priority)}]}/>
                </View>

                {task.description ?
                    <Text
                        style={[tw`mt-2 text-sm text-[#E4E0D4]/80`, {fontFamily: fonts.body}]}>{task.description}</Text> : null}

                <View style={tw`mt-2.5 flex-row items-center justify-between`}>
                    <Badge label={task.priority.toUpperCase()}/>
                    {task.dueDate ?
                        <Text
                            style={[tw`text-xs font-semibold text-[#E4E0D4]/80`, {fontFamily: fonts.body}]}>Due {task.dueDate}</Text> : null}
                </View>

                <View style={tw`mt-2.5 flex-row items-center justify-between gap-2`}>
                    <View style={tw`flex-row items-center gap-1.5`}>
                        {prevStatus ? (
                            <Pressable
                                style={({pressed}) => [tw`rounded-lg bg-orange-200/93 px-2 py-1`, pressed && tw`bg-[#B56941]/35`]}
                                onPress={() => onMove(task.id, prevStatus, Number.MAX_SAFE_INTEGER)}>
                                <Text
                                    style={[tw`text-xs font-bold text-gray-700`, {fontFamily: fonts.button}]}>Prev</Text>
                            </Pressable>
                        ) : null}
                        {nextStatus ? (
                            <Pressable
                                style={({pressed}) => [tw`rounded-lg bg-orange-200/93 px-2 py-1`, pressed && tw`bg-neutral-300/35`]}
                                onPress={() => onMove(task.id, nextStatus, Number.MAX_SAFE_INTEGER)}>
                                <Text
                                    style={[tw`text-xs font-bold text-gray-700`, {fontFamily: fonts.button}]}>Next</Text>
                            </Pressable>
                        ) : null}
                    </View>

                    <View style={tw`flex-row items-center gap-1.5`}>
                        {index > 0 ? (
                            <Pressable
                                style={({pressed}) => [tw`rounded-lg bg-orange-200/93 px-2 py-1`, pressed && tw`bg-[#B56941]/35`]}
                                onPress={() => onMove(task.id, status, index - 1)}>
                                <Text style={[tw`text-xs font-bold text-black`, {fontFamily: fonts.body}]}>↑</Text>
                            </Pressable>
                        ) : null}
                        {index < total - 1 ? (
                            <Pressable
                                style={({pressed}) => [tw`rounded-lg bg-orange-200/93 px-2 py-1`, pressed && tw`bg-[#B56941]/35`]}
                                onPress={() => onMove(task.id, status, index + 1)}>
                                <Text style={[tw`text-xs font-bold text-black`, {fontFamily: fonts.body}]}>↓</Text>
                            </Pressable>
                        ) : null}
                        <Pressable onPress={() => onDelete(task.id)}
                                   style={({pressed}) => [tw`rounded-lg bg-[#282828] px-2.5 py-1`, pressed && tw`bg-[#282828]/80`]}>
                            <Text style={[tw`text-xs font-bold text-white`, {fontFamily: fonts.body}]}>Delete</Text>
                        </Pressable>
                    </View>
                </View>
            </Card>
        </View>
    );
}
