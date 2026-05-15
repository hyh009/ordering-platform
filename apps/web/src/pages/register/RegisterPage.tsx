import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAppTranslation } from '@/app/i18n';
import { Field } from '@/shared/components/form/Field';
import { Button } from '@/shared/components/ui/button';
import { buttonVariants } from '@/shared/components/ui/buttonVariants';
import { Input } from '@/shared/components/ui/input';
import { useRegisterPageVM } from './useRegisterPageVM';

export function RegisterPage() {
  const navigate = useNavigate();
  const { tDefault } = useAppTranslation();
  const vm = useRegisterPageVM(() => {
    navigate('/', {
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
          {tDefault('auth.register.eyebrow', 'Ordering platform')}
        </p>
        <h1 className="mb-5 text-4xl leading-tight font-bold text-foreground md:text-5xl">
          {tDefault('auth.register.title', 'Create an account')}
        </h1>
        <p className="max-w-xl text-base text-muted-foreground">
          {tDefault(
            'auth.register.description',
            'Registration returns an access token and issues the refresh cookie used by protected routes.',
          )}
        </p>
      </div>

      <form
        className="grid gap-5 rounded-lg border border-border bg-card p-5 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div>
          <h2 className="mb-1 text-xl font-semibold">
            {tDefault('auth.register.formTitle', 'Register')}
          </h2>
          <p className="m-0 text-sm text-muted-foreground">
            {tDefault(
              'auth.register.formDescription',
              'Start with a simple, production-shaped password rule.',
            )}
          </p>
        </div>

        {vm.form.submitError ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {vm.form.submitError}
          </p>
        ) : null}

        <Field
          label={tDefault('auth.register.email', 'Email')}
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
          label={tDefault('auth.register.username', 'Username')}
          error={vm.form.fieldErrors.username}
          required
        >
          <Input
            autoComplete="username"
            value={vm.form.values.username}
            onChange={(event) => {
              vm.setField('username', event.target.value);
            }}
          />
        </Field>

        <Field
          label={tDefault('auth.register.password', 'Password')}
          description={vm.passwordRuleMessage}
          error={vm.form.fieldErrors.password}
          required
        >
          <Input
            autoComplete="new-password"
            value={vm.form.values.password}
            onChange={(event) => {
              vm.setField('password', event.target.value);
            }}
            type="password"
          />
        </Field>

        <Field
          label={tDefault('auth.register.confirmPassword', 'Confirm password')}
          error={vm.form.fieldErrors.confirmPassword}
          required
        >
          <Input
            autoComplete="new-password"
            value={vm.form.values.confirmPassword}
            onChange={(event) => {
              vm.setField('confirmPassword', event.target.value);
            }}
            type="password"
          />
        </Field>

        <Button disabled={vm.form.isSubmitting} type="submit">
          {vm.form.isSubmitting
            ? tDefault('auth.register.submitting', 'Creating account...')
            : tDefault('auth.register.submit', 'Create account')}
        </Button>

        <Link className={buttonVariants({ variant: 'ghost' })} to="/login">
          {tDefault('auth.register.backToLogin', 'Back to login')}
        </Link>
      </form>
    </section>
  );
}
