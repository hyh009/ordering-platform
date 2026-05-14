import type { Todo } from '@/models/todo.types';
import type { TodoDetailStore } from '../store/todoDetail.store';

export function createTodoDetailActions(todoDetailStore: TodoDetailStore) {
  return {
    startLoading() {
      todoDetailStore.setState({
        todo: null,
        isLoading: true,
        error: null,
      });
    },

    loadSuccess(todo: Todo | null) {
      todoDetailStore.setState({
        todo,
        error: null,
        isLoading: false,
      });
    },

    loadFailed(message: string) {
      todoDetailStore.setState({
        error: message,
        isLoading: false,
      });
    },

    saveSuccess(todo: Todo) {
      todoDetailStore.setState({
        error: null,
        todo,
      });
    },

    deleteSuccess() {
      todoDetailStore.setState({
        error: null,
        todo: null,
      });
    },
  };
}

export type TodoDetailActions = ReturnType<typeof createTodoDetailActions>;
