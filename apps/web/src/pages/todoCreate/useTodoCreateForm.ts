import { useCallback, useState } from 'react';
import { todoPriorities, todoStatuses } from '@repo/shared';
import { tDefault } from '@/app/i18n';
import type { TodoPriority, TodoStatus } from '@/models/todo.types';

export type TodoCreateFormValues = {
  description: string;
  ownerName: string;
  priority: TodoPriority;
  status: TodoStatus;
  title: string;
};

export type TodoCreateFieldErrors = Partial<TodoCreateFormValues>;

const initialValues: TodoCreateFormValues = {
  description: '',
  ownerName: '',
  priority: 'medium',
  status: 'todo',
  title: '',
};

export function useTodoCreateForm() {
  const [values, setValues] = useState<TodoCreateFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<TodoCreateFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setField = useCallback(function setField(
    name: keyof TodoCreateFormValues,
    value: string,
  ) {
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
    setSubmitError(null);
  }, []);

  const setStatus = useCallback(
    function setStatus(value: string) {
      if (todoStatuses.includes(value as TodoStatus)) {
        setField('status', value);
      }
    },
    [setField],
  );

  const setPriority = useCallback(
    function setPriority(value: string) {
      if (todoPriorities.includes(value as TodoPriority)) {
        setField('priority', value);
      }
    },
    [setField],
  );

  const validate = useCallback(
    function validate() {
      const errors: TodoCreateFieldErrors = {};

      if (!values.title.trim()) {
        errors.title = tDefault(
          'todo.validation.titleRequired',
          'Title is required.',
        );
      }

      if (!values.ownerName.trim()) {
        errors.ownerName = tDefault(
          'todo.validation.ownerRequired',
          'Owner is required.',
        );
      }

      setFieldErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [values],
  );

  const reset = useCallback(function reset() {
    setValues(initialValues);
    setFieldErrors({});
    setSubmitError(null);
  }, []);

  return {
    fieldErrors,
    reset,
    setField,
    setPriority,
    setStatus,
    setSubmitError,
    submitError,
    validate,
    values,
  };
}
