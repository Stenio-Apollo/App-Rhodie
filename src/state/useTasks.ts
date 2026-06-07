import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Alert} from "react-native";
import {loadTasks, saveTasks} from "../lib/storage";
import {createTaskId, moveTask, tasksForStatus} from "../lib/task-utils";
import type {Task, TaskPriority, TaskSource, TaskStatus} from "../types";
import {supabase} from "../lib/supabase";
import type {Session} from "@supabase/supabase-js";
import {useGoogleCalendar} from "./useGoogleCalendar";

type TaskRow = {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    status: "todo" | "completed";
    priority: TaskPriority;
    order: number | null;
    created_at: string;
    source: TaskSource | null;
    external_id: string | null;
    external_updated_at: string | null;
};

function normalizeTaskStatus(status: string | null | undefined): TaskStatus {
    if (status === "completed") return "completed";
    return "todo";
}

function mapTaskRowToTask(row: TaskRow): Task {
    return {
        id: row.id,
        title: row.title,
        description: row.description ?? "",
        dueDate: row.due_date ?? null,
        status: normalizeTaskStatus(row.status),
        priority: row.priority,
        order: row.order ?? 0,
        createdAt: row.created_at,
        source: row.source ?? "manual",
        externalId: row.external_id ?? null,
        externalUpdatedAt: row.external_updated_at ?? null,
    };
}

export function useTasks(session: Session | null) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const tasksRef = useRef<Task[]>([]);

    useEffect(() => {
        tasksRef.current = tasks;
    }, [tasks]);

    const loadRemoteTasks = useCallback(async (userId: string): Promise<Task[] | null> => {
        const {data, error} = await supabase
            .from("tasks")
            .select("*")
            .eq("user_id", userId)
            .order("status")
            .order("order");

        if (error) {
            console.warn("Supabase tasks load error", error.message);
            return null;
        }

        return ((data ?? []) as TaskRow[]).map(mapTaskRowToTask);
    }, []);

    const refreshTasksFromRemote = useCallback(async (userId: string) => {
        const latest = await loadRemoteTasks(userId);
        if (latest) setTasks(latest);
    }, [loadRemoteTasks]);

    const getTodoBaseOrder = useCallback(
        () => tasksForStatus(tasksRef.current, "todo").length,
        [],
    );

    const googleCalendar = useGoogleCalendar({
        session,
        getTodoBaseOrder,
        refreshTasksFromRemote,
    });

    useEffect(() => {
        let mounted = true;

        async function hydrateLocal() {
            const loaded = await loadTasks(session?.user.id);
            if (!mounted) return;
            setTasks(loaded.map((task) => ({
                ...task,
                status: normalizeTaskStatus(task.status),
            })));
            setIsLoaded(true);
        }

        async function hydrateRemote(userId: string) {
            const local = (await loadTasks(userId)).map((task) => ({
                ...task,
                status: normalizeTaskStatus(task.status),
            }));

            if (local.length > 0) {
                const toUpsert = local.map((task) => ({
                    id: task.id,
                    user_id: userId,
                    title: task.title,
                    description: task.description,
                    due_date: task.dueDate,
                    status: task.status,
                    priority: task.priority,
                    order: task.order ?? 0,
                    created_at: task.createdAt,
                    source: task.source ?? "manual",
                    external_id: task.externalId ?? null,
                    external_updated_at: task.externalUpdatedAt ?? null,
                }));
                const {error: upsertErr} = await supabase.from("tasks").upsert(toUpsert);
                if (upsertErr) console.warn("Supabase tasks upsert error", upsertErr.message);
            }

            const remoteTasks = await loadRemoteTasks(userId);
            if (!mounted) return;
            setTasks(remoteTasks ?? local ?? []);
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
    }, [loadRemoteTasks, session]);

    useEffect(() => {
        if (!isLoaded) return;
        void saveTasks(tasks, session?.user.id);
    }, [isLoaded, session?.user.id, tasks]);

    const syncTaskOrdering = useCallback(
        async (userId: string, nextTasks: Task[], taskIds: string[]) => {
            if (taskIds.length === 0) return;
            const idSet = new Set(taskIds);
            const rows = nextTasks
                .filter((task) => idSet.has(task.id))
                .map((task) => ({
                    id: task.id,
                    user_id: userId,
                    status: task.status,
                    order: task.order ?? 0,
                }));
            if (rows.length === 0) return;
            const {error} = await supabase.from("tasks").upsert(rows, {onConflict: "id"});
            if (error) {
                console.warn("Supabase tasks reorder sync error", error.message);
            }
        },
        [],
    );

    const addTask = useCallback(
        async (payload: {
            title: string;
            description: string;
            dueDate: string | null;
            priority: TaskPriority;
            status?: TaskStatus;
        }) => {
            const status = payload.status ?? "todo";
            const currentTasks = tasksRef.current;
            const order = tasksForStatus(currentTasks, status).length;

            const nextTask: Task = {
                id: createTaskId(),
                title: payload.title.trim(),
                description: payload.description.trim(),
                dueDate: payload.dueDate,
                priority: payload.priority,
                status,
                order,
                createdAt: new Date().toISOString(),
                source: "manual",
                externalId: null,
                externalUpdatedAt: null,
            };

            setTasks((prev) => [...prev, nextTask]);

            if (session) {
                const {error} = await supabase.from("tasks").insert({
                    id: nextTask.id,
                    user_id: session.user.id,
                    title: nextTask.title,
                    description: nextTask.description,
                    due_date: nextTask.dueDate,
                    status: nextTask.status,
                    priority: nextTask.priority,
                    order: nextTask.order,
                    created_at: nextTask.createdAt,
                    source: nextTask.source,
                    external_id: nextTask.externalId,
                    external_updated_at: nextTask.externalUpdatedAt,
                });
                if (error) {
                    console.warn("Supabase task insert error", error.message);
                    Alert.alert("Save error", "Could not save task to server. It will stay locally for now.");
                }
            }
        },
        [session],
    );

    const deleteTask = useCallback(
        async (taskId: string) => {
            const currentTasks = tasksRef.current;
            const current = currentTasks.find((task) => task.id === taskId);
            if (!current) return;

            const without = currentTasks.filter((task) => task.id !== taskId);
            const reordered = tasksForStatus(without, current.status).map((task, order) => ({
                ...task,
                order,
            }));

            const nextTasks = [
                ...without.filter((task) => task.status !== current.status),
                ...reordered,
            ];

            setTasks(nextTasks);

            if (session) {
                await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", session.user.id);
                await syncTaskOrdering(
                    session.user.id,
                    nextTasks,
                    reordered.map((task) => task.id),
                );
            }
        },
        [session, syncTaskOrdering],
    );

    const move = useCallback(
        async (taskId: string, toStatus: TaskStatus, toIndex: number) => {
            const currentTasks = tasksRef.current;
            const moving = currentTasks.find((task) => task.id === taskId);
            const next = moveTask(currentTasks, taskId, toStatus, toIndex);
            setTasks(next);

            if (session && moving) {
                const affectedIds = [
                    ...tasksForStatus(next, moving.status).map((task) => task.id),
                    ...tasksForStatus(next, toStatus).map((task) => task.id),
                ];
                await syncTaskOrdering(session.user.id, next, affectedIds);
            }
        },
        [session, syncTaskOrdering],
    );

    const grouped = useMemo(
        () => ({
            todo: tasksForStatus(tasks, "todo"),
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
        googleCalendar,
    };
}
