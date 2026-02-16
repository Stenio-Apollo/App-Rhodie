import {Board, Column, Task} from "./supabase/models";
import {SupabaseClient} from "@supabase/supabase-js";

export const boardService = {
    async getBoard(supabase: SupabaseClient, boardId: string): Promise<Board> {
        const {data, error} = await supabase
            .from("boards")
            .select("*")
            .eq("id", boardId)
            .single();

        if (error) throw error;

        return data;
    },


    async getBoards(supabase: SupabaseClient, userId: string): Promise<Board[]> {
        const {data, error} = await supabase
            .from("boards")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", {ascending: false});

        if (error) throw error;

        return data || [];
    },

    async createBoard(
        supabase: SupabaseClient,
        board: Omit<Board, "id" | "created_at" | "updated_at">
    ): Promise<Board> {
        const {data, error} = await supabase
            .from("boards")
            .insert(board)
            .select()
            .single();

        if (error) throw error;

        return data;
    },


    async updateBoard(
        supabase: SupabaseClient,
        boardId: string,
        updates: Partial<Board>
    ): Promise<Board> {
        const {data, error} = await supabase
            .from("boards")
            .update({...updates, updated_at: new Date().toISOString()})
            .eq("id", boardId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },
};

export const columnService = {
    async getColumns(
        supabase: SupabaseClient,
        boardId: string
    ): Promise<Column[]> {
        const {data, error} = await supabase
            .from("columns")
            .select("*")
            .eq("board_id", boardId)
            .order("sort_order", {ascending: true});

        if (error) throw error;

        return data || [];
    },

    async createColumn(
        supabase: SupabaseClient,
        column: Omit<Column, "id" | "created_at">
    ): Promise<Column> {
        const {data, error} = await supabase
            .from("columns")
            .insert(column)
            .select()
            .single();

        if (error) throw error;

        return data;
    },

    async updateColumnTitle(
        supabase: SupabaseClient,
        columnId: string,
        title: string
    ): Promise<Column> {
        const {data, error} = await supabase
            .from("columns")
            .update({title})
            .eq("id", columnId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },
};

export const taskService = {
    async getTasksByBoard(
        supabase: SupabaseClient,
        boardId: string
    ): Promise<Task[]> {
        const {data, error} = await supabase
            .from("tasks")
            .select(
                `
        *,
        columns!inner(board_id)
        `
            )
            .eq("columns.board_id", boardId)
            .order("sort_order", {ascending: true});

        if (error) throw error;

        return data || [];
    },

    async createTask(
        supabase: SupabaseClient,
        task: Omit<Task, "id" | "created_at" | "updated_at">
    ): Promise<Task> {
        const {data, error} = await supabase
            .from("tasks")
            .insert(task)
            .select()
            .single();

        if (error) throw error;

        return data;
    },

    async deleteTask(supabase: SupabaseClient, taskId: string) {
        const {error} = await supabase
            .from("tasks")
            .delete()
            .eq("id", taskId);

        if (error) throw error;

        return {success: true};
    },


    async moveTask(
        supabase: SupabaseClient,
        taskId: string,
        newColumnId: string,
        newOrder: number
    ) {
        // 1) Fetch the moving task to determine the source column
        const {data: task, error: taskErr} = await supabase
            .from("tasks")
            .select("id,column_id,sort_order")
            .eq("id", taskId)
            .single();
        if (taskErr) throw taskErr;

        const oldColumnId = task.column_id as string;

        // 2) Fetch current tasks in source and destination columns
        const [{data: destTasks, error: destErr}, {data: srcTasks, error: srcErr}] = await Promise.all([
            supabase
                .from("tasks")
                .select("id, sort_order")
                .eq("column_id", newColumnId)
                .order("sort_order", {ascending: true}),
            supabase
                .from("tasks")
                .select("id, sort_order")
                .eq("column_id", oldColumnId)
                .order("sort_order", {ascending: true}),
        ]);
        if (destErr) throw destErr;
        if (srcErr) throw srcErr;

        // 3) Build the new ordering
        const filteredDest = (destTasks || []).map(t => t.id).filter(id => id !== taskId);
        const clampedOrder = Math.max(0, Math.min(newOrder, filteredDest.length));
        filteredDest.splice(clampedOrder, 0, taskId);

        const srcIds: string[] = (srcTasks || []).map(t => t.id).filter(id => id !== taskId);

        // 4) Generate upserts: update sort_order for all affected tasks; update column_id only for the moved task
        const updates: { id: string; sort_order: number; column_id?: string }[] = [];

        filteredDest.forEach((id, idx) => {
            if (id === taskId) {
                updates.push({id, sort_order: idx, column_id: newColumnId});
            } else {
                updates.push({id, sort_order: idx});
            }
        });

        srcIds.forEach((id, idx) => {
            updates.push({id, sort_order: idx});
        });

        // 5) Persist
        const {error: upsertErr} = await supabase
            .from("tasks")
            .upsert(updates, {onConflict: "id"});
        if (upsertErr) throw upsertErr;

        return {success: true} as any;
    },
};

export const boardDataService = {
    async getBoardWithColumns(supabase: SupabaseClient, boardId: string) {
        const [board, columns] = await Promise.all([
            boardService.getBoard(supabase, boardId),
            columnService.getColumns(supabase, boardId),
        ]);

        if (!board) throw new Error("Board not found");

        const tasks = await taskService.getTasksByBoard(supabase, boardId);

        const columnsWithTasks = columns.map((column) => ({
            ...column,
            tasks: tasks.filter((task) => task.column_id === column.id),
        }));

        return {
            board,
            columnsWithTasks,
        };
    },

    async createBoardWithDefaultColumns(
        supabase: SupabaseClient,
        boardData: {
            title: string;
            description?: string;
            color?: string;
            userId: string;
        }
    ) {
        const board = await boardService.createBoard(supabase, {
            title: boardData.title,
            description: boardData.description || "no description provided",
            color: boardData.color || "bg-blue-500",
            user_id: boardData.userId,
        });

        const defaultColumns = [
            {title: "To Do", sort_order: 0},
            {title: "In Progress", sort_order: 1},
            {title: "Review", sort_order: 2},
            {title: "Done", sort_order: 3},
        ];

        await Promise.all(
            defaultColumns.map((column) =>
                columnService.createColumn(supabase, {
                    ...column,
                    board_id: board.id,
                    user_id: boardData.userId,
                })
            )
        );

        return board;
    },
};