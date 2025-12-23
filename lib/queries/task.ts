// ✅ userId MUST be passed as a parameter
import {supabase} from "@/lib/supabase/client";
import {Task} from "@/types/task";

export async function getTasks(userId: string): Promise<Task[]> {
    const {data, error} = await supabase
        .from("tasks")
        .select("*")  // fetch everything

    console.log("data:", data, "error:", error)
    return data ?? []
}
