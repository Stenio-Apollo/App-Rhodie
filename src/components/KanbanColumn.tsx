import {Text, View} from "react-native";
import {statusLabel} from "../lib/task-utils";
import tw from "../lib/tw";
import type {Task, TaskStatus} from "../types";
import {TaskCard} from "./TaskCard";
import {Badge} from "./ui/Badge";
import {fonts} from "../theme/fonts";
import type {VisualMode} from "../state/useVisualMode";

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
                    tw`min-h-[340px] rounded-2xl border bg-black/23 p-3`,
                    {borderColor: visualMode === "warm" ? "rgba(223,196,170,0.33)" : "rgba(181,89,65,0.23)"},
                ]}
            >
                <View style={tw`mb-3 flex-row items-center justify-between`}>
                    <Text style={[tw`text-lg font-extrabold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                        {statusLabel(status)}
                    </Text>
                    <Badge label={`${tasks.length}`}/>
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
        </View>
    );
}
