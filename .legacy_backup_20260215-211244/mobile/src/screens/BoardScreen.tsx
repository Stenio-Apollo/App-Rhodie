import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { DraxProvider, DraxScrollView, DraxView } from "react-native-drax";
import { TaskCard } from "../components/TaskCard";
import { createApi } from "../lib/api";
import type { Board, Column, TaskPriority } from "../types";

interface BoardScreenProps {
  getToken: () => Promise<string | null>;
  onTasksChanged?: () => Promise<void> | void;
}

export function BoardScreen({ getToken, onTasksChanged }: BoardScreenProps) {
  const api = useMemo(() => createApi(getToken), [getToken]);

  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskColumnId, setTaskColumnId] = useState<string>("");

  const loadBoard = useCallback(
    async (boardId: string) => {
      const details = await api.getBoardDetails(boardId);
      setColumns(details.columns);
      if (!taskColumnId && details.columns[0]) {
        setTaskColumnId(details.columns[0].id);
      }
    },
    [api, taskColumnId],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const allBoards = await api.getBoards();
      setBoards(allBoards);

      const firstId = selectedBoardId ?? allBoards[0]?.id ?? null;
      setSelectedBoardId(firstId);
      if (firstId) {
        await loadBoard(firstId);
      } else {
        setColumns([]);
      }
    } catch (error) {
      Alert.alert("Load failed", error instanceof Error ? error.message : "Failed to load board data");
    } finally {
      setLoading(false);
    }
  }, [api, loadBoard, selectedBoardId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreateBoard() {
    try {
      const board = await api.createBoard({
        title: `Board ${new Date().toLocaleDateString()}`,
        description: "Mobile board",
        color: "#e2e8f0",
      });
      const next = [board, ...boards];
      setBoards(next);
      setSelectedBoardId(board.id);
      await loadBoard(board.id);
    } catch (error) {
      Alert.alert("Create failed", error instanceof Error ? error.message : "Failed to create board");
    }
  }

  async function handleCreateTask() {
    if (!taskColumnId || !taskTitle.trim()) return;

    try {
      const targetColumn = columns.find((column) => column.id === taskColumnId);
      await api.createTask({
        column_id: taskColumnId,
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        due_date: taskDueDate.trim() || null,
        priority: taskPriority,
        sort_order: targetColumn?.tasks.length ?? 0,
      });

      setTaskTitle("");
      setTaskDescription("");
      setTaskDueDate("");
      if (selectedBoardId) {
        await loadBoard(selectedBoardId);
      }
      await onTasksChanged?.();
    } catch (error) {
      Alert.alert("Task failed", error instanceof Error ? error.message : "Failed to create task");
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      await api.deleteTask(taskId);
      if (selectedBoardId) {
        await loadBoard(selectedBoardId);
      }
      await onTasksChanged?.();
    } catch (error) {
      Alert.alert("Delete failed", error instanceof Error ? error.message : "Failed to delete task");
    }
  }

  async function moveTask(payload: { taskId: string; fromColumnId: string }, newColumnId: string, targetIndex: number) {
    if (!payload.taskId || !newColumnId) return;
    try {
      await api.moveTask({ taskId: payload.taskId, newColumnId, targetIndex });
      if (selectedBoardId) {
        await loadBoard(selectedBoardId);
      }
      await onTasksChanged?.();
    } catch (error) {
      Alert.alert("Move failed", error instanceof Error ? error.message : "Failed to move task");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#eef2ff" }}>
      <View style={{ paddingTop: 14, paddingHorizontal: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#0f172a" }}>Boards</Text>
          <Pressable
            onPress={handleCreateBoard}
            style={{ borderRadius: 12, backgroundColor: "#0284c7", paddingHorizontal: 12, paddingVertical: 10 }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>New Board</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {boards.map((board) => {
              const active = board.id === selectedBoardId;
              return (
                <Pressable
                  key={board.id}
                  onPress={async () => {
                    setSelectedBoardId(board.id);
                    await loadBoard(board.id);
                  }}
                  style={{
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: active ? "#0ea5e9" : "#ffffff",
                  }}
                >
                  <Text style={{ color: active ? "white" : "#0f172a", fontWeight: "700" }}>{board.title}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={{ marginTop: 12, marginHorizontal: 14, borderRadius: 16, backgroundColor: "white", padding: 12 }}>
        <Text style={{ fontWeight: "700", color: "#0f172a" }}>Create Task</Text>
        <TextInput
          value={taskTitle}
          onChangeText={setTaskTitle}
          placeholder="Title"
          style={{ marginTop: 8, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, padding: 10 }}
        />
        <TextInput
          value={taskDescription}
          onChangeText={setTaskDescription}
          placeholder="Description"
          style={{ marginTop: 8, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, padding: 10 }}
        />
        <TextInput
          value={taskDueDate}
          onChangeText={setTaskDueDate}
          placeholder="Due date YYYY-MM-DD"
          style={{ marginTop: 8, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, padding: 10 }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["low", "medium", "high"] as TaskPriority[]).map((priority) => (
              <Pressable
                key={priority}
                onPress={() => setTaskPriority(priority)}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: taskPriority === priority ? "#0284c7" : "#cbd5e1",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: "#0f172a", fontWeight: "600" }}>{priority}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {columns.map((column) => (
              <Pressable
                key={column.id}
                onPress={() => setTaskColumnId(column.id)}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: taskColumnId === column.id ? "#0ea5e9" : "#cbd5e1",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: taskColumnId === column.id ? "#e0f2fe" : "#fff",
                }}
              >
                <Text>{column.title}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Pressable
          onPress={handleCreateTask}
          style={{ marginTop: 10, borderRadius: 10, backgroundColor: "#0ea5e9", alignItems: "center", padding: 10 }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Add Task</Text>
        </Pressable>
      </View>

      <DraxProvider>
        <DraxScrollView horizontal contentContainerStyle={{ padding: 14, gap: 12 }}>
          {columns.map((column) => (
            <DraxView
              key={column.id}
              receptive
              onReceiveDragDrop={({ dragged }) => {
                const payload = dragged.payload as { taskId: string; fromColumnId: string };
                void moveTask(payload, column.id, column.tasks.length);
              }}
              style={{
                width: 320,
                borderRadius: 18,
                backgroundColor: "#dbeafe",
                padding: 12,
                minHeight: 320,
              }}
            >
              <Text style={{ color: "#0f172a", fontSize: 18, fontWeight: "800" }}>{column.title}</Text>
              <Text style={{ color: "#334155", marginTop: 4 }}>{column.tasks.length} tasks</Text>

              <View style={{ marginTop: 10 }}>
                {column.tasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    columnId={column.id}
                    index={index}
                    onDropOnTask={(payload, targetColumnId, targetIndex) => {
                      void moveTask(payload, targetColumnId, targetIndex);
                    }}
                    onDelete={(taskId) => {
                      void handleDeleteTask(taskId);
                    }}
                  />
                ))}
              </View>
            </DraxView>
          ))}
        </DraxScrollView>
      </DraxProvider>

      {loading ? (
        <View style={{ position: "absolute", bottom: 20, alignSelf: "center", borderRadius: 999, backgroundColor: "#0f172a", paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: "white" }}>Loading...</Text>
        </View>
      ) : null}
    </View>
  );
}
