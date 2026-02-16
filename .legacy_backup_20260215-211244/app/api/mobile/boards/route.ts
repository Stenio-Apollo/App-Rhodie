import {NextRequest, NextResponse} from "next/server";
import {createSupabaseAdminClient} from "@/lib/server/supabase-admin";
import {requireUserId} from "@/lib/server/api-auth";

export async function GET() {
    try {
        const {userId, unauthorized} = await requireUserId();
        if (!userId) return unauthorized as Response;

        const supabase = createSupabaseAdminClient();
        const {data, error} = await supabase
            .from("boards")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", {ascending: false});

        if (error) {
            return NextResponse.json({error: error.message, details: error.details}, {status: 400});
        }

        return NextResponse.json(data ?? []);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected server error";
        return NextResponse.json({error: message}, {status: 500});
    }
}

export async function POST(req: NextRequest) {
    try {
        const {userId, unauthorized} = await requireUserId();
        if (!userId) return unauthorized as Response;

        const body = await req.json().catch(() => ({}));
        const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "Untitled Board";
        const description =
            typeof body?.description === "string" && body.description.trim()
                ? body.description.trim()
                : "No description provided";
        const color = typeof body?.color === "string" && body.color.trim() ? body.color.trim() : "#1f2937";

        const supabase = createSupabaseAdminClient();
        const {data: board, error} = await supabase
            .from("boards")
            .insert({title, description, color, user_id: userId})
            .select("*")
            .single();

        if (error) {
            return NextResponse.json({error: error.message, details: error.details}, {status: 400});
        }

        const defaults = [
            {title: "To Do", sort_order: 0},
            {title: "In Progress", sort_order: 1},
            {title: "Completed", sort_order: 2},
        ];

        await supabase
            .from("columns")
            .insert(defaults.map((column) => ({...column, board_id: board.id, user_id: userId})));

        return NextResponse.json(board, {status: 201});
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected server error";
        return NextResponse.json({error: message}, {status: 500});
    }
}
