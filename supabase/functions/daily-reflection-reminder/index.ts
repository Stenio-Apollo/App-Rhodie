// Supabase Edge Function: daily-reflection-reminder
// Sends server-side Expo push reminders for daily quote and daily prompt.
// Env vars: EDGE_SUPABASE_URL, EDGE_SERVICE_ROLE_KEY
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
import {Expo} from "https://esm.sh/expo-server-sdk@4";

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
const expo = new Expo({useFcmV1: true});

const DEFAULT_TIMEZONE = "America/Denver";
const QUOTE_HOUR = 8;
const PROMPT_HOUR = 9;

type ReminderKind = "daily_quote" | "daily_prompt";

type PushTokenRow = {
    token: string;
    timezone: string | null;
};

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
    const {error} = await supabase.from("push_notification_deliveries").insert({
        token,
        kind,
        local_date: localDate,
    });

    if (!error) return true;
    if (error.code === "23505") return false;

    console.error("delivery ledger insert error", error.message);
    return false;
}

Deno.serve(async (request) => {
    if (request.method !== "POST") {
        return new Response("Method not allowed", {status: 405});
    }

    const {data: tokens, error} = await supabase
        .from("push_tokens")
        .select("token, timezone");

    if (error) {
        console.error("push token load error", error.message);
        return new Response("error", {status: 500});
    }

    const messages = [];

    for (const row of (tokens ?? []) as PushTokenRow[]) {
        if (!Expo.isExpoPushToken(row.token)) continue;

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

    for (const chunk of expo.chunkPushNotifications(messages)) {
        try {
            await expo.sendPushNotificationsAsync(chunk);
        } catch (err) {
            console.error("push send error", err);
        }
    }

    return new Response(JSON.stringify({sent: messages.length}), {
        status: 200,
        headers: {"Content-Type": "application/json"},
    });
});
