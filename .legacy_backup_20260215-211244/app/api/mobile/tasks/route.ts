import {NextRequest, NextResponse} from "next/server";
import {createSupabaseAdminClient} from "@/lib/server/supabase-admin";
import {requireUserId} from "@/lib/server/api-auth";

export async function GET(req: NextRequest) {
    try {
        const {userId, unauthorized} = await requireUserId();
        if (!userId) return unauthorized as Response;

        const url = new URL(req.url);
        const boardId = url.searchParams.get("boardId");
        const dueOnly = url.searchParams.get("dueOnly") === "1";

        const supabase = createSupabaseAdminClient();

        if (boardId) {
            const {data, error} = await supabase
                .from("tasks")
                .select("*, columns!inner(board_id)")
                .eq("columns.board_id", boardId)
                .eq("user_id", userId)
                .order("sort_order", {ascending: true});

            if (error) {
                return NextResponse.json({error: error.message, details: error.details}, {status: 400});
            }

            return NextResponse.json(data ?? []);
        }

        let query = supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", {ascending: false});

        if (dueOnly) {
            query = query.not("due_date", "is", null);
        }

        const {data, error} = await query;

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
        const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "Untitled Task";
        const description = typeof body?.description === "string" ? body.description || null : null;
        const assignee = typeof body?.assignee === "string" ? body.assignee || null : null;
        const dueDate =
            typeof body?.due_date === "string" && body.due_date.trim()
                ? body.due_date
                : typeof body?.dueDate === "string" && body.dueDate.trim()
                    ? body.dueDate
                    : null;
        const priority: "low" | "medium" | "high" = ["low", "medium", "high"].includes(body?.priority)
            ? body.priority
            : "medium";
        const columnId = typeof body?.column_id === "string" && body.column_id ? body.column_id : "";
        const sortOrder = Number.isFinite(body?.sort_order) ? Number(body.sort_order) : 0;

        if (!columnId) {
            return NextResponse.json({error: "column_id is required"}, {status: 400});
        }

        const supabase = createSupabaseAdminClient();
        const {data, error} = await supabase
            .from("tasks")
            .insert({
                title,
                description,
                assignee,
                due_date: dueDate,
                priority,
                column_id: columnId,
                sort_order: sortOrder,
                user_id: userId,
            })
            .select("*")
            .single();

        if (error) {
            return NextResponse.json({error: error.message, details: error.details}, {status: 400});
        }

        return NextResponse.json(data, {status: 201});
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected server error";
        return NextResponse.json({error: message}, {status: 500});
    }
}
