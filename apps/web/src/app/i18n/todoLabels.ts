import type { TodoPriority, TodoStatus } from '@/models/todo.types';

type TranslateDefault = (key: string, defaultValue: string) => string;

export function getTodoStatusLabel(
  tDefault: TranslateDefault,
  status: TodoStatus,
) {
  switch (status) {
    case 'todo':
      return tDefault('todo.labels.status.todo', 'Todo');
    case 'in-progress':
      return tDefault('todo.labels.status.inProgress', 'In progress');
    case 'done':
      return tDefault('todo.labels.status.done', 'Done');
  }
}

export function getTodoPriorityLabel(
  tDefault: TranslateDefault,
  priority: TodoPriority,
) {
  switch (priority) {
    case 'low':
      return tDefault('todo.labels.priority.low', 'Low priority');
    case 'medium':
      return tDefault('todo.labels.priority.medium', 'Medium priority');
    case 'high':
      return tDefault('todo.labels.priority.high', 'High priority');
  }
}
