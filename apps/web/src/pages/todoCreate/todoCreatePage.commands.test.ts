import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/apiError';
import { todoService } from '@/services/todo.service';
import { createTodoCreatePageCommands } from './todoCreatePage.commands';

vi.mock('@/services/todo.service', () => ({
  todoService: {
    createTodo: vi.fn(),
  },
}));

const todoInput = {
  description: '',
  ownerName: 'Hsinyao',
  priority: 'medium',
  status: 'todo',
  title: 'Write docs',
} as const;

describe('TodoCreatePageCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the created todo id', async () => {
    const commands = createTodoCreatePageCommands();

    vi.mocked(todoService.createTodo).mockResolvedValue({
      ...todoInput,
      id: 'todo-1',
    });

    await expect(commands.createTodo(todoInput)).resolves.toEqual({
      status: 'created',
      todoId: 'todo-1',
    });
  });

  it('maps API errors into a failed result', async () => {
    const commands = createTodoCreatePageCommands();

    vi.mocked(todoService.createTodo).mockRejectedValue(
      new ApiError({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );

    await expect(commands.createTodo(todoInput)).resolves.toEqual({
      status: 'failed',
      reason: 'server',
    });
  });
});
