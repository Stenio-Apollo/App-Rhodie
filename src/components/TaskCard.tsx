import {Pressable, Text, View} from "react-native";
import tw from "../lib/tw";
import type {Task, TaskStatus} from "../types";
import {Badge} from "./ui/Badge";
import {Card} from "./ui/Card";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";

interface TaskCardProps {
    task: Task;
    status: TaskStatus;
    onDelete: (taskId: string) => void;
    onComplete?: (taskId: string) => void;
}

function priorityDotColor(priority: Task["priority"]): string {
    if (priority === "high") return "#B56941";
    if (priority === "low") return "#6BAA75";
    return "#E4E0D4";
}

export function TaskCard({task, status, onDelete, onComplete}: TaskCardProps) {
    return (
        <Pressable
            onPress={haptics.tapTask}
            onLongPress={haptics.longPressTask}
            delayLongPress={320}
            style={tw`mb-2.5`}
        >
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
                            style={[tw`text-xs font-semibold text-[#E4E0D4]/80`, {fontFamily: fonts.body}]}>
                            Due {task.dueDate}{task.dueTime ? ` ${task.dueTime}` : ""}
                        </Text> : null}
                </View>

                <View style={tw`mt-2.5 flex-row items-center justify-between gap-2`}>
                    <View style={tw`flex-row items-center gap-1.5`}>
                        {status !== "completed" && onComplete ? (
                            <Pressable
                                style={({pressed}) => [tw`rounded-lg px-2 py-1`, {backgroundColor: "#B55941"}, pressed && tw`opacity-80`]}
                                onPress={() => {
                                    haptics.completeTask();
                                    onComplete(task.id);
                                }}>
                                <Text
                                    style={[tw`text-xs font-bold`, {fontFamily: fonts.button, color: "#E4E0D4"}]}>Complete</Text>
                            </Pressable>
                        ) : null}
                    </View>

                    <View style={tw`flex-row items-center gap-1.5`}>
                        <Pressable onPress={() => {
                            haptics.deleteTask();
                            onDelete(task.id);
                        }}
                                   style={({pressed}) => [tw`rounded-lg bg-[#282828] px-2.5 py-1`, pressed && tw`bg-[#282828]/80`]}>
                            <Text style={[tw`text-xs font-bold`, {fontFamily: fonts.body, color: "#E4E0D4"}]}>Delete</Text>
                        </Pressable>
                    </View>
                </View>
            </Card>
        </Pressable>
    );
}
