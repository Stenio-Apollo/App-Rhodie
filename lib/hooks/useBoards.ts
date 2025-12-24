"use client";

import {useEffect, useState} from "react";
import {useUser} from "@clerk/nextjs";
import {boardDataService, boardService, columnService, taskService} from "../services";
import {Board, ColumnWithTasks, Task} from "../supabase/models";
import {useSupabase} from "../supabase/SupabaseProvider";

// Hook to fetch all boards for the dashboard
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
            setError(null);
            const data = await boardService.getBoards(supabase, user.id);
            setBoards(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load boards.");
        } finally {
            setLoading(false);
        }
    }

    async function createBoard(boardData: { title: string; description?: string; color?: string }) {
        if (!user) throw new Error("User not authenticated");
        if (!supabase) throw new Error("Supabase client not available");

        try {
            const newBoard = await boardDataService.createBoardWithDefaultColumns(supabase, {
                ...boardData,
                userId: user.id,
            });
            setBoards((prev) => [newBoard, ...prev]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create board.");
        }
    }

    return {boards, loading, error, createBoard};
}

// Hook to fetch a single board with its columns and tasks
export function useBoard(boardId: string) {
    const {user} = useUser();
    const {supabase} = useSupabase();

    const [board, setBoard] = useState<Board | null>(null);
    const [columns, setColumns] = useState<ColumnWithTasks[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (boardId && supabase) {
            loadBoard();
        }
    }, [boardId, supabase]);

    async function loadBoard() {
        if (!boardId || !supabase) return;

        try {
            setLoading(true);
            setError(null);
            const data = await boardDataService.getBoardWithColumns(supabase, boardId);
            setBoard(data.board);
            setColumns(data.columnsWithTasks);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load board.");
        } finally {
            setLoading(false);
        }
    }

    async function updateBoard(updates: Partial<Board>) {
        if (!board || !supabase) return;

        try {
            const updatedBoard = await boardService.updateBoard(supabase, board.id, updates);
            setBoard(updatedBoard);
            return updatedBoard;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update the board.");
        }
    }

    async function createRealTask(
        columnId: string | number | undefined,
        taskData: {
            title: string;
            description?: string;
            assignee?: string;
            dueDate?: string;
            priority?: "low" | "medium" | "high";
        }
    ) {
        if (!supabase) return;

        try {
            const newTask = await taskService.createTask(supabase, {
                title: taskData.title,
                description: taskData.description || null,
                assignee: taskData.assignee || null,
                due_date: taskData.dueDate || null,
                column_id: columnId,
                sort_order: columns.find((col) => col.id === columnId)?.tasks.length || 0,
                priority: taskData.priority || "medium",
            });

            setColumns((prev) =>
                prev.map((col) =>
                    col.id === columnId ? {...col, tasks: [...col.tasks, newTask]} : col
                )
            );

            return newTask;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create the task.");
        }
    }

    // ✅ Persistent moveTask with Supabase update
    async function moveTask(taskId: string, newColumnId: string, newOrder: number) {
        if (!supabase) return;

        try {
            // 1️⃣ Update the task in Supabase
            await taskService.moveTask(supabase, taskId, newColumnId, newOrder);

            // 2️⃣ Update local state
            setColumns((prev) => {
                const newColumns = [...prev];
                let taskToMove: Task | null = null;

                // Remove task from old column
                for (const col of newColumns) {
                    const taskIndex = col.tasks.findIndex((t) => t.id === taskId);
                    if (taskIndex !== -1) {
                        taskToMove = col.tasks[taskIndex];
                        col.tasks.splice(taskIndex, 1);
                        break;
                    }
                }

                if (taskToMove) {
                    // Assign task to new column
                    const targetColumn = newColumns.find((col) => col.id === newColumnId);
                    if (targetColumn) {
                        taskToMove.column_id = newColumnId; // update column_id locally
                        targetColumn.tasks.splice(newOrder, 0, taskToMove);
                    }
                }

                return newColumns;
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to move task.");
        }
    }

    async function createColumn(title: string) {
        if (!board || !user || !supabase) throw new Error("Board not loaded");

        try {
            const newColumn = await columnService.createColumn(supabase, {
                title,
                board_id: board.id,
                sort_order: columns.length,
                user_id: user.id,
            });

            setColumns((prev) => [...prev, {...newColumn, tasks: []}]);
            return newColumn;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create column.");
        }
    }

    async function updateColumn(columnId: string, title: string) {
        if (!supabase) return;

        try {
            const updatedColumn = await columnService.updateColumnTitle(supabase, columnId, title);
            setColumns((prev) =>
                prev.map((col) => (col.id === columnId ? {...col, ...updatedColumn} : col))
            );
            return updatedColumn;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update column.");
        }
    }

    return {
        board,
        columns,
        loading,
        error,
        updateBoard,
        createRealTask,
        setColumns,
        moveTask,
        createColumn,
        updateColumn,
    };
}
