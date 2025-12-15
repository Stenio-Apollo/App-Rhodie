import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient as createAdminClient, type PostgrestError } from "@supabase/supabase-js";
import type { Column } from "@/lib/supabase/models";

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
    const title: string = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "Untitled";
    const board_id: string = typeof body?.board_id === "string" && body.board_id.trim() ? body.board_id : "";
    const sort_order: number = Number.isFinite(body?.sort_order) ? Number(body.sort_order) : 0;

    if (!board_id) {
      return NextResponse.json({ error: "board_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient(url, serviceKey);

    const payload: { title: string; board_id: string; sort_order: number; user_id?: string } = {
      title,
      board_id,
      sort_order,
    };
    if (isUuid(userId)) {
      payload.user_id = userId;
    }

    const { data, error } = await supabase
      .from("columns")
      .insert(payload)
      .select()
      .single();

    if (error) {
      const pgErr = error as PostgrestError;
      return NextResponse.json({ error: pgErr.message, details: pgErr.details }, { status: 400 });
    }

    return NextResponse.json(data as Column, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
