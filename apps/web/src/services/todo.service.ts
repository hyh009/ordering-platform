import { apiJson } from '@/api';
import { todoPaths } from '@/api/paths/todo.paths';
import { todoModel } from '@/models/todo.model';
import type { ApiSuccessResponse } from '@/models/apiError.types';
import type { Todo } from '@/models/todo.types';
import type { DeleteTodoResponse, TodoDto } from '@/models/todo.types';

export const todoService = {
  async listTodos() {
    const response = await apiJson<ApiSuccessResponse<TodoDto[]>>(
      todoPaths.list,
    );

    return response.data.map(todoModel.deserialize);
  },

  async getTodo(todoId: string) {
    const response = await apiJson<ApiSuccessResponse<TodoDto>>(
      todoPaths.detail(todoId),
    );

    return todoModel.deserialize(response.data);
  },

  async saveTodo(todo: Todo) {
    const response = await apiJson<ApiSuccessResponse<TodoDto>>(
      todoPaths.detail(todo.id),
      {
        body: JSON.stringify(todoModel.serialize(todo)),
        method: 'PATCH',
      },
    );

    return todoModel.deserialize(response.data);
  },

  async createTodo(todo: Omit<Todo, 'id'>) {
    const response = await apiJson<ApiSuccessResponse<TodoDto>>(
      todoPaths.list,
      {
        body: JSON.stringify(todoModel.serializeCreate(todo)),
        method: 'POST',
      },
    );

    return todoModel.deserialize(response.data);
  },

  async deleteTodo(todoId: string) {
    const response = await apiJson<ApiSuccessResponse<DeleteTodoResponse>>(
      todoPaths.detail(todoId),
      {
        method: 'DELETE',
      },
    );

    return response.data;
  },
};
