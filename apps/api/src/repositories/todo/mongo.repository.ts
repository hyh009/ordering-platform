import { randomUUID } from 'node:crypto';

import { TodoMongoModel } from '@src/models/todo/mongo';

import type { TodoEntity } from '@src/models/todo/model';
import type {
  CreateTodoInput,
  UpdateTodoInput,
} from '@src/repositories/todo/repository';

function toTodoEntity(todo: TodoEntity): TodoEntity {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description ?? null,
    status: todo.status,
    priority: todo.priority,
    owner_name: todo.owner_name,
  };
}

function createUpdatePayload(input: UpdateTodoInput) {
  const payload: Partial<TodoEntity> = {};

  if (input.title !== undefined) {
    payload.title = input.title;
  }

  if (input.status !== undefined) {
    payload.status = input.status;
  }

  if (input.priority !== undefined) {
    payload.priority = input.priority;
  }

  if (input.owner_name !== undefined) {
    payload.owner_name = input.owner_name;
  }

  if (Object.hasOwn(input, 'description')) {
    payload.description = input.description ?? null;
  }

  return payload;
}

export const todoMongoRepository = {
  async list() {
    const todos = await TodoMongoModel.find().lean<TodoEntity[]>().exec();

    return todos.map(toTodoEntity);
  },

  async findById(todoId: string) {
    const todo = await TodoMongoModel.findOne({ id: todoId })
      .lean<TodoEntity>()
      .exec();

    return todo ? toTodoEntity(todo) : null;
  },

  async create(input: CreateTodoInput) {
    const todo = await TodoMongoModel.create({
      id: `todo-${randomUUID()}`,
      ...input,
      description: input.description ?? null,
    });

    return toTodoEntity(todo.toObject());
  },

  async update(todoId: string, input: UpdateTodoInput) {
    const todo = await TodoMongoModel.findOneAndUpdate(
      { id: todoId },
      { $set: createUpdatePayload(input) },
      { new: true, runValidators: true },
    ).exec();

    return todo ? toTodoEntity(todo.toObject()) : null;
  },

  async delete(todoId: string) {
    const todo = await TodoMongoModel.findOneAndDelete({ id: todoId })
      .lean<TodoEntity>()
      .exec();

    return todo ? { id: todo.id } : null;
  },
};
