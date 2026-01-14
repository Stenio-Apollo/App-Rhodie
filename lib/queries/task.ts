// lib/queries/task.ts
import {SupabaseClient} from "@supabase/supabase-js";

export const taskService = {
    deleteTask: async (supabase: SupabaseClient, taskId: string) => {
        const {error} = await supabase.from("tasks").delete().eq("id", taskId);
        if (error) throw error;
    },

    getTasksForUser: async (supabase: SupabaseClient, userId: string) => {
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

        return data ?? [];
    },
};
