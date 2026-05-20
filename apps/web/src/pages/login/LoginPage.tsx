import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAppTranslation } from '@/app/i18n';
import { Field } from '@/shared/components/form/Field';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useLoginPageVM } from './useLoginPageVM';

type RouteState = {
  from?: {
    pathname?: string;
  };
};

function getRedirectPath(state: unknown) {
  const routeState = state as RouteState | null;

  return routeState?.from?.pathname ?? '/';
}

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tDefault } = useAppTranslation();
  const vm = useLoginPageVM(() => {
    navigate(getRedirectPath(location.state), {
      replace: true,
    });
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void vm.submit();
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl content-center gap-8 px-5 py-10 md:grid-cols-[1fr_26rem] md:px-8">
      <div className="max-w-2xl self-center">
        <p className="mb-3 text-xs font-bold tracking-[0.08em] text-primary uppercase">
          {tDefault('auth.login.eyebrow', 'Super admin')}
        </p>
        <h1 className="mb-5 text-4xl leading-tight font-bold text-foreground md:text-5xl">
          {tDefault('auth.login.title', 'Sign in to the admin console')}
        </h1>
        <p className="max-w-xl text-base text-muted-foreground">
          {tDefault(
            'auth.login.description',
            'Manage organizations, allergens, and dietary markers with a super admin account.',
          )}
        </p>
      </div>

      <form
        className="grid gap-5 rounded-lg border border-border bg-card p-5 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div>
          <h2 className="mb-1 text-xl font-semibold">
            {tDefault('auth.login.formTitle', 'Admin login')}
          </h2>
          <p className="m-0 text-sm text-muted-foreground">
            {tDefault(
              'auth.login.formDescription',
              'Use an existing super admin platform account.',
            )}
          </p>
        </div>

        {vm.form.submitError ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {vm.form.submitError}
          </p>
        ) : null}

        <Field
          label={tDefault('auth.login.email', 'Email')}
          error={vm.form.fieldErrors.email}
          required
        >
          <Input
            autoComplete="email"
            value={vm.form.values.email}
            onChange={(event) => {
              vm.setField('email', event.target.value);
            }}
            type="email"
          />
        </Field>

        <Field
          label={tDefault('auth.login.password', 'Password')}
          error={vm.form.fieldErrors.password}
          required
        >
          <Input
            autoComplete="current-password"
            value={vm.form.values.password}
            onChange={(event) => {
              vm.setField('password', event.target.value);
            }}
            type="password"
          />
        </Field>

        <Button disabled={vm.form.isSubmitting} type="submit">
          {vm.form.isSubmitting
            ? tDefault('auth.login.submitting', 'Signing in...')
            : tDefault('auth.login.submit', 'Sign in')}
        </Button>
      </form>
    </section>
  );
}
