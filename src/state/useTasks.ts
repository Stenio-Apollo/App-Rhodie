import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Alert} from "react-native";
import {loadTasks, saveTasks} from "../lib/storage";
import {createTaskId, moveTask, tasksForStatus} from "../lib/task-utils";
import type {Task, TaskPriority, TaskSource, TaskStatus} from "../types";
import {supabase} from "../lib/supabase";
import type {Session} from "@supabase/supabase-js";
import {useGoogleCalendar} from "./useGoogleCalendar";
import {syncTaskReminderNotifications} from "../lib/notifications";
import {decryptString, encryptString, encryptedPlaceholder, type EncryptionKey, looksEncrypted} from "../lib/e2ee";
import type {EncryptionState} from "./useEncryption";

type TaskRow = {
    id: string;
    title: string;
    title_encrypted: string | null;
    description: string | null;
    description_encrypted: string | null;
    due_date: string | null;
    due_time: string | null;
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

function decryptTaskText(key: EncryptionKey | null, encrypted: string | null | undefined, fallback: string): string {
    if (key && encrypted && looksEncrypted(encrypted)) {
        try {
            return decryptString(key, encrypted);
        } catch (error) {
            console.warn("Task decrypt error", error);
        }
    }
    return fallback;
}

function mapTaskRowToTask(row: TaskRow, key: EncryptionKey | null): Task {
    return {
        id: row.id,
        title: decryptTaskText(key, row.title_encrypted, row.title),
        description: decryptTaskText(key, row.description_encrypted, row.description ?? ""),
        dueDate: row.due_date ?? null,
        dueTime: row.due_time ?? null,
        status: normalizeTaskStatus(row.status),
        priority: row.priority,
        order: row.order ?? 0,
        createdAt: row.created_at,
        source: row.source ?? "manual",
        externalId: row.external_id ?? null,
        externalUpdatedAt: row.external_updated_at ?? null,
    };
}

function taskToRemoteRow(userId: string, task: Task, key: EncryptionKey | null) {
    const encryptedTitle = key ? encryptString(key, task.title) : null;
    const encryptedDescription = key && task.description ? encryptString(key, task.description) : null;

    return {
        id: task.id,
        user_id: userId,
        title: encryptedTitle ? encryptedPlaceholder("encrypted task") : task.title,
        title_encrypted: encryptedTitle,
        description: encryptedDescription ? encryptedPlaceholder("encrypted task description") : task.description,
        description_encrypted: encryptedDescription,
        due_date: task.dueDate,
        due_time: task.dueTime,
        status: task.status,
        priority: task.priority,
        order: task.order ?? 0,
        created_at: task.createdAt,
        source: task.source ?? "manual",
        external_id: task.externalId ?? null,
        external_updated_at: task.externalUpdatedAt ?? null,
    };
}

export function useTasks(session: Session | null, encryption?: EncryptionState) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const tasksRef = useRef<Task[]>([]);
    const encryptionKey = encryption?.key ?? null;

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

        return ((data ?? []) as TaskRow[]).map((row) => mapTaskRowToTask(row, encryptionKey));
    }, [encryptionKey]);

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
        encryptionKey,
    });

    useEffect(() => {
        let mounted = true;

        async function hydrateLocal() {
            try {
                const loaded = await loadTasks(session?.user.id, encryptionKey);
                if (!mounted) return;
                setTasks(loaded.map((task) => ({
                    ...task,
                    dueTime: task.dueTime ?? null,
                    status: normalizeTaskStatus(task.status),
                })));
            } catch (error) {
                console.warn("Tasks local hydrate error", error);
            } finally {
                if (mounted) setIsLoaded(true);
            }
        }

        async function hydrateRemote(userId: string) {
            try {
                if (!encryptionKey) {
                    setTasks([]);
                    return;
                }

                const local = (await loadTasks(userId, encryptionKey)).map((task) => ({
                    ...task,
                    dueTime: task.dueTime ?? null,
                    status: normalizeTaskStatus(task.status),
                }));

                if (local.length > 0) {
                    const toUpsert = local.map((task) => taskToRemoteRow(userId, task, encryptionKey));
                    const {error: upsertErr} = await supabase.from("tasks").upsert(toUpsert);
                    if (upsertErr) console.warn("Supabase tasks upsert error", upsertErr.message);
                }

                const remoteTasks = await loadRemoteTasks(userId);
                if (!mounted) return;
                setTasks(remoteTasks ?? local ?? []);
                if (remoteTasks) {
                    const plaintextTasks = remoteTasks.filter((task) => task.title && !task.title.startsWith("[encrypted"));
                    if (plaintextTasks.length > 0) {
                        void supabase.from("tasks").upsert(plaintextTasks.map((task) => taskToRemoteRow(userId, task, encryptionKey)));
                    }
                }
            } catch (error) {
                console.warn("Tasks remote hydrate error", error);
            } finally {
                if (mounted) setIsLoaded(true);
            }
        }

        if (session) {
            void hydrateRemote(session.user.id);
        } else {
            void hydrateLocal();
        }

        return () => {
            mounted = false;
        };
    }, [encryptionKey, loadRemoteTasks, session]);

    useEffect(() => {
        if (!isLoaded) return;
        if (session && !encryptionKey) return;
        void saveTasks(tasks, session?.user.id, encryptionKey);
        void syncTaskReminderNotifications(tasks);
    }, [encryptionKey, isLoaded, session, session?.user.id, tasks]);

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
            dueTime: string | null;
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
                dueTime: payload.dueTime,
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
                const {error} = await supabase.from("tasks").insert(taskToRemoteRow(session.user.id, nextTask, encryptionKey));
                if (error) {
                    console.warn("Supabase task insert error", error.message);
                    Alert.alert("Save error", "Could not save task to server. It will stay locally for now.");
                }
            }
        },
        [encryptionKey, session],
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
