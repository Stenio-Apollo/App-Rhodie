"use client";

import {useEffect, useState} from "react";
import {useUser} from "@clerk/nextjs";
import {boardDataService, boardService, columnService, taskService,} from "../services";
import {Board, ColumnWithTasks} from "../supabase/models";
import {useSupabase} from "../supabase/SupabaseProvider";

/* ===========================
   DASHBOARD BOARDS HOOK
=========================== */

export function useBoards() {
    const {user} = useUser();
    const {supabase} = useSupabase();

    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user && supabase) {
            loadBoards();
        }
    }, [user, supabase]);

    async function loadBoards() {
        if (!user || !supabase) return;

        try {
            setLoading(true);
            const data = await boardService.getBoards(supabase, user.id);
            setBoards(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load boards");
        } finally {
            setLoading(false);
        }
    }

    async function createBoard(boardData: {
        title: string;
        description?: string;
        color?: string;
    }) {
        if (!user || !supabase) return;

        const newBoard =
            await boardDataService.createBoardWithDefaultColumns(supabase, {
                ...boardData,
                userId: user.id,
            });

        setBoards((prev) => [newBoard, ...prev]);
    }

    return {boards, loading, error, createBoard};
}

/* ===========================
   SINGLE BOARD HOOK
=========================== */

export function useBoard(boardId: string) {
    const {user} = useUser();
    const {supabase} = useSupabase();

    const [board, setBoard] = useState<Board | null>(null);
    const [columns, setColumns] = useState<ColumnWithTasks[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /* ---------- LOAD BOARD ---------- */

    useEffect(() => {
        if (boardId && supabase) {
            loadBoard();
        }
    }, [boardId, supabase]);

    async function loadBoard() {
        if (!supabase) return;

        try {
            setLoading(true);
            const data = await boardDataService.getBoardWithColumns(
                supabase,
                boardId
            );
            setBoard(data.board);
            setColumns(data.columnsWithTasks);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load board");
        } finally {
            setLoading(false);
        }
    }

    /* ---------- BOARD ---------- */

    async function updateBoard(id: string, updates: Partial<Board>) {
        if (!supabase) return;
        const updated = await boardService.updateBoard(supabase, id, updates);
        setBoard(updated);
        return updated;
    }

    /* ---------- TASKS ---------- */

    async function createRealTask(
        columnId: string,
        taskData: {
            title: string;
            description?: string;
            assignee?: string;
            dueDate?: string;
            priority?: "low" | "medium" | "high";
        }
    ) {
        if (!supabase) return;

        const newTask = await taskService.createTask(supabase, {
            title: taskData.title,
            description: taskData.description ?? null,
            assignee: taskData.assignee ?? null,
            due_date: taskData.dueDate ?? null,
            column_id: columnId,
            sort_order:
                columns.find((c) => c.id === columnId)?.tasks.length ?? 0,
            priority: taskData.priority ?? "medium",
        });

        setColumns((prev) =>
            prev.map((col) =>
                col.id === columnId
                    ? {...col, tasks: [...col.tasks, newTask]}
                    : col
            )
        );

        return newTask;
    }

    /* ---------- ✅ PERSISTENT MOVE TASK ---------- */

    async function moveTask(
        taskId: string,
        newColumnId: string,
        newOrder: number
    ) {
        if (!supabase) return;

        // 1️⃣ Persist to DB (this is what survives refresh)
        await taskService.moveTask(
            supabase,
            taskId,
            newColumnId,
            newOrder
        );

        // 2️⃣ Update UI state
        setColumns((prev) => {
            const sourceIdx = prev.findIndex((c) =>
                c.tasks.some((t) => t.id === taskId)
            );
            const destIdx = prev.findIndex((c) => c.id === newColumnId);

            if (sourceIdx === -1 || destIdx === -1) return prev;

            const sourceCol = prev[sourceIdx];
            const destCol = prev[destIdx];

            const sourceTasks = [...sourceCol.tasks];
            const taskIndex = sourceTasks.findIndex(
                (t) => t.id === taskId
            );
            if (taskIndex === -1) return prev;

            const [movedTask] = sourceTasks.splice(taskIndex, 1);

            const destTasks = [...destCol.tasks];
            destTasks.splice(newOrder, 0, {
                ...movedTask,
                column_id: newColumnId,
            });

            return prev.map((col, idx) => {
                if (idx === sourceIdx) {
                    return {
                        ...col,
                        tasks: sourceTasks.map((t, i) => ({
                            ...t,
                            sort_order: i,
                        })),
                    };
                }

                if (idx === destIdx) {
                    return {
                        ...col,
                        tasks: destTasks.map((t, i) => ({
                            ...t,
                            sort_order: i,
                        })),
                    };
                }

                return col;
            });
        });
    }

    /* ---------- COLUMNS ---------- */

    async function createColumn(title: string) {
        if (!board || !user || !supabase) return;

        const newColumn = await columnService.createColumn(supabase, {
            title,
            board_id: board.id,
            sort_order: columns.length,
            user_id: user.id,
        });

        setColumns((prev) => [...prev, {...newColumn, tasks: []}]);
        return newColumn;
    }

    async function updateColumn(columnId: string, title: string) {
        if (!supabase) return;

        const updated = await columnService.updateColumnTitle(
            supabase,
            columnId,
            title
        );

        setColumns((prev) =>
            prev.map((c) =>
                c.id === columnId ? {...c, ...updated} : c
            )
        );

        return updated;
    }

    return {
        board,
        columns,
        loading,
        error,
        updateBoard,
        createRealTask,
        moveTask,
        createColumn,
        updateColumn,
        setColumns,
    };
}
