import { createStore } from 'zustand/vanilla';
import type { Todo } from '@/models/todo.types';

export type TodoOverviewState = {
  todos: Todo[];
  isLoading: boolean;
  error: string | null;
};

export function createTodoOverviewStore() {
  return createStore<TodoOverviewState>(() => ({
    todos: [],
    isLoading: false,
    error: null,
  }));
}

export type TodoOverviewStore = ReturnType<typeof createTodoOverviewStore>;
