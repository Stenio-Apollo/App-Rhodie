import {useCallback, useEffect, useState} from "react";
import {AppState, Platform, type AppStateStatus} from "react-native";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import {supabase} from "../lib/supabase";
import type {Session} from "@supabase/supabase-js";

WebBrowser.maybeCompleteAuthSession();

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

interface UseGoogleCalendarOptions {
    session: Session | null;
    /** Returns the number of todo tasks currently in local state. Used to assign `order` for new Google-sourced inserts. */
    getTodoBaseOrder: () => number;
    /** Re-load tasks from Supabase into the parent's local state. Called after a successful sync. */
    refreshTasksFromRemote: (userId: string) => Promise<void>;
}

export function useGoogleCalendar({session, getTodoBaseOrder, refreshTasksFromRemote}: UseGoogleCalendarOptions) {
    const googleConfig = (Constants.expoConfig?.extra as {
        googleOAuthClientId?: string;
        googleIosOAuthClientId?: string;
        googleAndroidOAuthClientId?: string;
    } | undefined) ?? {};
    const googleWebClientId =
        googleConfig.googleOAuthClientId ??
        process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ??
        "";
    const googleIosClientId =
        googleConfig.googleIosOAuthClientId ??
        process.env.EXPO_PUBLIC_GOOGLE_IOS_OAUTH_CLIENT_ID ??
        "";
    const googleAndroidClientId =
        googleConfig.googleAndroidOAuthClientId ??
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_OAUTH_CLIENT_ID ??
        "";
    const googlePlatformClientId = Platform.select({
        ios: googleIosClientId,
        android: googleAndroidClientId,
        default: googleWebClientId,
    }) ?? "";
    const googleClientId = googlePlatformClientId || googleWebClientId;
    const googleEnabled = Platform.select({
        ios: googleIosClientId.trim().length > 0,
        android: googleAndroidClientId.trim().length > 0,
        default: googleWebClientId.trim().length > 0,
    }) ?? false;

    const [googleConnected, setGoogleConnected] = useState(false);
    const [googleBusy, setGoogleBusy] = useState(false);
    const [googleError, setGoogleError] = useState<string | null>(null);
    const [lastGoogleSyncAt, setLastGoogleSyncAt] = useState<string | null>(null);
    const [googleConnection, setGoogleConnection] = useState<GoogleCalendarConnectionRow | null>(null);

    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: googleEnabled ? googleClientId : "missing-google-client-id",
        webClientId: googleWebClientId || undefined,
        iosClientId: googleIosClientId || undefined,
        androidClientId: googleAndroidClientId || undefined,
        scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
        extraParams: {
            access_type: "offline",
            prompt: "consent",
        },
    });

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

            const tokenResult = await AuthSession.refreshAsync({
                clientId: googleClientId,
                refreshToken: connection.refresh_token,
            }, Google.discovery);

            if (!tokenResult.accessToken) {
                return null;
            }

            const refreshed: GoogleCalendarConnectionRow = {
                ...connection,
                access_token: tokenResult.accessToken,
                refresh_token: tokenResult.refreshToken ?? connection.refresh_token,
                expires_at: tokenResult.expiresIn
                    ? new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString()
                    : connection.expires_at,
                scope: tokenResult.scope ?? connection.scope,
                updated_at: new Date().toISOString(),
            };

            const {error} = await supabase.from("google_calendar_connections").upsert({
                user_id: connection.user_id,
                access_token: refreshed.access_token,
                refresh_token: refreshed.refresh_token,
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
            const todoBaseOrder = getTodoBaseOrder();

            events.forEach((event, index) => {
                if (!event.id) return;
                const id = googleTaskId(event.id);
                const rowBase = {
                    id,
                    user_id: session.user.id,
                    title: eventTitle(event),
                    description: (event.description ?? "").slice(0, 1000),
                    due_date: eventDate(event),
                    due_time: null,
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

            await refreshTasksFromRemote(session.user.id);
            setLastGoogleSyncAt(new Date().toISOString());
            setGoogleConnected(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Google Calendar sync failed";
            setGoogleError(message);
        } finally {
            setGoogleBusy(false);
        }
    }, [
        getTodoBaseOrder,
        googleConnection,
        googleEnabled,
        loadGoogleConnection,
        refreshGoogleToken,
        refreshTasksFromRemote,
        session,
    ]);

    useEffect(() => {
        if (!session) {
            setGoogleConnected(false);
            setGoogleConnection(null);
            return;
        }
        void loadGoogleConnection(session.user.id);
    }, [loadGoogleConnection, session]);

    useEffect(() => {
        if (!session || !googleEnabled || !response) return;

        if (response.type !== "success") {
            setGoogleBusy(false);
            if (response.type === "error") {
                setGoogleError(response.error?.message ?? "Google authorization failed.");
            }
            return;
        }

        const authentication = response.authentication;
        if (!authentication?.accessToken) {
            setGoogleBusy(false);
            setGoogleError("Google authorization did not return an access token.");
            return;
        }

        void (async () => {
            try {
                setGoogleError(null);
                const expiresAt = authentication.expiresIn
                    ? new Date(Date.now() + authentication.expiresIn * 1000).toISOString()
                    : null;
                const row = {
                    user_id: session.user.id,
                    access_token: authentication.accessToken,
                    refresh_token: authentication.refreshToken ?? null,
                    expires_at: expiresAt,
                    scope: authentication.scope ?? null,
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
    }, [googleEnabled, response, session, syncGoogleCalendar]);

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
        try {
            const result = await promptAsync();
            if (result.type !== "success") {
                setGoogleBusy(false);
                if (result.type === "error") {
                    setGoogleError(result.error?.message ?? "Google authorization failed.");
                }
            }
        } catch (error) {
            setGoogleBusy(false);
            setGoogleError(error instanceof Error ? error.message : "Could not start Google authorization.");
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

    return {
        available: googleEnabled,
        connected: googleConnected,
        busy: googleBusy,
        error: googleError,
        lastSyncedAt: lastGoogleSyncAt,
        connect: connectGoogleCalendar,
        disconnect: disconnectGoogleCalendar,
        syncNow: syncGoogleCalendar,
    };
}
