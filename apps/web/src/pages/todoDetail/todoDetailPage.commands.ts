import { getApiFailureReason, hasApiErrorCode } from '@/api/apiError';
import { tDefault } from '@/app/i18n';
import { todoService } from '@/services/todo.service';
import type { TodoDetailActions } from '@/features/todo/actions/todoDetail.actions';
import type { ApiFailureReason } from '@/api/apiError';

export type LoadTodoFailureReason = ApiFailureReason;
export type SaveTodoFailureReason = ApiFailureReason;
export type DeleteTodoFailureReason = ApiFailureReason;

export type LoadTodoResult =
  | {
      status: 'loaded';
    }
  | {
      status: 'not-found';
    }
  | {
      status: 'failed';
      reason: LoadTodoFailureReason;
    };

export type SaveTodoResult =
  | {
      status: 'saved';
    }
  | {
      status: 'failed';
      reason: SaveTodoFailureReason;
    };

export type DeleteTodoResult =
  | {
      status: 'deleted';
    }
  | {
      status: 'not-found';
    }
  | {
      status: 'failed';
      reason: DeleteTodoFailureReason;
    };

class TodoDetailPageCommands {
  private readonly todoDetailActions: TodoDetailActions;

  constructor(todoDetailActions: TodoDetailActions) {
    this.todoDetailActions = todoDetailActions;
  }

  async loadTodo(todoId: string): Promise<LoadTodoResult> {
    this.todoDetailActions.startLoading();

    try {
      const todo = await todoService.getTodo(todoId);

      this.todoDetailActions.loadSuccess(todo);

      return {
        status: 'loaded',
      };
    } catch (error) {
      const result = mapLoadTodoError(error);

      if (result.status === 'not-found') {
        this.todoDetailActions.loadFailed(
          tDefault('todo.detail.notFoundError', 'Todo item was not found.'),
        );
        return result;
      }

      this.todoDetailActions.loadFailed(
        tDefault('todo.detail.loadError', 'Failed to load todo item.'),
      );
      return result;
    }
  }

  async saveTodo(
    todoId: string,
    todo: Parameters<typeof todoService.saveTodo>[0],
  ) {
    try {
      const savedTodo = await todoService.saveTodo({
        ...todo,
        id: todoId,
      });

      this.todoDetailActions.saveSuccess(savedTodo);
      return {
        status: 'saved',
      } satisfies SaveTodoResult;
    } catch (error) {
      return {
        status: 'failed',
        reason: getApiFailureReason(error),
      } satisfies SaveTodoResult;
    }
  }

  async deleteTodo(todoId: string): Promise<DeleteTodoResult> {
    try {
      await todoService.deleteTodo(todoId);

      this.todoDetailActions.deleteSuccess();
      return {
        status: 'deleted',
      };
    } catch (error) {
      if (hasApiErrorCode(error, 'TODO_NOT_FOUND')) {
        return {
          status: 'not-found',
        };
      }

      return {
        status: 'failed',
        reason: getApiFailureReason(error),
      };
    }
  }
}

function mapLoadTodoError(error: unknown): LoadTodoResult {
  if (hasApiErrorCode(error, 'TODO_NOT_FOUND')) {
    return {
      status: 'not-found',
    };
  }

  return {
    status: 'failed',
    reason: getApiFailureReason(error),
  };
}

export function createTodoDetailPageCommands(actions: TodoDetailActions) {
  return new TodoDetailPageCommands(actions);
}
