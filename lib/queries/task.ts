// lib/queries/task.ts
import {SupabaseClient} from "@supabase/supabase-js";

export async function getTasksForUser(supabase: SupabaseClient, userId: string) {
    if (!supabase || !userId) return [];

    const {data, error} = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .not("due_date", "is", null);

    if (error) {
        console.error("Supabase fetch error:", error);
        return [];
    }

    return data;
}
