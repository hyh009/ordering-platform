import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/apiError';
import { todoService } from '@/services/todo.service';
import { createTodoOverviewPageCommands } from './todoOverviewPage.commands';
import type { TodoOverviewActions } from '@/features/todo/actions/todoOverview.actions';

vi.mock('@/services/todo.service', () => ({
  todoService: {
    deleteTodo: vi.fn(),
    listTodos: vi.fn(),
    saveTodo: vi.fn(),
  },
}));

function createActions() {
  return {
    startLoading: vi.fn(),
    loadSuccess: vi.fn(),
    addTodo: vi.fn(),
    updateTodo: vi.fn(),
    removeTodo: vi.fn(),
    loadFailed: vi.fn(),
  } satisfies TodoOverviewActions;
}

const todo = {
  description: '',
  id: 'todo-1',
  ownerName: 'Hsinyao',
  priority: 'medium',
  status: 'todo',
  title: 'Write docs',
} as const;

describe('TodoOverviewPageCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps server errors into a failed result while storing the page error', async () => {
    const actions = createActions();
    const commands = createTodoOverviewPageCommands(actions);

    vi.mocked(todoService.listTodos).mockRejectedValue(
      new ApiError({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );

    await expect(commands.loadTodos()).resolves.toEqual({
      status: 'failed',
      reason: 'server',
    });
    expect(actions.startLoading).toHaveBeenCalledOnce();
    expect(actions.loadFailed).toHaveBeenCalledWith('Failed to load todos.');
    expect(actions.loadSuccess).not.toHaveBeenCalled();
  });

  it('stores the updated todo after a status change succeeds', async () => {
    const actions = createActions();
    const commands = createTodoOverviewPageCommands(actions);

    vi.mocked(todoService.saveTodo).mockResolvedValue({
      ...todo,
      status: 'done',
    });

    await expect(commands.updateTodoStatus(todo, 'done')).resolves.toEqual({
      status: 'updated',
    });
    expect(todoService.saveTodo).toHaveBeenCalledWith({
      ...todo,
      status: 'done',
    });
    expect(actions.updateTodo).toHaveBeenCalledWith({
      ...todo,
      status: 'done',
    });
  });

  it('does not update the store when a status change fails', async () => {
    const actions = createActions();
    const commands = createTodoOverviewPageCommands(actions);

    vi.mocked(todoService.saveTodo).mockRejectedValue(
      new ApiError({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );

    await expect(commands.updateTodoStatus(todo, 'done')).resolves.toEqual({
      status: 'failed',
      reason: 'server',
    });
    expect(actions.updateTodo).not.toHaveBeenCalled();
  });

  it('removes the todo after delete succeeds', async () => {
    const actions = createActions();
    const commands = createTodoOverviewPageCommands(actions);

    vi.mocked(todoService.deleteTodo).mockResolvedValue({
      id: 'todo-1',
    });

    await expect(commands.deleteTodo('todo-1')).resolves.toEqual({
      status: 'deleted',
    });
    expect(actions.removeTodo).toHaveBeenCalledWith('todo-1');
  });
});
