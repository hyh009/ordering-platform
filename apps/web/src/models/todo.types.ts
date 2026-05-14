import type { CreateTodoRequest, TodoPriority, TodoStatus } from '@repo/shared';

export type {
  CreateTodoRequest,
  DeleteTodoResponse,
  TodoDto,
  TodoPriority,
  TodoStatus,
  UpdateTodoRequest,
} from '@repo/shared';

export type Todo = {
  id: string;
  title: string;
  description: string;
  status: TodoStatus;
  priority: TodoPriority;
  ownerName: string;
};

export type TodoRequest = CreateTodoRequest;
