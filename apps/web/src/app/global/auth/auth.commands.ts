import {
  getApiFailureReason,
  hasApiErrorCode,
  isApiError,
} from '@/api/apiError';
import {
  setApi403Handler,
  setApiRefreshHandler,
  setApiTokenProvider,
} from '@/api';
import { tDefault } from '@/app/i18n';
import { feedbackCommands } from '@/app/global/feedback/feedback.commands';
import { createAuthActions } from '@/app/global/auth/auth.actions';
import { authStore } from '@/app/global/auth/auth.store';
import { activeOrgCommands } from '@/app/global/activeOrg/activeOrg.commands';
import { activeStoreCommands } from '@/app/global/activeStore/activeStore.commands';
import { authService } from '@/services/auth.service';
import { loginSchema } from '@/models/auth';
import type { AuthUserDto, LoginRequest } from '@/models/auth';

const authActions = createAuthActions(authStore);
let initializePromise: Promise<void> | null = null;

setApiTokenProvider(() => authStore.getState().accessToken);

setApiRefreshHandler(async () => {
  try {
    const session = await authService.refresh();

    authActions.authSuccess(session);
    return true;
  } catch {
    authActions.authAnonymous();
    return false;
  }
});

setApi403Handler(() => authCommands.revalidateMemberships());

function membershipsChanged(prev: AuthUserDto | null, next: AuthUserDto) {
  if (!prev) return false;
  if (prev.isSuperAdmin !== next.isSuperAdmin) return true;

  const key = (user: AuthUserDto) =>
    user.memberships
      .map((m) => `${m.organizationId}:${m.role}`)
      .sort()
      .join('|');

  return key(prev) !== key(next);
}

export type AuthSubmitResult =
  | {
      status: 'authenticated';
      user: AuthUserDto;
    }
  | AuthSubmitFailureResult;

export type AuthLogoutResult =
  | {
      status: 'logged-out';
    }
  | {
      status: 'failed';
      reason: ReturnType<typeof getApiFailureReason>;
    };

type AuthSubmitFailureResult = {
  status: 'failed';
  message: string;
  fieldErrors?: Partial<Record<keyof LoginRequest, string>>;
};

export const authCommands = {
  initialize() {
    if (initializePromise) {
      return initializePromise;
    }

    initializePromise = initializeAuth().finally(() => {
      initializePromise = null;
    });

    return initializePromise;
  },

  async login(input: LoginRequest): Promise<AuthSubmitResult> {
    const validation = loginSchema.safeParse(input);

    if (!validation.success) {
      return {
        fieldErrors: mapLoginValidationIssuesToFieldErrors(
          validation.error.issues,
        ),
        message: tDefault(
          'auth.validation.submitInvalid',
          'Check the highlighted fields and try again.',
        ),
        status: 'failed',
      };
    }

    try {
      const session = await authService.login(validation.data);

      authActions.authSuccess(session);
      const orgId = activeOrgCommands.initialize(session.user.memberships);
      activeStoreCommands.initialize(orgId);
      return {
        status: 'authenticated',
        user: session.user,
      };
    } catch (error) {
      const result: AuthSubmitFailureResult = mapAuthSubmitError(
        error,
        tDefault(
          'auth.errors.invalidCredentials',
          'Invalid email or password.',
        ),
      );

      return result;
    }
  },

  async logout(): Promise<AuthLogoutResult> {
    try {
      await authService.logout();

      authActions.authAnonymous();
      activeOrgCommands.clearOrg();
      activeStoreCommands.clearStore();
      return {
        status: 'logged-out',
      };
    } catch (error) {
      return {
        status: 'failed',
        reason: getApiFailureReason(error),
      };
    }
  },

  // Re-fetch the current user's memberships after a 403 and reconcile, so the UI
  // self-corrects: a demotion updates the role (hiding edit affordances) and a
  // revoked membership clears the active org/store (guards redirect to select).
  async revalidateMemberships(): Promise<void> {
    const prev = authStore.getState().user;

    let user: AuthUserDto;
    try {
      user = await authService.me();
    } catch {
      // A failure here means the session itself is invalid; the 401/refresh
      // path owns logout. Nothing to reconcile.
      return;
    }

    authActions.setUser(user);
    const orgId = activeOrgCommands.initialize(user.memberships);
    activeStoreCommands.initialize(orgId);

    if (membershipsChanged(prev, user)) {
      feedbackCommands.toast({
        tone: 'info',
        message: tDefault(
          'auth.permissionsChanged',
          'Your permissions have changed.',
        ),
      });
    }
  },
};

function getLoginFieldErrorKey(path: PropertyKey[]): keyof LoginRequest | null {
  const [field] = path.map(String);

  if (field === 'email' || field === 'password') {
    return field;
  }

  return null;
}

function loginValidationErrors() {
  return {
    email: tDefault('auth.validation.emailInvalid', 'Enter a valid email.'),
    password: tDefault(
      'auth.validation.passwordRequired',
      'Password is required.',
    ),
  };
}

function mapLoginValidationIssuesToFieldErrors(
  issues: Array<{ path: PropertyKey[] }>,
): Partial<Record<keyof LoginRequest, string>> {
  const messages = loginValidationErrors();
  const fieldErrors: Partial<Record<keyof LoginRequest, string>> = {};

  for (const issue of issues) {
    const field = getLoginFieldErrorKey(issue.path);

    if (!field || fieldErrors[field]) {
      continue;
    }

    fieldErrors[field] = messages[field];
  }

  return fieldErrors;
}

async function initializeAuth() {
  authActions.authChecking();

  let session;

  try {
    session = await authService.refresh();
  } catch {
    authActions.authAnonymous();
    activeOrgCommands.clearOrg();
    activeStoreCommands.clearStore();
    return;
  }

  authActions.authSuccess(session);
  const orgId = activeOrgCommands.initialize(session.user.memberships);
  activeStoreCommands.initialize(orgId);
}

function mapAuthSubmitError(
  error: unknown,
  fallbackMessage: string,
): AuthSubmitFailureResult {
  if (hasApiErrorCode(error, 'INVALID_CREDENTIALS')) {
    return {
      status: 'failed',
      message: tDefault(
        'auth.errors.invalidCredentials',
        'Invalid email or password.',
      ),
    };
  }

  if (hasApiErrorCode(error, 'VALIDATION_ERROR')) {
    return {
      status: 'failed',
      message: tDefault(
        'auth.validation.submitInvalid',
        'Check the highlighted fields and try again.',
      ),
    };
  }

  if (isApiError(error) && getApiFailureReason(error) === 'network') {
    return {
      status: 'failed',
      message: tDefault(
        'auth.errors.apiUnreachable',
        'Cannot reach the API server.',
      ),
    };
  }

  return {
    status: 'failed',
    message: fallbackMessage,
  };
}
