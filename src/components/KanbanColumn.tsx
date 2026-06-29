import {StyleSheet, Text, View} from "react-native";
import {BlurView} from "expo-blur";
import {LinearGradient} from "expo-linear-gradient";
import {statusLabel} from "../lib/task-utils";
import tw from "../lib/tw";
import type {Task, TaskStatus} from "../types";
import {TaskCard} from "./TaskCard";
import {Badge} from "./ui/Badge";
import {fonts} from "../theme/fonts";
import type {VisualMode} from "../state/useVisualMode";

const CREAM = "#DFC4AA";
const TEXT_PRIMARY = "#E4E0D4";

interface KanbanColumnProps {
    status: TaskStatus;
    tasks: Task[];
    onDelete: (taskId: string) => void;
    onComplete?: (taskId: string) => void;
    visualMode: VisualMode;
}

export function KanbanColumn({status, tasks, onDelete, onComplete, visualMode}: KanbanColumnProps) {
    return (
        <View style={tw`w-80`}>
            <View
                style={[
                    tw`overflow-hidden rounded-[24px] bg-black/10 p-1`,
                    {borderColor: visualMode === "sunset" ? "rgba(223,196,170,0.19)" : "rgba(181,89,65,0.19)"},
                ]}
            >
                <BlurView
                    intensity={30}
                    tint="dark"
                    style={tw`overflow-hidden rounded-[20px] border border-slate-700/60`}
                >
                    <View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, {backgroundColor: "rgba(0,0,0,0.22)"}]}
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

                    <View style={tw`min-h-[340px] p-3`}>
                        <View style={tw`mb-3 flex-row items-center justify-between`}>
                            <Text
                                style={[tw`text-base font-extrabold uppercase tracking-[1px]`, {
                                    fontFamily: fonts.heading,
                                    color: status === "completed" ? CREAM : TEXT_PRIMARY,
                                }]}
                            >
                                {statusLabel(status)}
                            </Text>
                            <Badge label={`${tasks.length}`} tone={status === "completed" ? "default" : "accent"}/>
                        </View>

                        {tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                status={status}
                                onDelete={onDelete}
                                onComplete={onComplete}
                            />
                        ))}
                    </View>
                </BlurView>
            </View>
        </View>
    );
}
