// Supabase Edge Function: quote-reminder
// Env vars: EDGE_SUPABASE_URL, EDGE_SERVICE_ROLE_KEY
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
import {Expo} from "https://esm.sh/expo-server-sdk@4";

const supabase = createClient(
    Deno.env.get("EDGE_SUPABASE_URL")!,
    Deno.env.get("EDGE_SERVICE_ROLE_KEY")!,
);
const expo = new Expo({useFcmV1: true});

const QUOTES = [
    "The obstacle is the way.",
    "Waste no more time arguing what a good man should be. Be one.",
    "You have power over your mind—not outside events.",
    "If it is not right, do not do it; if it is not true, do not say it.",
    "We suffer more often in imagination than in reality.",
    "A gem cannot be polished without friction, nor a man perfected without trials.",
];

const dailyQuote = (date: string) =>
    QUOTES[Array.from(date).reduce((a, c) => a + c.charCodeAt(0), 0) % QUOTES.length];

Deno.serve(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const quote = dailyQuote(today);

    const {data: tokens, error} = await supabase
        .from("push_tokens")
        .select("token");
    if (error) return new Response("error", {status: 500});

    const messages = (tokens ?? [])
        .filter((t) => Expo.isExpoPushToken(t.token))
        .map((t) => ({
            to: t.token,
            title: "Quote of the Day",
            body: quote,
            data: {quote},
            sound: "default",
            priority: "high",
        }));

    for (const chunk of expo.chunkPushNotifications(messages)) {
        try {
            await expo.sendPushNotificationsAsync(chunk);
        } catch (err) {
            console.error("push send error", err);
        }
    }

    return new Response("ok", {status: 200});
});
