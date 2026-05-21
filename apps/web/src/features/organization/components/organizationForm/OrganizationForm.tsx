import type { FormEvent } from 'react';
import { organizationStatuses } from '@repo/shared';
import { useAppTranslation } from '@/app/i18n';
import { Field } from '@/shared/components/form/Field';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { OrganizationFormVM } from './useOrganizationForm';

type OrganizationFormProps = {
  form: OrganizationFormVM;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
  showOwnerUserId?: boolean;
  showStatus?: boolean;
};

export function OrganizationForm({
  form,
  onCancel,
  onSubmit,
  showOwnerUserId = false,
  showStatus = false,
}: OrganizationFormProps) {
  const { tDefault } = useAppTranslation();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {form.submitError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {form.submitError}
        </p>
      ) : null}

      <Field
        error={form.fieldErrors.name}
        label={tDefault('admin.organizations.name', 'Name')}
        required
      >
        <Input
          value={form.values.name}
          onChange={(event) => {
            form.setField('name', event.target.value);
          }}
        />
      </Field>

      {showOwnerUserId ? (
        <Field
          description={tDefault(
            'admin.organizations.ownerDescription',
            'Use an existing active platform user ID.',
          )}
          error={form.fieldErrors.ownerUserId}
          label={tDefault('admin.organizations.ownerUserId', 'Owner user ID')}
          required
        >
          <Input
            value={form.values.ownerUserId}
            onChange={(event) => {
              form.setField('ownerUserId', event.target.value);
            }}
          />
        </Field>
      ) : null}

      {showStatus ? (
        <Field
          label={tDefault('admin.organizations.status', 'Status')}
          required
        >
          <select
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
            value={form.values.status}
            onChange={(event) => {
              form.setField('status', event.target.value);
            }}
          >
            {organizationStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={onCancel} type="button" variant="ghost">
          {tDefault('common.actions.cancel', 'Cancel')}
        </Button>
        <Button disabled={form.isSubmitting} type="submit">
          {form.isSubmitting
            ? tDefault('common.actions.saving', 'Saving...')
            : tDefault('common.actions.save', 'Save')}
        </Button>
      </div>
    </form>
  );
}
