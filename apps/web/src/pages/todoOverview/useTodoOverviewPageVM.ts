import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { tDefault } from '@/app/i18n';
import { createTodoOverviewActions } from '@/features/todo/actions/todoOverview.actions';
import { createTodoOverviewStore } from '@/features/todo/store/todoOverview.store';
import { feedbackVM } from '@/app/viewModel/feedback.vm';
import { createTodoOverviewPageCommands } from './todoOverviewPage.commands';
import type { Todo, TodoStatus } from '@/models/todo.types';
import type {
  DeleteTodoFailureReason,
  DeleteTodoResult,
  LoadTodosFailureReason,
  LoadTodosResult,
  UpdateTodoStatusFailureReason,
  UpdateTodoStatusResult,
} from './todoOverviewPage.commands';

function showLoadTodosToast(result: LoadTodosResult) {
  if (result.status === 'loaded') {
    return;
  }

  const messageByReason: Record<LoadTodosFailureReason, string> = {
    network: tDefault(
      'common.errors.checkApiServer',
      'Check that the API server is running, then try again.',
    ),
    server: tDefault(
      'common.errors.apiServerUnavailable',
      'The todo service is temporarily unavailable.',
    ),
    'invalid-response': tDefault(
      'common.errors.apiInvalidResponse',
      'The API returned data this page cannot read.',
    ),
    unknown: tDefault('common.errors.tryAgainLater', 'Try again in a moment.'),
  };

  feedbackVM.toast({
    tone: 'error',
    title: tDefault(
      'todo.toast.loadOverviewFailed.title',
      'Could not load todos',
    ),
    message: messageByReason[result.reason],
  });
}

function showUpdateTodoStatusToast(result: UpdateTodoStatusResult) {
  if (result.status === 'updated') {
    feedbackVM.toast({
      tone: 'success',
      title: tDefault('todo.toast.updated.title', 'Todo updated'),
      message: tDefault('todo.toast.updated.message', 'The status was saved.'),
    });
    return;
  }

  const messageByReason: Record<UpdateTodoStatusFailureReason, string> = {
    network: tDefault(
      'common.errors.checkApiServer',
      'Check that the API server is running, then try again.',
    ),
    server: tDefault(
      'common.errors.apiServerUnavailable',
      'The todo service is temporarily unavailable.',
    ),
    'invalid-response': tDefault(
      'common.errors.apiInvalidResponse',
      'The API returned data this page cannot read.',
    ),
    unknown: tDefault('common.errors.tryAgainLater', 'Try again in a moment.'),
  };

  feedbackVM.toast({
    tone: 'error',
    title: tDefault('todo.toast.updateFailed.title', 'Could not update todo'),
    message: messageByReason[result.reason],
  });
}

function showDeleteTodoToast(result: DeleteTodoResult) {
  if (result.status === 'deleted') {
    feedbackVM.toast({
      tone: 'success',
      title: tDefault('todo.toast.deleted.title', 'Todo deleted'),
      message: tDefault('todo.toast.deleted.message', 'The todo was removed.'),
    });
    return;
  }

  if (result.status === 'not-found') {
    feedbackVM.toast({
      tone: 'info',
      title: tDefault('todo.toast.notFound.title', 'Todo not found'),
      message: tDefault(
        'todo.toast.notFound.deletedMessage',
        'This todo may have already been deleted.',
      ),
    });
    return;
  }

  const messageByReason: Record<DeleteTodoFailureReason, string> = {
    network: tDefault(
      'common.errors.checkApiServer',
      'Check that the API server is running, then try again.',
    ),
    server: tDefault(
      'common.errors.apiServerUnavailable',
      'The todo service is temporarily unavailable.',
    ),
    'invalid-response': tDefault(
      'common.errors.apiInvalidResponse',
      'The API returned data this page cannot read.',
    ),
    unknown: tDefault('common.errors.tryAgainLater', 'Try again in a moment.'),
  };

  feedbackVM.toast({
    tone: 'error',
    title: tDefault('todo.toast.deleteFailed.title', 'Could not delete todo'),
    message: messageByReason[result.reason],
  });
}

type TodoOverviewPageContext = ReturnType<typeof createTodoOverviewPageContext>;

function createTodoOverviewPageContext() {
  const store = createTodoOverviewStore();
  const actions = createTodoOverviewActions(store);
  const commands = createTodoOverviewPageCommands(actions);

  return {
    actions: {
      async loadTodos() {
        const result = await commands.loadTodos();

        showLoadTodosToast(result);
      },

      async updateTodoStatus(todo: Todo, status: TodoStatus) {
        const result = await commands.updateTodoStatus(todo, status);

        showUpdateTodoStatusToast(result);
        return result;
      },

      async deleteTodo(todoId: string) {
        const result = await commands.deleteTodo(todoId);

        showDeleteTodoToast(result);
        return result;
      },
    },
    store,
  };
}

export function useTodoOverviewPageVM() {
  const [{ actions, store }] = useState<TodoOverviewPageContext>(
    createTodoOverviewPageContext,
  );
  const loadTodos = actions.loadTodos;

  const todos = useStore(store, (state) => state.todos);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

  const updateTodoStatus = useCallback(
    async function updateTodoStatus(todo: Todo, status: TodoStatus) {
      if (todo.status === status) {
        return;
      }

      await actions.updateTodoStatus(todo, status);
    },
    [actions],
  );

  const deleteTodo = useCallback(
    async function deleteTodo(todoId: string) {
      await actions.deleteTodo(todoId);
    },
    [actions],
  );

  return {
    error,
    deleteTodo,
    isLoading,
    loadTodos,
    todos,
    updateTodoStatus,
  };
}
