import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient, type PostgrestError } from "@supabase/supabase-js";
import type { Task } from "@/lib/supabase/models";

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Server is not configured for Supabase. Missing URL or service role key." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const title: string = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "Untitled Task";
    const description: string | null = typeof body?.description === "string" ? body.description || null : null;
    const assignee: string | null = typeof body?.assignee === "string" ? body.assignee || null : null;
    const due_date: string | null =
      typeof body?.due_date === "string" && body.due_date.trim()
        ? body.due_date
        : typeof body?.dueDate === "string" && body.dueDate.trim()
          ? body.dueDate
          : null;
    const priority: "low" | "medium" | "high" = ["low", "medium", "high"].includes(body?.priority) ? body.priority : "medium";
    const column_id: string = typeof body?.column_id === "string" ? body.column_id : "";
    const sort_order: number = Number.isFinite(body?.sort_order) ? Number(body.sort_order) : 0;

    if (!column_id) {
      return NextResponse.json({ error: "column_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient(url, serviceKey);

    const insertPayload = {
      title,
      description,
      assignee,
      due_date,
      priority,
      column_id,
      sort_order,
    } as const;

    const { data, error } = await supabase
      .from("tasks")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      const pgErr = error as PostgrestError;
      return NextResponse.json({ error: pgErr.message, details: pgErr.details }, { status: 400 });
    }

    return NextResponse.json(data as Task, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
