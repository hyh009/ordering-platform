import { Link, useNavigate } from 'react-router';
import { todoStatuses } from '@repo/shared';
import { useAppTranslation } from '@/app/i18n';
import { getTodoStatusLabel } from '@/app/i18n/todoLabels';
import { TodoPriorityBadge } from '@/features/todo/components/TodoPriorityBadge';
import { TodoStatusBadge } from '@/features/todo/components/TodoStatusBadge';
import { LoadingState } from '@/shared/components/LoadingState';
import { Button } from '@/shared/components/ui/button';
import { useTodoOverviewPageVM } from './useTodoOverviewPageVM';
import type { TodoStatus } from '@/models/todo.types';

export function TodoOverviewPage() {
  const navigate = useNavigate();
  const { tDefault } = useAppTranslation();
  const vm = useTodoOverviewPageVM();

  if (vm.isLoading && vm.todos.length === 0) {
    return (
      <LoadingState
        label={tDefault('todo.overview.loading', 'Loading todos')}
      />
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-8 md:px-8">
      <div className="min-w-0">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.08em] text-primary uppercase">
              {tDefault('todo.overview.eyebrow', 'Protected todo workspace')}
            </p>
            <h1 className="mb-3 text-3xl leading-tight font-bold text-foreground md:text-4xl">
              {tDefault('todo.overview.title', 'Todos')}
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              {tDefault(
                'todo.overview.subtitle',
                'Review priorities, update status, or remove completed work.',
              )}
            </p>
          </div>
          <Button
            onClick={() => {
              navigate('/todos/new');
            }}
            type="button"
          >
            {tDefault('todo.overview.addTodo', 'Create todo')}
          </Button>
        </div>

        {vm.error ? (
          <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {vm.error}
          </p>
        ) : null}

        <div
          className="grid gap-3"
          aria-label={tDefault('todo.overview.listLabel', 'Todo list')}
        >
          {vm.todos.map((todo) => (
            <article
              className="grid gap-4 rounded-lg border border-border bg-card px-4 py-3 text-foreground shadow-sm transition hover:border-primary/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              key={todo.id}
            >
              <div className="grid min-w-0 gap-2">
                <Link
                  className="truncate text-base font-semibold text-foreground hover:text-primary"
                  to={`/todos/${todo.id}`}
                >
                  {todo.title}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {todo.ownerName}
                </span>
                <div className="flex flex-wrap gap-2">
                  <TodoStatusBadge status={todo.status} />
                  <TodoPriorityBadge priority={todo.priority} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <label className="sr-only" htmlFor={`todo-status-${todo.id}`}>
                  {tDefault('common.fields.status', 'Status')}
                </label>
                <select
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
                  id={`todo-status-${todo.id}`}
                  value={todo.status}
                  onChange={(event) => {
                    void vm.updateTodoStatus(
                      todo,
                      event.target.value as TodoStatus,
                    );
                  }}
                >
                  {todoStatuses.map((status) => (
                    <option key={status} value={status}>
                      {getTodoStatusLabel(tDefault, status)}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => {
                    void vm.deleteTodo(todo.id);
                  }}
                  type="button"
                  variant="destructive"
                >
                  {tDefault('common.actions.delete', 'Delete')}
                </Button>
              </div>
            </article>
          ))}
        </div>

        {vm.todos.length === 0 && !vm.isLoading ? (
          <p className="mt-4 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            {tDefault('todo.overview.empty', 'No todos yet.')}
          </p>
        ) : null}
      </div>
    </section>
  );
}
