import { useOrgSelectPageVM } from './useOrgSelectPageVM';

export function OrgSelectPage() {
  const vm = useOrgSelectPageVM();

  return (
    <section className="mx-auto w-full max-w-lg px-5 py-12">
      <h1 className="mb-6 text-2xl font-bold">Select Organization</h1>
      {vm.memberships.length === 0 ? (
        <p className="text-muted-foreground">
          You are not a member of any organization.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {vm.memberships.map((m) => (
            <li key={m.organizationId}>
              <button
                className={
                  'w-full rounded-lg border px-5 py-4 text-left transition-colors hover:bg-muted ' +
                  (vm.activeOrgId === m.organizationId
                    ? 'border-primary bg-muted font-semibold'
                    : 'border-border bg-background')
                }
                type="button"
                onClick={() => vm.selectOrg(m.organizationId, m.organizationName)}
              >
                <div className="font-medium">{m.organizationName}</div>
                <div className="mt-1 text-xs text-muted-foreground capitalize">
                  {m.role.replace('_', ' ')}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
