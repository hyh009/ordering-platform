import type { TodoEntity } from '@src/models/todo/model';

export const todoSeedData: TodoEntity[] = [
  {
    id: 'todo-1',
    title: 'Design frontend architecture',
    description: 'Document frontend boundaries.',
    status: 'done',
    priority: 'high',
    owner_name: 'Frontend',
  },
  {
    id: 'todo-2',
    title: 'Build Todo overview page',
    description: 'Create a feature-level Todo overview workflow.',
    status: 'in-progress',
    priority: 'medium',
    owner_name: 'Frontend',
  },
  {
    id: 'todo-3',
    title: 'Connect health API',
    description: 'Keep the frontend health link connected to the API.',
    status: 'todo',
    priority: 'low',
    owner_name: 'Full stack',
  },
];
