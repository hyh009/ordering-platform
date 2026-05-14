import { useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { todoPriorities, todoStatuses } from '@repo/shared';
import { useAppTranslation } from '@/app/i18n';
import {
  getTodoPriorityLabel,
  getTodoStatusLabel,
} from '@/app/i18n/todoLabels';
import { Field } from '@/shared/components/form/Field';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { useTodoCreatePageVM } from './useTodoCreatePageVM';

export function TodoCreatePage() {
  const navigate = useNavigate();
  const { tDefault } = useAppTranslation();
  const handleCreated = useCallback(
    (todoId: string) => {
      navigate(`/todos/${todoId}`);
    },
    [navigate],
  );
  const vm = useTodoCreatePageVM({
    onCreated: handleCreated,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void vm.createTodo();
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-8 md:px-8">
      <div className="mb-6">
        <Button
          onClick={() => {
            navigate('/');
          }}
          type="button"
          variant="ghost"
        >
          {tDefault('todo.create.backToOverview', 'Back to overview')}
        </Button>
      </div>

      <form
        className="grid gap-5 rounded-lg border border-border bg-card p-5 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.08em] text-primary uppercase">
            {tDefault('todo.create.eyebrow', 'Create todo')}
          </p>
          <h1 className="mb-3 text-3xl leading-tight font-bold text-foreground md:text-4xl">
            {tDefault('todo.create.title', 'New todo')}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            {tDefault(
              'todo.create.description',
              'Add a todo with the owner, priority, and starting status.',
            )}
          </p>
        </div>

        {vm.form.submitError ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {vm.form.submitError}
          </p>
        ) : null}

        <Field
          label={tDefault('common.fields.title', 'Title')}
          error={vm.form.fieldErrors.title}
          required
        >
          <Input
            value={vm.form.values.title}
            onChange={(event) => {
              vm.form.setField('title', event.target.value);
            }}
          />
        </Field>

        <Field
          label={tDefault('common.fields.owner', 'Owner')}
          error={vm.form.fieldErrors.ownerName}
          required
        >
          <Input
            value={vm.form.values.ownerName}
            onChange={(event) => {
              vm.form.setField('ownerName', event.target.value);
            }}
          />
        </Field>

        <Field label={tDefault('common.fields.description', 'Description')}>
          <Textarea
            value={vm.form.values.description}
            onChange={(event) => {
              vm.form.setField('description', event.target.value);
            }}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            {tDefault('common.fields.status', 'Status')}
            <select
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              value={vm.form.values.status}
              onChange={(event) => {
                vm.form.setStatus(event.target.value);
              }}
            >
              {todoStatuses.map((status) => (
                <option key={status} value={status}>
                  {getTodoStatusLabel(tDefault, status)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            {tDefault('common.fields.priority', 'Priority')}
            <select
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              value={vm.form.values.priority}
              onChange={(event) => {
                vm.form.setPriority(event.target.value);
              }}
            >
              {todoPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {getTodoPriorityLabel(tDefault, priority)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button disabled={vm.isSubmitting} type="submit">
            {tDefault('todo.create.submit', 'Create todo')}
          </Button>
          <Button
            onClick={() => {
              navigate('/');
            }}
            type="button"
            variant="outline"
          >
            {tDefault('common.actions.cancel', 'Cancel')}
          </Button>
        </div>
      </form>
    </section>
  );
}
