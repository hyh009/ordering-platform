import { todoPriorities, todoStatuses } from '@src/models/todo/model';
import { model, models, Schema } from 'mongoose';

import type { TodoEntity } from '@src/models/todo/model';
import type { Model } from 'mongoose';

const todoSchema = new Schema<TodoEntity>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: todoStatuses,
      default: 'todo',
    },
    priority: {
      type: String,
      required: true,
      enum: todoPriorities,
      default: 'medium',
    },
    owner_name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    collection: 'todos',
    id: false,
    timestamps: true,
  },
);

export const TodoMongoModel =
  (models.Todo as Model<TodoEntity> | undefined) ??
  model<TodoEntity>('Todo', todoSchema);
