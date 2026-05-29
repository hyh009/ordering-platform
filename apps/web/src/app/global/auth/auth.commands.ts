import {
  getApiFailureReason,
  hasApiErrorCode,
  isApiError,
} from '@/api/apiError';
import { setApiRefreshHandler, setApiTokenProvider } from '@/api';
import { tDefault } from '@/app/i18n';
import { createAuthActions } from '@/app/global/auth/auth.actions';
import { authStore } from '@/app/global/auth/auth.store';
import { authService } from '@/services/auth.service';
import type { AuthUserDto, LoginRequest } from '@/models/auth.types';

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
    try {
      const session = await authService.login(input);

      authActions.authSuccess(session);
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
};

async function initializeAuth() {
  authActions.authChecking();

  try {
    const session = await authService.refresh();

    authActions.authSuccess(session);
  } catch {
    authActions.authAnonymous();
  }
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
