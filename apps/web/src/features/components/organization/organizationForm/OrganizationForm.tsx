import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { organizationStatuses } from '@/models/organization';
import { TaiwanAddressFields } from '@/shared/components/address/TaiwanAddressFields';
import { Field } from '@/shared/components/form/Field';
import { OptionsSelect } from '@/shared/components/form/OptionsSelect';
import { SearchableSelect } from '@/shared/components/form/SearchableSelect';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { userService } from '@/services/userService';
import type { UserListItem } from '@/models/user';
import type { OrganizationFormVM } from './useOrganizationForm';

type OrganizationFormProps = {
  form: OrganizationFormVM;
  hideFooter?: boolean;
  id?: string;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
  showOwnerUserId?: boolean;
  showStatus?: boolean;
};

export function OrganizationForm({
  form,
  hideFooter = false,
  id,
  onCancel,
  onSubmit,
  showOwnerUserId = false,
  showStatus = false,
}: OrganizationFormProps) {
  const { tDefault } = useAppTranslation();
  const shouldShowSubmitError = form.submitError && !form.hasFieldErrors();

  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebouncedValue(userSearch, 300);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    if (!showOwnerUserId) return;

    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) {
        setIsSearchingUsers(true);
      }
    });

    userService
      .listUsers({ limit: 10, offset: 0, keyword: debouncedUserSearch })
      .then((res) => {
        if (isMounted) {
          setUsers(res.users);
          setIsSearchingUsers(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsSearchingUsers(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedUserSearch, showOwnerUserId]);

  const userOptions = useMemo(() => {
    return users.map((user) => ({
      label: `${user.email} (${user.username})`,
      searchLabel: user.email,
      value: user.id,
    }));
  }, [users]);

  const selectedUserOption = useMemo(() => {
    if (!form.values.ownerUserId) return null;
    const user = users.find((u) => u.id === form.values.ownerUserId);
    if (user) {
      return {
        label: `${user.email} (${user.username})`,
        searchLabel: user.email,
        value: user.id,
      };
    }
    return {
      label: form.values.ownerUserId,
      searchLabel: form.values.ownerUserId,
      value: form.values.ownerUserId,
    };
  }, [users, form.values.ownerUserId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit();
  }

  return (
    <form className="grid gap-4" id={id} onSubmit={handleSubmit}>
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
          <SearchableSelect
            emptyMessage={tDefault(
              'admin.organizations.noUsersFound',
              'No users found',
            )}
            isLoading={isSearchingUsers}
            options={userOptions}
            placeholder={tDefault(
              'admin.organizations.searchUser',
              'Search user by email or username...',
            )}
            searchValue={userSearch}
            selectedOption={selectedUserOption}
            value={form.values.ownerUserId}
            onSearchChange={setUserSearch}
            onValueChange={(value) => {
              form.setField('ownerUserId', value);
            }}
          />
        </Field>
      ) : null}

      <Field
        error={form.fieldErrors.slug}
        label={tDefault('admin.organizations.slug', 'Slug')}
        required
      >
        <Input
          value={form.values.slug}
          onChange={(event) => {
            form.setField('slug', event.target.value);
          }}
        />
      </Field>

      <h4 className="border-b border-border pb-2 text-sm font-semibold">
        {tDefault('admin.organizations.contactTitle', 'Contact')}
      </h4>

      <Field
        error={form.fieldErrors.contactEmail}
        label={tDefault('admin.organizations.contactEmail', 'Email')}
        required
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
        required
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
        required
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

      {!hideFooter ? (
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
      ) : null}
    </form>
  );
}
