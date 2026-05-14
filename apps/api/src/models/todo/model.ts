export { todoPriorities, todoStatuses } from '@repo/shared';

import type { TodoPriority, TodoStatus } from '@repo/shared';

export type TodoEntity = {
  id: string;
  title: string;
  description?: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  owner_name: string;
};
