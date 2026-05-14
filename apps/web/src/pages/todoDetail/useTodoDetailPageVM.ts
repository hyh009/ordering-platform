import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { todoPriorities, todoStatuses } from '@repo/shared';
import { tDefault } from '@/app/i18n';
import { createTodoDetailActions } from '@/features/todo/actions/todoDetail.actions';
import { createTodoDetailStore } from '@/features/todo/store/todoDetail.store';
import { createTodoDetailPageCommands } from './todoDetailPage.commands';
import { feedbackVM } from '@/app/viewModel/feedback.vm';
import type { Todo, TodoPriority, TodoStatus } from '@/models/todo.types';

import type {
  DeleteTodoFailureReason,
  DeleteTodoResult,
  LoadTodoFailureReason,
  LoadTodoResult,
  SaveTodoFailureReason,
  SaveTodoResult,
} from './todoDetailPage.commands';

type TodoEditForm = Omit<Todo, 'id'>;

type TodoEditDraft = {
  todoId: string;
  values: TodoEditForm;
};

type TodoEditFormErrors = {
  errors: Partial<TodoEditForm>;
  todoId?: string;
};

type UseTodoDetailPageVMOptions = {
  onDeleted: () => void;
  todoId?: string;
};

const emptyForm: TodoEditForm = {
  description: '',
  ownerName: '',
  priority: 'medium',
  status: 'todo',
  title: '',
};

function todoToEditForm(todo: Todo): TodoEditForm {
  return {
    description: todo.description,
    ownerName: todo.ownerName,
    priority: todo.priority,
    status: todo.status,
    title: todo.title,
  };
}

function showLoadTodoToast(result: LoadTodoResult) {
  if (result.status === 'loaded') {
    return;
  }

  if (result.status === 'not-found') {
    feedbackVM.toast({
      tone: 'info',
      title: tDefault('todo.toast.notFound.title', 'Todo not found'),
      message: tDefault(
        'todo.toast.notFound.movedMessage',
        'This todo may have been deleted or moved.',
      ),
    });
    return;
  }

  const messageByReason: Record<LoadTodoFailureReason, string> = {
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
    title: tDefault('todo.toast.loadDetailFailed.title', 'Could not load todo'),
    message: messageByReason[result.reason],
  });
}

function showSaveTodoToast(result: SaveTodoResult) {
  if (result.status === 'saved') {
    feedbackVM.toast({
      tone: 'success',
      title: tDefault('todo.toast.saved.title', 'Todo saved'),
      message: tDefault('todo.toast.saved.message', 'Your changes were saved.'),
    });
    return;
  }

  const messageByReason: Record<SaveTodoFailureReason, string> = {
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
    unknown: tDefault(
      'todo.toast.validationFailed',
      'Check the form and try again.',
    ),
  };

  feedbackVM.toast({
    tone: 'error',
    title: tDefault('todo.toast.saveFailed.title', 'Could not save todo'),
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

type TodoDetailPageContext = ReturnType<typeof createTodoDetailPageContext>;

function createTodoDetailPageContext() {
  const store = createTodoDetailStore();
  const actions = createTodoDetailActions(store);
  const commands = createTodoDetailPageCommands(actions);

  return {
    actions: {
      async loadTodo(todoId: string) {
        const result = await commands.loadTodo(todoId);

        showLoadTodoToast(result);
        return result;
      },

      async saveTodo(todoId: string, todo: TodoEditForm) {
        const result = await commands.saveTodo(todoId, {
          ...todo,
          id: todoId,
        });

        showSaveTodoToast(result);
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

export function useTodoDetailPageVM({
  onDeleted,
  todoId,
}: UseTodoDetailPageVMOptions) {
  const [{ actions, store }] = useState<TodoDetailPageContext>(
    createTodoDetailPageContext,
  );

  const todo = useStore(store, (state) => state.todo);
  const isLoading = useStore(store, (state) => state.isLoading);
  const error = useStore(store, (state) => state.error);
  const [draft, setDraft] = useState<TodoEditDraft | null>(null);
  const [formErrorsState, setFormErrorsState] =
    useState<TodoEditFormErrors | null>(null);

  const form =
    draft && draft.todoId === todoId
      ? draft.values
      : todo
        ? todoToEditForm(todo)
        : emptyForm;
  const formErrors =
    formErrorsState && formErrorsState.todoId === todoId
      ? formErrorsState.errors
      : {};

  const setField = useCallback(
    function setField(name: keyof TodoEditForm, value: string) {
      if (!todoId) {
        return;
      }

      setDraft({
        todoId,
        values: {
          ...form,
          [name]: value,
        },
      });
      setFormErrorsState((current) => ({
        errors: {
          ...current?.errors,
          [name]: undefined,
        },
        todoId,
      }));
    },
    [form, todoId],
  );

  const setStatus = useCallback(
    function setStatus(value: string) {
      if (todoStatuses.includes(value as TodoStatus)) {
        setField('status', value);
      }
    },
    [setField],
  );

  const setPriority = useCallback(
    function setPriority(value: string) {
      if (todoPriorities.includes(value as TodoPriority)) {
        setField('priority', value);
      }
    },
    [setField],
  );

  const validateForm = useCallback(
    function validateForm() {
      const errors: Partial<TodoEditForm> = {};

      if (!form.title.trim()) {
        errors.title = tDefault(
          'todo.validation.titleRequired',
          'Title is required.',
        );
      }

      if (!form.ownerName.trim()) {
        errors.ownerName = tDefault(
          'todo.validation.ownerRequired',
          'Owner is required.',
        );
      }

      setFormErrorsState({
        errors,
        todoId,
      });
      return Object.keys(errors).length === 0;
    },
    [form, todoId],
  );

  const saveTodo = useCallback(
    async function saveTodo() {
      if (!todoId) {
        return;
      }

      if (!validateForm()) {
        return;
      }

      const result = await actions.saveTodo(todoId, {
        ...form,
        description: form.description.trim(),
        ownerName: form.ownerName.trim(),
        title: form.title.trim(),
      });

      if (result.status === 'saved') {
        setDraft(null);
      }
    },
    [actions, form, todoId, validateForm],
  );

  const loadTodo = useCallback(
    async function loadTodo() {
      if (!todoId) {
        return;
      }

      await actions.loadTodo(todoId);
    },
    [actions, todoId],
  );

  const deleteTodo = useCallback(
    async function deleteTodo() {
      if (!todoId) {
        return;
      }

      const result = await actions.deleteTodo(todoId);

      if (result.status === 'deleted' || result.status === 'not-found') {
        onDeleted();
      }
    },
    [actions, onDeleted, todoId],
  );

  useEffect(() => {
    void loadTodo();
  }, [loadTodo]);

  return {
    form,
    formErrors,
    todo,
    isLoading,
    error,
    deleteTodo,
    loadTodo,
    saveTodo,
    setField,
    setPriority,
    setStatus,
  };
}
