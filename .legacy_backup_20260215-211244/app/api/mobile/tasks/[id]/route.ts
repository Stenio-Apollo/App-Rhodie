import {NextRequest, NextResponse} from "next/server";
import {createSupabaseAdminClient} from "@/lib/server/supabase-admin";
import {requireUserId} from "@/lib/server/api-auth";

export async function PATCH(req: NextRequest, {params}: { params: Promise<{ id: string }> }) {
    try {
        const {userId, unauthorized} = await requireUserId();
        if (!userId) return unauthorized as Response;

        const {id} = await params;
        const body = await req.json().catch(() => ({}));

        const updates: Record<string, unknown> = {};
        if (typeof body?.title === "string") updates.title = body.title.trim() || "Untitled Task";
        if (typeof body?.description === "string" || body?.description === null) updates.description = body.description;
        if (typeof body?.assignee === "string" || body?.assignee === null) updates.assignee = body.assignee;
        if (typeof body?.due_date === "string" || body?.due_date === null) updates.due_date = body.due_date;
        if (typeof body?.priority === "string" && ["low", "medium", "high"].includes(body.priority)) {
            updates.priority = body.priority;
        }
        if (typeof body?.column_id === "string") updates.column_id = body.column_id;
        if (Number.isFinite(body?.sort_order)) updates.sort_order = Number(body.sort_order);
        updates.updated_at = new Date().toISOString();

        const supabase = createSupabaseAdminClient();
        const {data, error} = await supabase
            .from("tasks")
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

export async function DELETE(_: NextRequest, {params}: { params: Promise<{ id: string }> }) {
    try {
        const {userId, unauthorized} = await requireUserId();
        if (!userId) return unauthorized as Response;

        const {id} = await params;
        const supabase = createSupabaseAdminClient();
        const {error} = await supabase.from("tasks").delete().eq("id", id).eq("user_id", userId);

        if (error) {
            return NextResponse.json({error: error.message, details: error.details}, {status: 400});
        }

        return NextResponse.json({success: true});
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected server error";
        return NextResponse.json({error: message}, {status: 500});
    }
}
