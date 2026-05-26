import type { FormEvent } from 'react';
import { organizationStatuses } from '@repo/shared';
import { useAppTranslation } from '@/app/i18n';
import { TaiwanAddressFields } from '@/shared/components/address/TaiwanAddressFields';
import { Field } from '@/shared/components/form/Field';
import { OptionsSelect } from '@/shared/components/form/OptionsSelect';
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
  const shouldShowSubmitError = form.submitError && !form.hasFieldErrors();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {shouldShowSubmitError ? (
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

      <Field
        error={form.fieldErrors.domain}
        label={tDefault('admin.organizations.domain', 'Domain')}
      >
        <Input
          value={form.values.domain}
          onChange={(event) => {
            form.setField('domain', event.target.value);
          }}
        />
      </Field>

      <h4 className="border-b border-border pb-2 text-sm font-semibold">
        {tDefault('admin.organizations.contactTitle', 'Contact')}
      </h4>

      <Field
        error={form.fieldErrors.contactEmail}
        label={tDefault('admin.organizations.contactEmail', 'Email')}
      >
        <Input
          type="email"
          value={form.values.contactEmail}
          onChange={(event) => {
            form.setField('contactEmail', event.target.value);
          }}
        />
      </Field>

      <Field
        error={form.fieldErrors.contactPhone}
        label={tDefault('admin.organizations.contactPhone', 'Phone')}
      >
        <Input
          value={form.values.contactPhone}
          onChange={(event) => {
            form.setField('contactPhone', event.target.value);
          }}
        />
      </Field>

      <h4 className="border-b border-border pb-2 text-sm font-semibold">
        {tDefault('admin.organizations.address', 'Address')}
      </h4>

      <TaiwanAddressFields
        errors={{
          city: form.fieldErrors['address.city'],
          district: form.fieldErrors['address.district'],
          postalCode: form.fieldErrors['address.postalCode'],
          streetAddress: form.fieldErrors['address.streetAddress'],
        }}
        value={form.values.address}
        onChange={form.setAddress}
      />

      {showStatus ? (
        <Field
          error={form.fieldErrors.status}
          label={tDefault('admin.organizations.status', 'Status')}
          required
        >
          <OptionsSelect
            value={form.values.status}
            options={organizationStatuses.map((status) => ({
              label: status,
              value: status,
            }))}
            onValueChange={(status) => {
              form.setField('status', status);
            }}
          />
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
