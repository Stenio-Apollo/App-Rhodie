import {useCallback, useEffect, useMemo, useState} from "react";
import {loadTasks, saveTasks} from "../lib/storage";
import {createTaskId, moveTask, tasksForStatus} from "../lib/task-utils";
import type {Task, TaskPriority, TaskStatus} from "../types";
import {supabase} from "../lib/supabase";
import type {Session} from "@supabase/supabase-js";

export function useTasks(session: Session | null) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function hydrateLocal() {
            const loaded = await loadTasks();
            if (!mounted) return;
            setTasks(loaded);
            setIsLoaded(true);
        }

        async function hydrateRemote(userId: string) {
            const local = await loadTasks();

            // Sync local (if any) into Supabase
            if (local.length > 0) {
                const toUpsert = local.map((t) => ({
                    id: t.id,
                    user_id: userId,
                    title: t.title,
                    description: t.description,
                    due_date: t.dueDate,
                    status: t.status,
                    priority: t.priority,
                    order: t.order ?? 0,
                    created_at: t.createdAt,
                }));
                const {error: upsertErr} = await supabase.from("tasks").upsert(toUpsert);
                if (upsertErr) console.warn("Supabase tasks upsert error", upsertErr.message);
            }

            const {data, error} = await supabase
                .from("tasks")
                .select("*")
                .eq("user_id", userId)
                .order("status")
                .order("order");
            if (!mounted) return;
            if (error) {
                console.warn("Supabase tasks load error", error.message);
                await hydrateLocal();
                return;
            }
            const mapped =
                data?.map((t) => ({
                    id: t.id,
                    title: t.title,
                    description: t.description ?? "",
                    dueDate: t.due_date ?? null,
                    status: t.status,
                    priority: t.priority,
                    order: t.order ?? 0,
                    createdAt: t.created_at,
                })) ?? [];
            setTasks(mapped);
            setIsLoaded(true);
        }

        if (session) {
            void hydrateRemote(session.user.id);
        } else {
            void hydrateLocal();
        }

        return () => {
            mounted = false;
        };
    }, [session]);

    useEffect(() => {
        if (!isLoaded) return;
        if (!session) {
            void saveTasks(tasks);
        }
    }, [isLoaded, tasks, session]);

    const addTask = useCallback(
        async (payload: {
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

            if (session) {
                await supabase.from("tasks").insert({
                    id: nextTask.id,
                    user_id: session.user.id,
                    title: nextTask.title,
                    description: nextTask.description,
                    due_date: nextTask.dueDate,
                    status: nextTask.status,
                    priority: nextTask.priority,
                    order: nextTask.order,
                    created_at: nextTask.createdAt,
                });
            }
        },
        [tasks, session],
    );

    const deleteTask = useCallback(
        async (taskId: string) => {
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

            if (session) {
                await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", session.user.id);
            }
        },
        [session],
    );

    const move = useCallback(
        async (taskId: string, toStatus: TaskStatus, toIndex: number) => {
            setTasks((prev) => moveTask(prev, taskId, toStatus, toIndex));

            if (session) {
                const next = moveTask(tasks, taskId, toStatus, toIndex);
                const target = next.find((t) => t.id === taskId);
                if (target) {
                    await supabase
                        .from("tasks")
                        .update({status: toStatus, order: target.order})
                        .eq("id", taskId)
                        .eq("user_id", session.user.id);
                }
            }
        },
        [tasks, session],
    );

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
