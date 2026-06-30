import {Pressable, Text, View} from "react-native";
import {LinearGradient} from "expo-linear-gradient";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import type {Task, TaskStatus} from "../types";
import {Badge} from "./ui/Badge";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import {useScreenVisualMode} from "./ScreenBackground";

const ACCENT = "#B55941";
const CREAM = "#DFC4AA";
const TEXT_PRIMARY = "#E4E0D4";
const GEORGIA_SURFACE_COLOR = "#2F4F4F";

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

function priorityDotColor(priority: Task["priority"]): string {
    if (priority === "high") return "#B56941";
    if (priority === "low") return "#6BAA75";
    return CREAM;
}

function ActionPill({
                        label,
                        icon,
                        onPress,
                        accent = false,
                    }: {
    label: string;
    icon?: React.ComponentProps<typeof Ionicons>["name"];
    onPress: () => void;
    accent?: boolean;
}) {
    const georgiaMode = useScreenVisualMode() === "georgia";
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={onPress}
            style={({pressed}) => [
                tw`overflow-hidden rounded-lg border px-3 py-1.5 flex-row items-center gap-1`,
                accent
                    ? {borderColor: ACCENT, backgroundColor: ACCENT, ...buttonDepthStyle}
                    : {
                        borderColor: georgiaMode ? "rgba(51,65,85,0.6)" : "rgba(223,196,170,0.42)",
                        backgroundColor: georgiaMode ? GEORGIA_SURFACE_COLOR : "rgba(15,15,15,0.92)",
                        ...buttonDepthStyle,
                    },
                pressed && {opacity: 0.78, transform: [{translateY: 1}]},
            ]}
        >
            <ButtonShine/>
            {icon ? (
                <Ionicons name={icon} size={12} color={accent ? "#FFF6E8" : CREAM}/>
            ) : null}
            <Text style={[tw`text-[11px] font-semibold`, {
                fontFamily: fonts.strong,
                color: accent ? "#FFF6E8" : CREAM,
            }]}>
                {label}
            </Text>
        </Pressable>
    );
}

interface TaskCardProps {
    task: Task;
    status: TaskStatus;
    onDelete: (taskId: string) => void;
    onComplete?: (taskId: string) => void;
}

export function TaskCard({task, status, onDelete, onComplete}: TaskCardProps) {
    const georgiaMode = useScreenVisualMode() === "georgia";
    return (
        <Pressable
            onPress={haptics.tapTask}
            onLongPress={haptics.longPressTask}
            delayLongPress={320}
            style={tw`mb-2.5`}
        >
            <View
                style={[
                    tw`overflow-hidden rounded-2xl border p-3`,
                    {
                        borderColor: georgiaMode ? "rgba(51,65,85,0.6)" : "#2c2c2c",
                        backgroundColor: georgiaMode ? GEORGIA_SURFACE_COLOR : "rgba(15,15,15,0.94)",
                        ...buttonDepthStyle,
                    },
                ]}
            >
                <ButtonShine/>
                <View style={tw`flex-row items-start justify-between gap-2`}>
                    <Text
                        style={[tw`flex-1 text-base font-bold`, {fontFamily: fonts.heading, color: TEXT_PRIMARY}]}>
                        {task.title}
                    </Text>
                    <View
                        style={[tw`mt-1 h-2.5 w-2.5 rounded-full`, {backgroundColor: priorityDotColor(task.priority)}]}/>
                </View>

                {task.description ? (
                    <Text
                        style={[tw`mt-2 text-sm`, {fontFamily: fonts.body, color: "rgba(228,224,212,0.82)"}]}>
                        {task.description}
                    </Text>
                ) : null}

                <View style={tw`mt-2.5 flex-row items-center justify-between`}>
                    <Badge
                        label={task.priority.toUpperCase()}
                        tone={task.priority === "high" ? "accent" : "default"}
                    />
                    {task.dueDate ? (
                        <Text
                            style={[tw`text-xs font-semibold`, {fontFamily: fonts.body, color: CREAM}]}>
                            Due {task.dueDate}{task.dueTime ? ` ${task.dueTime}` : ""}
                        </Text>
                    ) : null}
                </View>

                <View style={tw`mt-3 flex-row items-center justify-between gap-2`}>
                    <View style={tw`flex-row items-center gap-1.5`}>
                        {status !== "completed" && onComplete ? (
                            <ActionPill
                                label="Complete"
                                icon="checkmark-circle-outline"
                                accent
                                onPress={() => {
                                    haptics.completeTask();
                                    onComplete(task.id);
                                }}
                            />
                        ) : null}
                    </View>

                    <View style={tw`flex-row items-center gap-1.5`}>
                        <ActionPill
                            label="Delete"
                            icon="trash-outline"
                            onPress={() => {
                                haptics.deleteTask();
                                onDelete(task.id);
                            }}
                        />
                    </View>
                </View>
            </View>
        </Pressable>
    );
}
