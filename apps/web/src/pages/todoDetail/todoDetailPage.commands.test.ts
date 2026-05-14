import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/apiError';
import { todoService } from '@/services/todo.service';
import { createTodoDetailPageCommands } from './todoDetailPage.commands';
import type { TodoDetailActions } from '@/features/todo/actions/todoDetail.actions';

vi.mock('@/services/todo.service', () => ({
  todoService: {
    deleteTodo: vi.fn(),
    getTodo: vi.fn(),
    saveTodo: vi.fn(),
  },
}));

function createActions() {
  return {
    startLoading: vi.fn(),
    loadSuccess: vi.fn(),
    loadFailed: vi.fn(),
    saveSuccess: vi.fn(),
    deleteSuccess: vi.fn(),
  } satisfies TodoDetailActions;
}

describe('TodoDetailPageCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps TODO_NOT_FOUND into a not-found page result', async () => {
    const actions = createActions();
    const commands = createTodoDetailPageCommands(actions);

    vi.mocked(todoService.getTodo).mockRejectedValue(
      new ApiError({
        statusCode: 404,
        code: 'TODO_NOT_FOUND',
        message: 'Todo not found',
      }),
    );

    await expect(commands.loadTodo('missing')).resolves.toEqual({
      status: 'not-found',
    });
    expect(actions.startLoading).toHaveBeenCalledOnce();
    expect(actions.loadFailed).toHaveBeenCalledWith('Todo item was not found.');
    expect(actions.loadSuccess).not.toHaveBeenCalled();
  });

  it('maps network errors into a failed result while storing the page error', async () => {
    const actions = createActions();
    const commands = createTodoDetailPageCommands(actions);

    vi.mocked(todoService.getTodo).mockRejectedValue(
      new ApiError({
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Unable to reach the API.',
      }),
    );

    await expect(commands.loadTodo('todo-1')).resolves.toEqual({
      status: 'failed',
      reason: 'network',
    });
    expect(actions.loadFailed).toHaveBeenCalledWith(
      'Failed to load todo item.',
    );
    expect(actions.loadSuccess).not.toHaveBeenCalled();
  });
});
