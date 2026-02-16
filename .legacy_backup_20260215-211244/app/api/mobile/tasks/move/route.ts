import {NextRequest, NextResponse} from "next/server";
import {createSupabaseAdminClient} from "@/lib/server/supabase-admin";
import {requireUserId} from "@/lib/server/api-auth";

export async function POST(req: NextRequest) {
    try {
        const {userId, unauthorized} = await requireUserId();
        if (!userId) return unauthorized as Response;

        const body = await req.json().catch(() => ({}));
        const taskId = typeof body?.taskId === "string" ? body.taskId : "";
        const newColumnId = typeof body?.newColumnId === "string" ? body.newColumnId : "";
        const targetIndex = Number.isFinite(body?.targetIndex) ? Number(body.targetIndex) : 0;

        if (!taskId || !newColumnId) {
            return NextResponse.json({error: "taskId and newColumnId are required"}, {status: 400});
        }

        const supabase = createSupabaseAdminClient();
        const {data: movingTask, error: movingError} = await supabase
            .from("tasks")
            .select("id, column_id")
            .eq("id", taskId)
            .eq("user_id", userId)
            .single();

        if (movingError || !movingTask) {
            return NextResponse.json({error: movingError?.message ?? "Task not found"}, {status: 404});
        }

        const sourceColumnId = movingTask.column_id;

        const [{data: destinationTasks, error: destError}, {data: sourceTasks, error: srcError}] = await Promise.all([
            supabase.from("tasks").select("id").eq("column_id", newColumnId).eq("user_id", userId).order("sort_order", {ascending: true}),
            supabase.from("tasks").select("id").eq("column_id", sourceColumnId).eq("user_id", userId).order("sort_order", {ascending: true}),
        ]);

        if (destError || srcError) {
            return NextResponse.json({error: destError?.message ?? srcError?.message ?? "Failed to move task"}, {status: 400});
        }

        const destIds = (destinationTasks ?? []).map((task) => task.id).filter((id) => id !== taskId);
        const index = Math.max(0, Math.min(targetIndex, destIds.length));
        destIds.splice(index, 0, taskId);

        const srcIds = (sourceTasks ?? []).map((task) => task.id).filter((id) => id !== taskId);

        const updates: Array<{ id: string; sort_order: number; column_id?: string; updated_at: string }> = [];
        const now = new Date().toISOString();

        destIds.forEach((id, order) => {
            if (id === taskId) {
                updates.push({id, sort_order: order, column_id: newColumnId, updated_at: now});
            } else {
                updates.push({id, sort_order: order, updated_at: now});
            }
        });

        if (sourceColumnId !== newColumnId) {
            srcIds.forEach((id, order) => {
                updates.push({id, sort_order: order, updated_at: now});
            });
        }

        const {error: updateError} = await supabase.from("tasks").upsert(updates, {onConflict: "id"});
        if (updateError) {
            return NextResponse.json({error: updateError.message, details: updateError.details}, {status: 400});
        }

        return NextResponse.json({success: true});
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected server error";
        return NextResponse.json({error: message}, {status: 500});
    }
}
