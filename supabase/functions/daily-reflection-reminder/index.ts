// Supabase Edge Function: daily-reflection-reminder
// Sends server-side Expo push reminders for daily quote and daily prompt.
// Env vars: EDGE_SUPABASE_URL, EDGE_SERVICE_ROLE_KEY
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
    Deno.env.get("EDGE_SUPABASE_URL")!,
    Deno.env.get("EDGE_SERVICE_ROLE_KEY")!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    },
);
const DEFAULT_TIMEZONE = "America/Denver";
const QUOTE_HOUR = 8;
const PROMPT_HOUR = 9;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type ReminderKind = "daily_quote" | "daily_prompt";

type PushTokenRow = {
    user_id: string;
    token: string;
    platform: string | null;
    timezone: string;
    updated_at: string;
};

type PushMessage = {
    to: string;
    title: string;
    body: string;
    data: {kind: ReminderKind; localDate: string};
    sound: "default";
    priority: "high";
};

type ExpoTicket = {
    status?: "ok" | "error";
    message?: string;
};

function isExpoPushToken(token: string) {
    return /^ExponentPushToken\[[^\]]+\]$/.test(token) || /^ExpoPushToken\[[^\]]+\]$/.test(token);
}

function chunkMessages(messages: PushMessage[], chunkSize = 100) {
    const chunks: PushMessage[][] = [];
    for (let index = 0; index < messages.length; index += chunkSize) {
        chunks.push(messages.slice(index, index + chunkSize));
    }
    return chunks;
}

function latestTokenPerUserPlatform(rows: PushTokenRow[]) {
    const latestRows = new Map<string, PushTokenRow>();

    for (const row of rows) {
        const key = `${row.user_id}:${row.platform ?? "unknown"}`;
        const current = latestRows.get(key);
        if (!current || new Date(row.updated_at).getTime() > new Date(current.updated_at).getTime()) {
            latestRows.set(key, row);
        }
    }

    return [...latestRows.values()];
}

function localPartsForTimezone(timezone: string) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
    });
    const parts = formatter.formatToParts(new Date()).reduce<Record<string, string>>((accumulator, part) => {
        accumulator[part.type] = part.value;
        return accumulator;
    }, {});

    return {
        localDate: `${parts.year}-${parts.month}-${parts.day}`,
        hour: Number(parts.hour),
    };
}

function getDueKind(hour: number): ReminderKind | null {
    if (hour === QUOTE_HOUR) return "daily_quote";
    if (hour === PROMPT_HOUR) return "daily_prompt";
    return null;
}

function getReminderContent(kind: ReminderKind) {
    if (kind === "daily_quote") {
        return {
            title: "Quote of the Day",
            body: "Your daily quote is ready. Take a minute to check in.",
        };
    }

    return {
        title: "Daily prompt",
        body: "Your journal prompt is ready. Take a minute to reflect.",
    };
}

async function shouldSend(token: string, kind: ReminderKind, localDate: string) {
    const {data, error} = await supabase
        .from("push_notification_deliveries")
        .select("token")
        .eq("token", token)
        .eq("kind", kind)
        .eq("local_date", localDate)
        .maybeSingle();

    if (!error) return !data;

    console.error("delivery ledger lookup error", error.message);
    return false;
}

async function markDelivered(token: string, kind: ReminderKind, localDate: string) {
    const {error} = await supabase.from("push_notification_deliveries").insert({
        token,
        kind,
        local_date: localDate,
    });

    if (!error || error.code === "23505") return;
    console.error("delivery ledger insert error", error.message);
}

Deno.serve(async (request) => {
    if (request.method !== "POST") {
        return new Response("Method not allowed", {status: 405});
    }

    const {data: tokens, error} = await supabase
        .from("push_tokens")
        .select("user_id, token, platform, timezone, updated_at")
        .not("timezone", "is", null);

    if (error) {
        console.error("push token load error", error.message);
        return new Response("error", {status: 500});
    }

    const messages: PushMessage[] = [];
    let ticketOkCount = 0;
    let ticketErrorCount = 0;
    const ticketErrors: string[] = [];

    for (const row of latestTokenPerUserPlatform((tokens ?? []) as PushTokenRow[])) {
        if (!isExpoPushToken(row.token)) continue;

        const timezone = row.timezone || DEFAULT_TIMEZONE;
        let local;
        try {
            local = localPartsForTimezone(timezone);
        } catch {
            local = localPartsForTimezone(DEFAULT_TIMEZONE);
        }

        const kind = getDueKind(local.hour);
        if (!kind) continue;

        const send = await shouldSend(row.token, kind, local.localDate);
        if (!send) continue;

        const content = getReminderContent(kind);
        messages.push({
            to: row.token,
            title: content.title,
            body: content.body,
            data: {kind, localDate: local.localDate},
            sound: "default",
            priority: "high",
        });
    }

    for (const chunk of chunkMessages(messages)) {
        try {
            const response = await fetch(EXPO_PUSH_URL, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(chunk),
            });
            const payload = await response.json() as {data?: ExpoTicket[] | ExpoTicket; errors?: unknown};
            const tickets = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];

            if (!response.ok || payload.errors) {
                ticketErrorCount += chunk.length;
                ticketErrors.push(`Expo push HTTP ${response.status}`);
                console.error("expo push response error", response.status, payload.errors);
                continue;
            }

            if (tickets.length === 0) {
                ticketErrorCount += chunk.length;
                ticketErrors.push("Expo push returned no tickets");
                console.error("expo push returned no tickets");
                continue;
            }

            await Promise.all(tickets.map((ticket, index) => {
                const message = chunk[index];
                const data = message?.data;
                if (ticket.status !== "ok" || !message?.to || !data?.kind || !data.localDate) {
                    if (ticket.status === "error") {
                        ticketErrorCount += 1;
                        ticketErrors.push(ticket.message);
                        console.error("push ticket error", ticket.message);
                    }
                    return Promise.resolve();
                }

                ticketOkCount += 1;
                return markDelivered(String(message.to), data.kind, data.localDate);
            }));
        } catch (err) {
            console.error("push send error", err);
        }
    }

    return new Response(JSON.stringify({
        queued: messages.length,
        ticketOk: ticketOkCount,
        ticketErrors: ticketErrorCount,
        errors: ticketErrors.slice(0, 5),
    }), {
        status: 200,
        headers: {"Content-Type": "application/json"},
    });
});
