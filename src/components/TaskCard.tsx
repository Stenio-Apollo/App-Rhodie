import {Pressable, Text, View} from "react-native";
import {LinearGradient} from "expo-linear-gradient";
import {Ionicons} from "@expo/vector-icons";
import tw from "../lib/tw";
import type {Task, TaskStatus} from "../types";
import {fonts} from "../theme/fonts";
import {haptics} from "../lib/haptics";
import {useScreenVisualMode} from "./ScreenBackground";

const COMPLETE_BUTTON_COLOR = "#DAC8AE";
const CREAM = "#DFC4AA";
const TEXT_PRIMARY = "#E4E0D4";

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
    if (priority === "high") return "#FF3800";
    if (priority === "low") return "#6BAA75";
    return "#F3DB72";
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
    const visualMode = useScreenVisualMode();
    const riverMode = visualMode === "river";
    const georgiaMode = visualMode === "georgia";
    const sonnyMode = visualMode === "sonny";
    const lightCardMode = riverMode;
    const whiteTextMode = georgiaMode || sonnyMode;
    const actionAccentColor = COMPLETE_BUTTON_COLOR;
    const textColor = accent ? "#0f0f0f" : whiteTextMode ? "#FFFFFF" : lightCardMode ? "#111111" : CREAM;
    const actionBorderColor = riverMode ? "rgba(17,17,17,0.14)" : georgiaMode ? "rgba(255,255,255,0.14)" : sonnyMode ? "rgba(255,255,255,0.18)" : "rgba(223,196,170,0.42)";
    const actionBackgroundColor = georgiaMode ? "rgba(0,0,0,0.28)" : riverMode ? "rgba(255,255,255,0.78)" : sonnyMode ? "rgba(0,0,0,0.30)" : "rgba(15,15,15,0.92)";
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={onPress}
            style={({pressed}) => [
                tw`overflow-hidden rounded-lg border px-3 py-1.5 flex-row items-center gap-1`,
                accent
                    ? {borderColor: actionAccentColor, backgroundColor: actionAccentColor, ...buttonDepthStyle}
                    : {
                        borderColor: actionBorderColor,
                        backgroundColor: actionBackgroundColor,
                        ...buttonDepthStyle,
                    },
                pressed && {opacity: 0.78, transform: [{translateY: 1}]},
            ]}
        >
            <ButtonShine/>
            {icon ? (
                <Ionicons name={icon} size={12} color={textColor}/>
            ) : null}
            <Text style={[tw`text-[11px] font-semibold`, {
                fontFamily: fonts.strong,
                color: textColor,
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
    const visualMode = useScreenVisualMode();
    const riverMode = visualMode === "river";
    const georgiaMode = visualMode === "georgia";
    const sonnyMode = visualMode === "sonny";
    const whiteTextMode = georgiaMode || sonnyMode;
    const primaryTextColor = whiteTextMode ? "#FFFFFF" : riverMode ? "#111111" : TEXT_PRIMARY;
    const bodyTextColor = whiteTextMode ? "rgba(255,255,255,0.82)" : riverMode ? "rgba(17,17,17,0.82)" : "rgba(228,224,212,0.82)";
    const dueTextColor = whiteTextMode ? "#FFFFFF" : riverMode ? "#111111" : CREAM;
    const cardBorderColor = riverMode ? "rgba(17,17,17,0.14)" : georgiaMode ? "rgba(255,255,255,0.14)" : sonnyMode ? "rgba(255,255,255,0.20)" : "#2c2c2c";
    const cardBackgroundColor = georgiaMode ? "rgba(0,0,0,0.36)" : riverMode ? "rgba(255,255,255,0.78)" : sonnyMode ? "rgba(0,0,0,0.34)" : "rgba(15,15,15,0.94)";
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
                        borderColor: cardBorderColor,
                        backgroundColor: cardBackgroundColor,
                        ...buttonDepthStyle,
                    },
                ]}
            >
                <ButtonShine/>
                <View style={tw`flex-row items-start justify-between gap-2`}>
                    <Text
                        style={[tw`flex-1 text-base font-bold`, {fontFamily: fonts.heading, color: primaryTextColor}]}>
                        {task.title}
                    </Text>
                    <View
                        style={[tw`mt-1 h-2.5 w-2.5 rounded-full`, {backgroundColor: priorityDotColor(task.priority)}]}/>
                </View>

                {task.description ? (
                    <Text
                        style={[tw`mt-2 text-sm`, {fontFamily: fonts.body, color: bodyTextColor}]}>
                        {task.description}
                    </Text>
                ) : null}

                {task.dueDate ? (
                    <View style={tw`mt-2.5 flex-row items-center justify-end`}>
                        <Text
                            style={[tw`text-xs font-semibold`, {fontFamily: fonts.body, color: dueTextColor}]}>
                            Due {task.dueDate}{task.dueTime ? ` ${task.dueTime}` : ""}
                        </Text>
                    </View>
                ) : null}

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
