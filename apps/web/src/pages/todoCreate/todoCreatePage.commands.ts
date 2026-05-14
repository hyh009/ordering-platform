import { getApiFailureReason } from '@/api/apiError';
import { todoService } from '@/services/todo.service';
import type { ApiFailureReason } from '@/api/apiError';
import type { Todo } from '@/models/todo.types';

export type CreateTodoFailureReason = ApiFailureReason;

export type CreateTodoResult =
  | {
      status: 'created';
      todoId: string;
    }
  | {
      status: 'failed';
      reason: CreateTodoFailureReason;
    };

class TodoCreatePageCommands {
  async createTodo(todo: Omit<Todo, 'id'>): Promise<CreateTodoResult> {
    try {
      const createdTodo = await todoService.createTodo(todo);

      return {
        status: 'created',
        todoId: createdTodo.id,
      };
    } catch (error) {
      return {
        status: 'failed',
        reason: getApiFailureReason(error),
      };
    }
  }
}

export function createTodoCreatePageCommands() {
  return new TodoCreatePageCommands();
}
