import { z } from 'zod';

export const todoStatuses = ['todo', 'in-progress', 'done'] as const;
export const todoPriorities = ['low', 'medium', 'high'] as const;

export type TodoStatus = (typeof todoStatuses)[number];
export type TodoPriority = (typeof todoPriorities)[number];

export type TodoDto = {
  id: string;
  title: string;
  description?: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  owner_name: string;
};

export const createTodoSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  status: z.enum(todoStatuses),
  priority: z.enum(todoPriorities),
  owner_name: z.string().trim().min(1),
});

export type CreateTodoRequest = z.infer<typeof createTodoSchema>;

export const updateTodoSchema = createTodoSchema
  .partial()
  .refine(
    (input) => Object.keys(input).length > 0,
    'At least one todo field is required',
  );

export type UpdateTodoRequest = z.infer<typeof updateTodoSchema>;

export type DeleteTodoResponse = {
  id: string;
};
