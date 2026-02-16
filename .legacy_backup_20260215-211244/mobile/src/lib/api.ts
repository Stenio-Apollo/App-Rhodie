import type { Board, Column, Task, TaskPriority } from "../types";
import { API_BASE_URL } from "./config";

async function apiRequest<T>(
  getToken: () => Promise<string | null>,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json();
}

export function createApi(getToken: () => Promise<string | null>) {
  return {
    getBoards: () => apiRequest<Board[]>(getToken, "/api/mobile/boards"),

    createBoard: (payload: { title: string; description?: string; color?: string }) =>
      apiRequest<Board>(getToken, "/api/mobile/boards", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    getBoardDetails: (boardId: string) =>
      apiRequest<{ board: Board; columns: Column[] }>(getToken, `/api/mobile/boards/${boardId}`),

    getDueTasks: () => apiRequest<Task[]>(getToken, "/api/mobile/tasks?dueOnly=1"),

    createTask: (payload: {
      column_id: string;
      title: string;
      description?: string;
      assignee?: string;
      due_date?: string | null;
      priority?: TaskPriority;
      sort_order?: number;
    }) =>
      apiRequest<Task>(getToken, "/api/mobile/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    deleteTask: (taskId: string) =>
      apiRequest<{ success: true }>(getToken, `/api/mobile/tasks/${taskId}`, {
        method: "DELETE",
      }),

    moveTask: (payload: { taskId: string; newColumnId: string; targetIndex: number }) =>
      apiRequest<{ success: true }>(getToken, "/api/mobile/tasks/move", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    sendTestPush: (payload: { token: string; title?: string; message?: string }) =>
      apiRequest<{ success: true }>(getToken, "/api/mobile/notifications/test", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  };
}
