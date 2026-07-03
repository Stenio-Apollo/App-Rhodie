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
    const riverMode = visualMode === "river";
    const georgiaMode = visualMode === "georgia";
    const sonnyMode = visualMode === "sonny";
    const lightMode = riverMode || georgiaMode;
    const frostedLightMode = riverMode;
    const headerColor = georgiaMode ? "#DAC8AE" : lightMode ? "#111111" : sonnyMode ? "#ba885a" : status === "completed" ? CREAM : TEXT_PRIMARY;
    return (
        <View style={tw`w-80`}>
            <View
                style={[
                    tw`overflow-hidden rounded-[24px] p-1`,
                    {backgroundColor: georgiaMode ? "transparent" : lightMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"},
                    {borderColor: georgiaMode || sonnyMode ? "rgba(255,255,255,0.18)" : "rgba(181,89,65,0.19)"},
                ]}
            >
                <BlurView
                    intensity={sonnyMode ? 42 : 30}
                    tint={frostedLightMode ? "light" : "dark"}
                    style={[
                        tw`overflow-hidden rounded-[20px] border`,
                        {borderColor: georgiaMode ? "rgba(255,255,255,0.18)" : lightMode ? "rgba(17,17,17,0.14)" : sonnyMode ? "rgba(255,255,255,0.24)" : "rgba(51,65,85,0.6)"},
                    ]}
                >
                    <View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, {backgroundColor: georgiaMode ? "rgba(0,0,0,0.28)" : lightMode ? "rgba(255,255,255,0.34)" : sonnyMode ? "rgba(0,0,0,0.34)" : "rgba(0,0,0,0.22)"}]}
                    />
                    <LinearGradient
                        colors={georgiaMode || sonnyMode ? ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.03)", "transparent"] : ["rgba(181,89,65,0.06)", "rgba(255,255,255,0.015)", "transparent"]}
                        locations={[0, 0.5, 1]}
                        pointerEvents="none"
                        style={[tw`absolute left-0 right-0 top-0`, {height: "45%"}]}
                    />
                    <LinearGradient
                        colors={georgiaMode ? ["transparent", "rgba(0,0,0,0.1)"] : ["transparent", "rgba(0,0,0,0.18)"]}
                        pointerEvents="none"
                        style={[tw`absolute left-0 right-0 bottom-0`, {height: "28%"}]}
                    />

                    <View style={tw`min-h-[340px] p-3`}>
                        <View style={tw`mb-3 flex-row items-center justify-between`}>
                            <Text
                                style={[tw`text-base font-extrabold uppercase tracking-[1px]`, {
                                    fontFamily: fonts.heading,
                                    color: headerColor,
                                }]}
                            >
                                {statusLabel(status)}
                            </Text>
                            <Badge label={`${tasks.length}`} tone="count"/>
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
