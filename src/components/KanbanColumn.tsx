import {Text, View} from "react-native";
import {statusLabel} from "../lib/task-utils";
import tw from "../lib/tw";
import type {Task, TaskStatus} from "../types";
import {TaskCard} from "./TaskCard";
import {Badge} from "./ui/Badge";
import {fonts} from "../theme/fonts";

interface KanbanColumnProps {
    status: TaskStatus;
    tasks: Task[];
    onMove: (taskId: string, toStatus: TaskStatus, toIndex: number) => void;
    onDelete: (taskId: string) => void;
}

export function KanbanColumn({status, tasks, onMove, onDelete}: KanbanColumnProps) {
    return (
        <View style={tw`w-80`}>
            <View style={tw`min-h-[340px] rounded-2xl border border-[#2c2c2c] bg-black/23 p-3`}>
                <View style={tw`mb-3 flex-row items-center justify-between`}>
                    <Text style={[tw`text-lg font-extrabold text-[#E4E0D4]`, {fontFamily: fonts.heading}]}>
                        {statusLabel(status)}
                    </Text>
                    <Badge label={`${tasks.length}`}/>
                </View>

                {tasks.map((task, index) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        status={status}
                        index={index}
                        total={tasks.length}
                        onMove={onMove}
                        onDelete={onDelete}
                    />
                ))}
            </View>
        </View>
    );
}
