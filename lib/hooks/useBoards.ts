"use client";
import {boardDataService} from "@/lib/services";
import {useUser} from "@clerk/nextjs";
import {useState} from "react";
import {Board} from "@/lib/supabase/models";
import {useSupabase} from "@/lib/supabase/SupabaseProvider";

export function useBoards() {
    const {isLoaded, isSignedIn, user} = useUser();
    const {supabase} = useSupabase();
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function createBoard(boardData?: {
        title?: string;
        description?: string;
        color?: string;
    }) {
        if (!isLoaded || !isSignedIn || !user) {
            throw new Error("User not authenticated");
        }
        if (!supabase) {
            throw new Error(
                "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY and restart the dev server."
            );
        }

        try {
            setLoading(true);
            const intent = {
                title: boardData?.title ?? "Untitled Board",
                description: boardData?.description ?? "No description provided",
                color: boardData?.color ?? "bg-gray-800",
            };

            try {
                // First try client-side via RLS-protected route (preferred if policies and JWT are configured)
                const newBoard = await boardDataService.createBoardWithDefaultColumns(supabase, {
                    ...intent,
                    userId: user.id,
                });
                setBoards((prev) => [newBoard, ...prev]);
                return newBoard;
            } catch (clientErr: unknown) {
                // Detect common RLS errors and fall back to server API route using service role
                const msg = clientErr instanceof Error ? clientErr.message : String(clientErr);
                const looksLikeRls = /row-level security|RLS|permission|not authorized|new row violates/i.test(msg);

                if (!looksLikeRls) {
                    throw clientErr; // Re-throw non-RLS errors
                }

                // Server fallback
                const res = await fetch("/api/boards", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(intent),
                });
                if (!res.ok) {
                    const body = (await res.json().catch(() => ({}))) as { error?: string; details?: string };
                    const serverMsg = body?.error || `Server failed with status ${res.status}`;
                    throw new Error(serverMsg);
                }
                const newBoard = (await res.json()) as Board;
                setBoards((prev) => [newBoard, ...prev]);
                return newBoard;
            }
        } catch (e: unknown) {
            let message = "Failed to create board";
            if (e instanceof Error) {
                message = e.message || message;
            } else if (typeof e === "object" && e !== null) {
                const err = e as { message?: string; details?: string; hint?: string; code?: string };
                if (err.message) message = err.message;
                if (err.details) message += ` — ${err.details}`;
            }
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }

    }

    return {boards, loading, error, createBoard};
}