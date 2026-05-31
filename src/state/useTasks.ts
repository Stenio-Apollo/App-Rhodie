import {useCallback, useEffect, useMemo, useState} from "react";
import {Alert, AppState, type AppStateStatus} from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import {loadTasks, saveTasks} from "../lib/storage";
import {createTaskId, moveTask, tasksForStatus} from "../lib/task-utils";
import type {Task, TaskPriority, TaskSource, TaskStatus} from "../types";
import {supabase} from "../lib/supabase";
import type {Session} from "@supabase/supabase-js";

WebBrowser.maybeCompleteAuthSession();

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

type GoogleCalendarConnectionRow = {
    user_id: string;
    access_token: string;
    refresh_token: string | null;
    expires_at: string | null;
    scope: string | null;
    updated_at: string;
};

type GoogleCalendarEvent = {
    id: string;
    summary?: string;
    description?: string;
    status?: string;
    updated?: string;
    start?: {
        date?: string;
        dateTime?: string;
    };
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

function eventDate(event: GoogleCalendarEvent): string | null {
    if (event.start?.date) return event.start.date;
    if (event.start?.dateTime) return event.start.dateTime.slice(0, 10);
    return null;
}

function eventTitle(event: GoogleCalendarEvent): string {
    const title = event.summary?.trim();
    return title ? title : "Google Calendar event";
}

function googleTaskId(eventId: string): string {
    return `gcal:${eventId}`;
}

export function useTasks(session: Session | null) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const googleClientId =
        (Constants.expoConfig?.extra as any)?.googleOAuthClientId ??
        process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ??
        "";
    const googleEnabled = googleClientId.trim().length > 0;
    const schemeValue = Constants.expoConfig?.scheme;
    const appScheme = Array.isArray(schemeValue) ? schemeValue[0] : schemeValue;
    const redirectUri = AuthSession.makeRedirectUri({
        scheme: appScheme,
    });
    const discovery = AuthSession.useAutoDiscovery("https://accounts.google.com");

    const [googleConnected, setGoogleConnected] = useState(false);
    const [googleBusy, setGoogleBusy] = useState(false);
    const [googleError, setGoogleError] = useState<string | null>(null);
    const [lastGoogleSyncAt, setLastGoogleSyncAt] = useState<string | null>(null);
    const [googleConnection, setGoogleConnection] = useState<GoogleCalendarConnectionRow | null>(null);

    const [request, response, promptAsync] = AuthSession.useAuthRequest(
        {
            clientId: googleEnabled ? googleClientId : "missing-google-client-id",
            redirectUri,
            scopes: [
                "openid",
                "profile",
                "email",
                "https://www.googleapis.com/auth/calendar.readonly",
            ],
            responseType: AuthSession.ResponseType.Code,
            usePKCE: true,
            extraParams: {
                access_type: "offline",
                prompt: "consent",
            },
        },
        discovery,
    );

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

    const loadGoogleConnection = useCallback(async (userId: string) => {
        const {data, error} = await supabase
            .from("google_calendar_connections")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) {
            console.warn("Google connection load error", error.message);
            setGoogleConnected(false);
            setGoogleConnection(null);
            return null;
        }

        const row = (data as GoogleCalendarConnectionRow | null) ?? null;
        setGoogleConnection(row);
        setGoogleConnected(Boolean(row));
        return row;
    }, []);

    const refreshGoogleToken = useCallback(
        async (connection: GoogleCalendarConnectionRow): Promise<GoogleCalendarConnectionRow | null> => {
            if (!googleEnabled) return null;
            if (!connection.expires_at) return connection;

            const expiresAt = new Date(connection.expires_at).getTime();
            const now = Date.now();
            if (Number.isNaN(expiresAt) || expiresAt > now + 60_000) {
                return connection;
            }

            if (!connection.refresh_token) {
                return null;
            }

            const body = new URLSearchParams({
                client_id: googleClientId,
                grant_type: "refresh_token",
                refresh_token: connection.refresh_token,
            });

            const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: {"Content-Type": "application/x-www-form-urlencoded"},
                body: body.toString(),
            });

            if (!tokenResponse.ok) {
                return null;
            }

            const tokenJson = (await tokenResponse.json()) as {
                access_token?: string;
                expires_in?: number;
                scope?: string;
            };

            if (!tokenJson.access_token) {
                return null;
            }

            const refreshed: GoogleCalendarConnectionRow = {
                ...connection,
                access_token: tokenJson.access_token,
                expires_at: tokenJson.expires_in
                    ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
                    : connection.expires_at,
                scope: tokenJson.scope ?? connection.scope,
                updated_at: new Date().toISOString(),
            };

            const {error} = await supabase.from("google_calendar_connections").upsert({
                user_id: connection.user_id,
                access_token: refreshed.access_token,
                refresh_token: connection.refresh_token,
                expires_at: refreshed.expires_at,
                scope: refreshed.scope,
                updated_at: refreshed.updated_at,
            });

            if (error) {
                console.warn("Google token refresh save error", error.message);
                return null;
            }

            setGoogleConnection(refreshed);
            return refreshed;
        },
        [googleClientId, googleEnabled],
    );

    const syncGoogleCalendar = useCallback(async () => {
        if (!session || !googleEnabled) return;

        setGoogleBusy(true);
        setGoogleError(null);
        try {
            const connection = googleConnection ?? (await loadGoogleConnection(session.user.id));
            if (!connection) {
                setGoogleConnected(false);
                return;
            }

            const validConnection = await refreshGoogleToken(connection);
            if (!validConnection) {
                setGoogleConnected(false);
                setGoogleError("Google connection expired. Reconnect to continue syncing.");
                return;
            }

            const timeMin = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
            const url =
                `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
                `?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&maxResults=250`;
            const eventsResponse = await fetch(url, {
                headers: {Authorization: `Bearer ${validConnection.access_token}`},
            });

            if (!eventsResponse.ok) {
                const details = await eventsResponse.text();
                throw new Error(details || "Could not fetch Google Calendar events");
            }

            const payload = (await eventsResponse.json()) as {items?: GoogleCalendarEvent[]};
            const events = (payload.items ?? []).filter((event) => event.status !== "cancelled");

            const {data: existingRaw, error: existingErr} = await supabase
                .from("tasks")
                .select("id")
                .eq("user_id", session.user.id)
                .eq("source", "google_calendar");
            if (existingErr) {
                console.warn("Google tasks lookup error", existingErr.message);
            }
            const existingIdSet = new Set(
                (((existingRaw ?? []) as Array<{id: string}>).map((row) => row.id)).filter(Boolean),
            );

            const inserts: Array<Record<string, unknown>> = [];
            const updates: Array<Record<string, unknown>> = [];
            const todoBaseOrder = tasksForStatus(tasks, "todo").length;

            events.forEach((event, index) => {
                if (!event.id) return;
                const id = googleTaskId(event.id);
                const rowBase = {
                    id,
                    user_id: session.user.id,
                    title: eventTitle(event),
                    description: (event.description ?? "").slice(0, 1000),
                    due_date: eventDate(event),
                    source: "google_calendar",
                    external_id: event.id,
                    external_updated_at: event.updated ?? null,
                };

                if (existingIdSet.has(id)) {
                    updates.push(rowBase);
                } else {
                    inserts.push({
                        ...rowBase,
                        status: "todo",
                        priority: "medium",
                        order: todoBaseOrder + index,
                        created_at: new Date().toISOString(),
                    });
                }
            });

            if (inserts.length > 0) {
                const {error} = await supabase.from("tasks").insert(inserts);
                if (error) {
                    console.warn("Google tasks insert error", error.message);
                }
            }

            if (updates.length > 0) {
                await Promise.all(
                    updates.map((row) =>
                        supabase
                            .from("tasks")
                            .update({
                                title: row.title,
                                description: row.description,
                                due_date: row.due_date,
                                external_updated_at: row.external_updated_at,
                            })
                            .eq("id", row.id)
                            .eq("user_id", session.user.id),
                    ),
                );
            }

            const latest = await loadRemoteTasks(session.user.id);
            setTasks(latest ?? tasks);
            setLastGoogleSyncAt(new Date().toISOString());
            setGoogleConnected(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Google Calendar sync failed";
            setGoogleError(message);
        } finally {
            setGoogleBusy(false);
        }
    }, [
        googleConnection,
        googleEnabled,
        loadGoogleConnection,
        loadRemoteTasks,
        refreshGoogleToken,
        session,
        tasks,
    ]);

    useEffect(() => {
        if (!session || !googleEnabled || !response) return;

        if (response.type !== "success") {
            setGoogleBusy(false);
            return;
        }

        const code = response.params.code;
        const codeVerifier = request?.codeVerifier;
        if (!code || !codeVerifier || !discovery?.tokenEndpoint) {
            setGoogleBusy(false);
            setGoogleError("Google authorization was incomplete. Please try again.");
            return;
        }

        void (async () => {
            try {
                setGoogleError(null);
                const tokenResult = await AuthSession.exchangeCodeAsync(
                    {
                        clientId: googleClientId,
                        code,
                        redirectUri,
                        extraParams: {code_verifier: codeVerifier},
                    },
                    discovery,
                );

                const expiresAt = tokenResult.expiresIn
                    ? new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString()
                    : null;
                if (!tokenResult.accessToken) {
                    throw new Error("Google access token missing from response.");
                }
                const row = {
                    user_id: session.user.id,
                    access_token: tokenResult.accessToken,
                    refresh_token: tokenResult.refreshToken ?? null,
                    expires_at: expiresAt,
                    scope: tokenResult.scope ?? null,
                    updated_at: new Date().toISOString(),
                };

                const {error} = await supabase.from("google_calendar_connections").upsert(row);
                if (error) {
                    throw error;
                }

                setGoogleConnection(row);
                setGoogleConnected(true);
                await syncGoogleCalendar();
            } catch (error) {
                const message = error instanceof Error ? error.message : "Could not connect Google Calendar";
                setGoogleError(message);
            } finally {
                setGoogleBusy(false);
            }
        })();
    }, [discovery, googleClientId, googleEnabled, redirectUri, request, response, session, syncGoogleCalendar]);

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
            void loadGoogleConnection(session.user.id);
        } else {
            setGoogleConnected(false);
            setGoogleConnection(null);
            void hydrateLocal();
        }

        return () => {
            mounted = false;
        };
    }, [loadGoogleConnection, loadRemoteTasks, session]);

    useEffect(() => {
        if (!session || !googleConnected) return;

        void syncGoogleCalendar();
        const interval = setInterval(() => {
            void syncGoogleCalendar();
        }, 15 * 60 * 1000);

        const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
            if (state === "active") {
                void syncGoogleCalendar();
            }
        });

        return () => {
            clearInterval(interval);
            subscription.remove();
        };
    }, [googleConnected, session, syncGoogleCalendar]);

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
                source: "manual",
                externalId: null,
                externalUpdatedAt: null,
            };

            const nextTasks = [...tasks, nextTask];
            setTasks(nextTasks);
            void saveTasks(nextTasks, session?.user.id);

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
        [tasks, session],
    );

    const deleteTask = useCallback(
        async (taskId: string) => {
            const target = tasks.find((task) => task.id === taskId);
            const current = tasks.find((task) => task.id === taskId);
            if (!current) return;

            const without = tasks.filter((task) => task.id !== taskId);
            const statusTasks = tasksForStatus(without, current.status).map((task, order) => ({
                ...task,
                order,
            }));

            const nextTasks = [
                ...without.filter((task) => task.status !== current.status),
                ...statusTasks,
            ];

            setTasks(nextTasks);
            void saveTasks(nextTasks, session?.user.id);

            if (session) {
                await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", session.user.id);
                if (target) {
                    const next = tasks
                        .filter((task) => task.id !== taskId)
                        .map((task) => ({...task}));
                    const reordered = tasksForStatus(next, target.status).map((task, order) => ({
                        ...task,
                        order,
                    }));
                    const nextTasks = [
                        ...next.filter((task) => task.status !== target.status),
                        ...reordered,
                    ];
                    await syncTaskOrdering(
                        session.user.id,
                        nextTasks,
                        reordered.map((task) => task.id),
                    );
                }
            }
        },
        [session, syncTaskOrdering, tasks],
    );

    const move = useCallback(
        async (taskId: string, toStatus: TaskStatus, toIndex: number) => {
            const moving = tasks.find((task) => task.id === taskId);
            const next = moveTask(tasks, taskId, toStatus, toIndex);
            setTasks(next);
            void saveTasks(next, session?.user.id);

            if (session && moving) {
                const affectedIds = [
                    ...tasksForStatus(next, moving.status).map((task) => task.id),
                    ...tasksForStatus(next, toStatus).map((task) => task.id),
                ];
                await syncTaskOrdering(session.user.id, next, affectedIds);
            }
        },
        [tasks, session, syncTaskOrdering],
    );

    const connectGoogleCalendar = useCallback(async () => {
        if (!session) return;
        if (!googleEnabled) {
            setGoogleError("Google OAuth is not configured yet.");
            return;
        }
        if (!request) {
            setGoogleError("Google sign-in is not ready. Please try again.");
            return;
        }
        setGoogleBusy(true);
        setGoogleError(null);
        const result = await promptAsync();
        if (result.type !== "success") {
            setGoogleBusy(false);
        }
    }, [googleEnabled, promptAsync, request, session]);

    const disconnectGoogleCalendar = useCallback(async () => {
        if (!session) return;
        setGoogleBusy(true);
        setGoogleError(null);
        try {
            if (googleConnection?.access_token) {
                await fetch("https://oauth2.googleapis.com/revoke", {
                    method: "POST",
                    headers: {"Content-Type": "application/x-www-form-urlencoded"},
                    body: `token=${encodeURIComponent(googleConnection.access_token)}`,
                });
            }
            await supabase.from("google_calendar_connections").delete().eq("user_id", session.user.id);
            setGoogleConnection(null);
            setGoogleConnected(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Could not disconnect Google Calendar";
            setGoogleError(message);
        } finally {
            setGoogleBusy(false);
        }
    }, [googleConnection?.access_token, session]);

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
        googleCalendar: {
            available: googleEnabled,
            connected: googleConnected,
            busy: googleBusy,
            error: googleError,
            lastSyncedAt: lastGoogleSyncAt,
            connect: connectGoogleCalendar,
            disconnect: disconnectGoogleCalendar,
            syncNow: syncGoogleCalendar,
        },
    };
}
