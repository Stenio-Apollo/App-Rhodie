import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("EDGE_SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("EDGE_SERVICE_ROLE_KEY");

const supabase = (supabaseUrl && serviceRoleKey)
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
    : null;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
        },
    });
}

async function deleteUserData(userId: string) {
    const userTables = [
        "journal_entries",
        "tasks",
        "push_tokens",
        "google_calendar_connections",
        "subscription_access",
    ] as const;

    for (const table of userTables) {
        const {error} = await supabase.from(table).delete().eq("user_id", userId);
        if (error) {
            throw new Error(`Could not delete ${table}: ${error.message}`);
        }
    }

    const {error: profileError} = await supabase.from("profiles").delete().eq("id", userId);
    if (profileError) {
        throw new Error(`Could not delete profile: ${profileError.message}`);
    }
}

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") {
        return new Response("ok", {headers: corsHeaders});
    }

    if (request.method !== "POST") {
        return json({error: "Method not allowed."}, 405);
    }

    if (!supabase) {
        return json({error: "Function secrets are missing. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."}, 500);
    }

    const authHeader = request.headers.get("Authorization") ?? request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return json({error: "Missing authorization header."}, 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const {data: userData, error: userError} = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
        return json({error: "Could not verify the signed-in user."}, 401);
    }

    try {
        await deleteUserData(userData.user.id);
        const {error: deleteUserError} = await supabase.auth.admin.deleteUser(userData.user.id);
        if (deleteUserError) {
            return json({error: deleteUserError.message}, 500);
        }

        return json({success: true});
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown delete-account error.";
        return json({error: message}, 500);
    }
});
