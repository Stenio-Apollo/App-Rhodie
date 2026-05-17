import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("EDGE_SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("EDGE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

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

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") {
        return new Response("ok", {headers: corsHeaders});
    }

    if (request.method !== "POST") {
        return json({error: "Method not allowed."}, 405);
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

    const body = await request.json().catch(() => ({})) as {password?: unknown};
    const password = typeof body.password === "string" ? body.password : "";

    if (password.length < 6) {
        return json({error: "Use a password with at least 6 characters."}, 400);
    }

    const {error: updateError} = await supabase.auth.admin.updateUserById(userData.user.id, {
        password,
    });

    if (updateError) {
        return json({error: updateError.message}, 500);
    }

    return json({success: true});
});
