import {NextRequest, NextResponse} from "next/server";
import {createSupabaseAdminClient} from "@/lib/server/supabase-admin";
import {requireUserId} from "@/lib/server/api-auth";

export async function GET(_: NextRequest, {params}: { params: Promise<{ id: string }> }) {
    try {
        const {userId, unauthorized} = await requireUserId();
        if (!userId) return unauthorized as Response;

        const {id} = await params;
        const supabase = createSupabaseAdminClient();

        const [{data: board, error: boardError}, {data: columns, error: columnError}] = await Promise.all([
            supabase.from("boards").select("*").eq("id", id).eq("user_id", userId).single(),
            supabase.from("columns").select("*").eq("board_id", id).order("sort_order", {ascending: true}),
        ]);

        if (boardError) {
            return NextResponse.json({error: boardError.message}, {status: 404});
        }

        if (columnError) {
            return NextResponse.json({error: columnError.message}, {status: 400});
        }

        const columnIds = (columns ?? []).map((column) => column.id);
        const tasksResult = columnIds.length
            ? await supabase.from("tasks").select("*").in("column_id", columnIds).order("sort_order", {ascending: true})
            : {data: [], error: null};

        if (tasksResult.error) {
            return NextResponse.json({error: tasksResult.error.message}, {status: 400});
        }

        const tasksByColumn = new Map<string, Record<string, unknown>[]>();
        for (const task of tasksResult.data ?? []) {
            const existing = tasksByColumn.get(task.column_id) ?? [];
            existing.push(task);
            tasksByColumn.set(task.column_id, existing);
        }

        const columnsWithTasks = (columns ?? []).map((column) => ({
            ...column,
            tasks: tasksByColumn.get(column.id) ?? [],
        }));

        return NextResponse.json({board, columns: columnsWithTasks});
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected server error";
        return NextResponse.json({error: message}, {status: 500});
    }
}

export async function PATCH(req: NextRequest, {params}: { params: Promise<{ id: string }> }) {
    try {
        const {userId, unauthorized} = await requireUserId();
        if (!userId) return unauthorized as Response;

        const {id} = await params;
        const body = await req.json().catch(() => ({}));

        const updates: Record<string, unknown> = {};
        if (typeof body?.title === "string") updates.title = body.title.trim() || "Untitled Board";
        if (typeof body?.description === "string") updates.description = body.description;
        if (typeof body?.color === "string") updates.color = body.color;
        updates.updated_at = new Date().toISOString();

        const supabase = createSupabaseAdminClient();
        const {data, error} = await supabase
            .from("boards")
            .update(updates)
            .eq("id", id)
            .eq("user_id", userId)
            .select("*")
            .single();

        if (error) {
            return NextResponse.json({error: error.message, details: error.details}, {status: 400});
        }

        return NextResponse.json(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected server error";
        return NextResponse.json({error: message}, {status: 500});
    }
}
