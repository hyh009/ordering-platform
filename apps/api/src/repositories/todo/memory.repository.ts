import { randomUUID } from 'node:crypto';

import { todoSeedData } from '@src/data/todos';

import type { TodoEntity } from '@src/models/todo/model';
import type {
  CreateTodoInput,
  UpdateTodoInput,
} from '@src/repositories/todo/repository';

let todos = todoSeedData.map(cloneTodo);

function cloneTodo(todo: TodoEntity): TodoEntity {
  return { ...todo };
}

export const todoMemoryRepository = {
  async list() {
    return todos.map(cloneTodo);
  },

  async findById(todoId: string) {
    const todo = todos.find((item) => item.id === todoId);

    return todo ? cloneTodo(todo) : null;
  },

  async create(input: CreateTodoInput) {
    const todo: TodoEntity = {
      id: `todo-${randomUUID()}`,
      ...input,
      description: input.description ?? null,
    };

    todos = [...todos, todo];

    return cloneTodo(todo);
  },

  async update(todoId: string, input: UpdateTodoInput) {
    const index = todos.findIndex((item) => item.id === todoId);

    if (index === -1) {
      return null;
    }

    const currentTodo = todos[index];

    if (!currentTodo) {
      return null;
    }

    const updatedTodo: TodoEntity = { ...currentTodo };

    if (input.title !== undefined) {
      updatedTodo.title = input.title;
    }

    if (input.status !== undefined) {
      updatedTodo.status = input.status;
    }

    if (input.priority !== undefined) {
      updatedTodo.priority = input.priority;
    }

    if (input.owner_name !== undefined) {
      updatedTodo.owner_name = input.owner_name;
    }

    if (Object.hasOwn(input, 'description')) {
      updatedTodo.description = input.description ?? null;
    }

    todos = todos.map((item) => (item.id === todoId ? updatedTodo : item));

    return cloneTodo(updatedTodo);
  },

  async delete(todoId: string) {
    const todo = todos.find((item) => item.id === todoId);

    if (!todo) {
      return null;
    }

    todos = todos.filter((item) => item.id !== todoId);

    return { id: todo.id };
  },

  reset() {
    todos = todoSeedData.map(cloneTodo);
  },
};
