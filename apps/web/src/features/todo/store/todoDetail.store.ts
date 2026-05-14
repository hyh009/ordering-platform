import { createStore } from 'zustand/vanilla';
import type { Todo } from '@/models/todo.types';

export type TodoDetailState = {
  todo: Todo | null;
  isLoading: boolean;
  error: string | null;
};

export function createTodoDetailStore() {
  return createStore<TodoDetailState>(() => ({
    todo: null,
    isLoading: false,
    error: null,
  }));
}

export type TodoDetailStore = ReturnType<typeof createTodoDetailStore>;
