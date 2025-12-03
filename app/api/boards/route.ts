import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient as createAdminClient, type PostgrestError } from "@supabase/supabase-js";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Server is not configured for Supabase. Missing URL or service role key." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const title: string = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "Untitled Board";
    const description: string = typeof body?.description === "string" && body.description.trim() ? body.description.trim() : "No description provided";
    const color: string = typeof body?.color === "string" && body.color.trim() ? body.color.trim() : "bg-gray-800";

    // Use service role client to bypass RLS while still associating to the current user when possible
    const supabase = createAdminClient(url, serviceKey);

    const base = { title, description, color } as { title: string; description: string; color: string; user_id?: string };
    // Include user_id only if your schema uses text for user_id or if it accepts Clerk string id.
    // If your column is uuid, this will be rejected — you can remove this or convert to your own mapping.
    if (!isUuid(userId)) {
      base.user_id = userId;
    }

    const { data: board, error } = await supabase
      .from("boards")
      .insert(base)
      .select()
      .single();

    if (error) {
      const pgErr = error as PostgrestError;
      return NextResponse.json({ error: pgErr.message, details: pgErr.details }, { status: 400 });
    }

    // Best-effort default columns; ignore failures
    const defaults = [
      { title: "To Do", sort_order: 0 },
      { title: "In Progress", sort_order: 1 },
      { title: "Review", sort_order: 2 },
      { title: "Completed", sort_order: 3 },
    ];
    try {
      await supabase
        .from("columns")
        .insert(defaults.map((c) => ({ ...c, board_id: board.id })));
    } catch {
      // ignore
    }

    return NextResponse.json(board, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
