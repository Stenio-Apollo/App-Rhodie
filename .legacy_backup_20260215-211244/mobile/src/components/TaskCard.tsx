import { DraxView } from "react-native-drax";
import { Pressable, Text, View } from "react-native";
import type { Task } from "../types";

function priorityColor(priority: Task["priority"]) {
  if (priority === "high") return "#ef4444";
  if (priority === "low") return "#22c55e";
  return "#f59e0b";
}

interface TaskCardProps {
  task: Task;
  columnId: string;
  index: number;
  onDropOnTask: (payload: { taskId: string; fromColumnId: string }, targetColumnId: string, targetIndex: number) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskCard({ task, columnId, index, onDropOnTask, onDelete }: TaskCardProps) {
  return (
    <DraxView
      style={{
        borderRadius: 14,
        backgroundColor: "white",
        padding: 12,
        marginBottom: 10,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      }}
      draggable
      dragPayload={{ taskId: task.id, fromColumnId: columnId }}
      receptive
      onReceiveDragDrop={({ dragged }) => {
        const payload = dragged.payload as { taskId: string; fromColumnId: string };
        onDropOnTask(payload, columnId, index);
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <Text style={{ color: "#0f172a", fontWeight: "700", flex: 1 }}>{task.title}</Text>
        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: priorityColor(task.priority),
              marginTop: 5,
            }}
          />
          {onDelete ? (
            <Pressable onPress={() => onDelete(task.id)}>
              <Text style={{ color: "#ef4444", fontWeight: "600" }}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text style={{ color: "#64748b", marginTop: 6 }} numberOfLines={2}>
        {task.description || "No description"}
      </Text>
      {task.due_date ? <Text style={{ color: "#334155", marginTop: 8 }}>Due {task.due_date}</Text> : null}
    </DraxView>
  );
}
