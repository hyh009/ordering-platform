import type { FormEvent } from 'react';
import { organizationMembershipRoles } from '@repo/shared';
import { useAppTranslation } from '@/app/i18n';
import { Field } from '@/shared/components/form/Field';
import { OptionsSelect } from '@/shared/components/form/OptionsSelect';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { OrganizationMembershipRole } from '@/models/organizationMembership';
import type { AddMemberFormVM } from './useAddMemberForm';

const ROLE_LABELS: Record<OrganizationMembershipRole, string> = {
  org_owner: 'Org Owner',
  org_admin: 'Org Admin',
  staff: 'Staff',
};

const ROLE_OPTIONS = organizationMembershipRoles.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

type AddMemberFormProps = {
  form: AddMemberFormVM;
  hideFooter?: boolean;
  id?: string;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
};

export function AddMemberForm({
  form,
  hideFooter = false,
  id,
  onCancel,
  onSubmit,
}: AddMemberFormProps) {
  const { tDefault } = useAppTranslation();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit();
  }

  return (
    <form className="grid gap-4" id={id} onSubmit={handleSubmit}>
      {form.submitError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {form.submitError}
        </p>
      ) : null}

      <Field
        error={form.fieldErrors.email}
        label={tDefault('admin.memberships.email', 'Email')}
        required
      >
        <Input
          type="email"
          value={form.values.email}
          onChange={(event) => form.setField('email', event.target.value)}
        />
      </Field>

      <Field
        error={form.fieldErrors.username}
        label={tDefault('admin.memberships.username', 'Username')}
        required
      >
        <Input
          value={form.values.username}
          onChange={(event) => form.setField('username', event.target.value)}
        />
      </Field>

      <Field
        error={form.fieldErrors.temporaryPassword}
        label={tDefault(
          'admin.memberships.temporaryPassword',
          'Temporary password',
        )}
        required
      >
        <Input
          type="password"
          value={form.values.temporaryPassword}
          onChange={(event) =>
            form.setField('temporaryPassword', event.target.value)
          }
        />
      </Field>

      <Field
        error={form.fieldErrors.role}
        label={tDefault('admin.memberships.role', 'Role')}
        required
      >
        <OptionsSelect
          options={ROLE_OPTIONS}
          value={form.values.role}
          onValueChange={(v) =>
            form.setField('role', v as OrganizationMembershipRole)
          }
        />
      </Field>

      {!hideFooter ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onCancel} type="button" variant="ghost">
            {tDefault('common.actions.cancel', 'Cancel')}
          </Button>
          <Button disabled={form.isSubmitting} type="submit">
            {form.isSubmitting
              ? tDefault('common.actions.saving', 'Saving...')
              : tDefault('admin.memberships.addMember', 'Add member')}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
