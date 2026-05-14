import { todoMemoryRepository } from '@src/repositories/todo/memory.repository';

import type { TodoEntity } from '@src/models/todo/model';

export type CreateTodoInput = Omit<TodoEntity, 'id' | 'description'> & {
  description?: string | null | undefined;
};

export type UpdateTodoInput = {
  title?: TodoEntity['title'] | undefined;
  description?: TodoEntity['description'] | undefined;
  status?: TodoEntity['status'] | undefined;
  priority?: TodoEntity['priority'] | undefined;
  owner_name?: TodoEntity['owner_name'] | undefined;
};

export type TodoRepository = {
  list(): Promise<TodoEntity[]>;
  findById(id: string): Promise<TodoEntity | null>;
  create(input: CreateTodoInput): Promise<TodoEntity>;
  update(id: string, input: UpdateTodoInput): Promise<TodoEntity | null>;
  delete(id: string): Promise<{ id: string } | null>;
  reset?(): void;
};

export const todoRepository: TodoRepository = todoMemoryRepository;
