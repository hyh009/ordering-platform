import type {
  Todo,
  TodoDto,
  TodoPriority,
  TodoRequest,
  TodoStatus,
} from './todo.types';

const statusLabel: Record<TodoStatus, string> = {
  todo: 'Todo',
  'in-progress': 'In progress',
  done: 'Done',
};

const priorityLabel: Record<TodoPriority, string> = {
  low: 'Low priority',
  medium: 'Medium priority',
  high: 'High priority',
};

export const todoModel = {
  deserialize(dto: TodoDto): Todo {
    return {
      id: dto.id,
      title: dto.title,
      description: dto.description ?? '',
      status: dto.status,
      priority: dto.priority,
      ownerName: dto.owner_name,
    };
  },

  serialize(todo: Todo): TodoRequest {
    return {
      title: todo.title,
      description: todo.description,
      status: todo.status,
      priority: todo.priority,
      owner_name: todo.ownerName,
    };
  },

  serializeCreate(todo: Omit<Todo, 'id'>): TodoRequest {
    return {
      title: todo.title,
      description: todo.description,
      status: todo.status,
      priority: todo.priority,
      owner_name: todo.ownerName,
    };
  },

  getStatusLabel(status: TodoStatus) {
    return statusLabel[status];
  },

  getPriorityLabel(priority: TodoPriority) {
    return priorityLabel[priority];
  },

  getOwnerLabel(todo: Todo) {
    return todo.ownerName;
  },
};
