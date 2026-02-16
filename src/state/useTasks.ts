import { useCallback, useEffect, useMemo, useState } from "react";
import { loadTasks, saveTasks } from "../lib/storage";
import { createTaskId, moveTask, tasksForStatus } from "../lib/task-utils";
import type { Task, TaskPriority, TaskStatus } from "../types";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      const loaded = await loadTasks();
      if (!mounted) return;
      setTasks(loaded);
      setIsLoaded(true);
    }

    void hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    void saveTasks(tasks);
  }, [isLoaded, tasks]);

  const addTask = useCallback(
    (payload: {
      title: string;
      description: string;
      dueDate: string | null;
      priority: TaskPriority;
      status?: TaskStatus;
    }) => {
      const status = payload.status ?? "todo";
      const order = tasksForStatus(tasks, status).length;

      const nextTask: Task = {
        id: createTaskId(),
        title: payload.title.trim(),
        description: payload.description.trim(),
        dueDate: payload.dueDate,
        priority: payload.priority,
        status,
        order,
        createdAt: new Date().toISOString(),
      };

      setTasks((prev) => [...prev, nextTask]);
    },
    [tasks],
  );

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const target = prev.find((task) => task.id === taskId);
      if (!target) return prev;

      const without = prev.filter((task) => task.id !== taskId);
      const statusTasks = tasksForStatus(without, target.status).map((task, order) => ({
        ...task,
        order,
      }));

      return [
        ...without.filter((task) => task.status !== target.status),
        ...statusTasks,
      ];
    });
  }, []);

  const move = useCallback((taskId: string, toStatus: TaskStatus, toIndex: number) => {
    setTasks((prev) => moveTask(prev, taskId, toStatus, toIndex));
  }, []);

  const grouped = useMemo(
    () => ({
      todo: tasksForStatus(tasks, "todo"),
      in_progress: tasksForStatus(tasks, "in_progress"),
      completed: tasksForStatus(tasks, "completed"),
    }),
    [tasks],
  );

  return {
    tasks,
    grouped,
    isLoaded,
    addTask,
    deleteTask,
    move,
  };
}
