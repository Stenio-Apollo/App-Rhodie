import {NextRequest, NextResponse} from "next/server";
import {requireUserId} from "@/lib/server/api-auth";

interface ExpoPushMessage {
    to: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
    try {
        const {userId, unauthorized} = await requireUserId();
        if (!userId) return unauthorized as Response;

        const body = await req.json().catch(() => ({}));
        const token = typeof body?.token === "string" ? body.token.trim() : "";
        const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "Task Reminder";
        const message =
            typeof body?.message === "string" && body.message.trim()
                ? body.message.trim()
                : "You have tasks due today.";

        if (!token.startsWith("ExponentPushToken")) {
            return NextResponse.json({error: "A valid Expo push token is required"}, {status: 400});
        }

        const payload: ExpoPushMessage = {
            to: token,
            title,
            body: message,
            data: {userId, source: "task-editor"},
        };

        const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const text = await response.text();
            return NextResponse.json({error: `Expo push send failed: ${text}`}, {status: 502});
        }

        const result = (await response.json()) as Record<string, unknown>;
        return NextResponse.json({success: true, result});
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected server error";
        return NextResponse.json({error: message}, {status: 500});
    }
}
