import type { Todo } from '@/models/todo.types';
import type { TodoOverviewStore } from '../store/todoOverview.store';

export function createTodoOverviewActions(
  todoOverviewStore: TodoOverviewStore,
) {
  return {
    startLoading() {
      todoOverviewStore.setState({
        isLoading: true,
        error: null,
      });
    },

    loadSuccess(todos: Todo[]) {
      todoOverviewStore.setState({
        todos,
        isLoading: false,
      });
    },

    addTodo(todo: Todo) {
      const { todos } = todoOverviewStore.getState();

      todoOverviewStore.setState({
        todos: [todo, ...todos],
      });
    },

    updateTodo(todo: Todo) {
      const { todos } = todoOverviewStore.getState();

      todoOverviewStore.setState({
        todos: todos.map((currentTodo) =>
          currentTodo.id === todo.id ? todo : currentTodo,
        ),
      });
    },

    removeTodo(todoId: string) {
      const { todos } = todoOverviewStore.getState();

      todoOverviewStore.setState({
        todos: todos.filter((todo) => todo.id !== todoId),
      });
    },

    loadFailed(message: string) {
      todoOverviewStore.setState({
        error: message,
        isLoading: false,
      });
    },
  };
}

export type TodoOverviewActions = ReturnType<typeof createTodoOverviewActions>;
