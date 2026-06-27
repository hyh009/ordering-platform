import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreFrontCommandFailure } from '@/services/utils/storeFrontApiError';
import {
  handleStoreFrontFailure,
  handleStorefrontLoadFailure,
  resolveStorefrontLoadFailure,
  STOREFRONT_FAILURE_PRESENTATION,
} from './storeFrontFailureFeedback';

const toast = vi.fn();
const alert = vi.fn();

vi.mock('@/app/global/feedback/feedback.commands', () => ({
  feedbackCommands: {
    toast: (input: unknown) => toast(input),
    alert: (input: unknown) => alert(input),
  },
}));

function failure(
  overrides: Partial<StoreFrontCommandFailure> & {
    fieldErrors?: Record<string, string>;
  },
): StoreFrontCommandFailure & { fieldErrors?: Record<string, string> } {
  return {
    status: 'failed',
    reason: 'unknown',
    message: 'Something failed',
    ...overrides,
  };
}

function formSink() {
  return {
    setSubmitError: vi.fn(),
    setFieldErrors: vi.fn(),
  };
}

describe('handleStoreFrontFailure', () => {
  beforeEach(() => {
    toast.mockClear();
    alert.mockClear();
  });

  it('toasts a toast-reason failure with its message', () => {
    handleStoreFrontFailure(failure({ reason: 'not-found' }));

    expect(toast).toHaveBeenCalledWith({
      tone: 'error',
      message: 'Something failed',
    });
    expect(alert).not.toHaveBeenCalled();
  });

  it('shows nothing for a silent control-flow reason', () => {
    handleStoreFrontFailure(
      failure({ reason: 'session-store-mismatch', message: '' }),
    );

    expect(toast).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  it('shows nothing when a failure carries no message', () => {
    handleStoreFrontFailure(failure({ reason: 'session-expired', message: '' }));

    expect(toast).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  it('puts an inline-reason message on the form submit error', () => {
    const form = formSink();

    handleStoreFrontFailure(
      failure({ reason: 'invalid-join-code', message: 'Invalid invite' }),
      { form },
    );

    expect(form.setSubmitError).toHaveBeenCalledWith('Invalid invite');
    expect(toast).not.toHaveBeenCalled();
  });

  it('falls back to a toast when an inline reason has no form to land in', () => {
    handleStoreFrontFailure(
      failure({ reason: 'invalid-join-code', message: 'Invalid invite' }),
    );

    expect(toast).toHaveBeenCalledWith({
      tone: 'error',
      message: 'Invalid invite',
    });
  });

  it('field errors win and suppress the form-level message', () => {
    const form = formSink();

    handleStoreFrontFailure(
      failure({ reason: 'invalid', fieldErrors: { joinCode: 'Required' } }),
      { form },
    );

    expect(form.setFieldErrors).toHaveBeenCalledWith({ joinCode: 'Required' });
    expect(form.setSubmitError).toHaveBeenCalledWith(null);
    expect(toast).not.toHaveBeenCalled();
  });

  it('declares invalid-join-code as an inline action presentation', () => {
    expect(STOREFRONT_FAILURE_PRESENTATION['invalid-join-code'].action).toBe(
      'inline',
    );
  });
});

describe('resolveStorefrontLoadFailure', () => {
  it('resolves a network failure to a full-page load error', () => {
    expect(resolveStorefrontLoadFailure(failure({ reason: 'network' }))).toBe(
      'page',
    );
  });

  it('resolves a session-store-mismatch race to a silent load', () => {
    expect(
      resolveStorefrontLoadFailure(failure({ reason: 'session-store-mismatch' })),
    ).toBe('silent');
  });
});

describe('handleStorefrontLoadFailure', () => {
  it('routes a page directive to onPageError with the message', () => {
    const onRedirect = vi.fn();
    const onPageError = vi.fn();

    handleStorefrontLoadFailure(
      failure({ reason: 'network', message: 'Offline' }),
      { onRedirect, onPageError },
    );

    expect(onPageError).toHaveBeenCalledWith('Offline');
    expect(onRedirect).not.toHaveBeenCalled();
  });

  it('routes a redirect directive to onRedirect, not onPageError', () => {
    const onRedirect = vi.fn();
    const onPageError = vi.fn();

    handleStorefrontLoadFailure(failure({ reason: 'session-expired' }), {
      onRedirect,
      onPageError,
    });

    expect(onRedirect).toHaveBeenCalledTimes(1);
    expect(onPageError).not.toHaveBeenCalled();
  });

  it('does nothing for a silent directive', () => {
    const onRedirect = vi.fn();
    const onPageError = vi.fn();

    handleStorefrontLoadFailure(
      failure({ reason: 'session-store-mismatch', message: '' }),
      { onRedirect, onPageError },
    );

    expect(onRedirect).not.toHaveBeenCalled();
    expect(onPageError).not.toHaveBeenCalled();
  });

  it('omitting onPageError on a page directive is a no-op (store already wrote it)', () => {
    const onRedirect = vi.fn();

    expect(() =>
      handleStorefrontLoadFailure(failure({ reason: 'network' }), {
        onRedirect,
      }),
    ).not.toThrow();
    expect(onRedirect).not.toHaveBeenCalled();
  });
});
