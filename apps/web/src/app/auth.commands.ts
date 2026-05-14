import {
  getApiFailureReason,
  getValidationDetails,
  hasApiErrorCode,
  isApiError,
} from '@/api/apiError';
import { tDefault } from '@/app/i18n';
import { createAuthActions } from '@/features/auth/actions/auth.actions';
import { authStore } from '@/app/stores/auth.store';
import { authService } from '@/services/auth.service';
import type { LoginRequest, RegisterRequest } from '@/models/auth.types';

const authActions = createAuthActions(authStore);
let initializePromise: Promise<void> | null = null;

export type AuthSubmitResult =
  | {
      status: 'authenticated';
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
  fieldErrors?: Partial<Record<keyof RegisterRequest, string>>;
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

  async register(input: RegisterRequest): Promise<AuthSubmitResult> {
    try {
      const session = await authService.register(input);

      authActions.authSuccess(session);
      return {
        status: 'authenticated',
      };
    } catch (error) {
      const result: AuthSubmitFailureResult = mapAuthSubmitError(
        error,
        tDefault(
          'auth.errors.registerFailed',
          'Could not create this account.',
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
  if (hasApiErrorCode(error, 'USER_ALREADY_EXISTS')) {
    return {
      status: 'failed',
      message: tDefault(
        'auth.errors.accountExists',
        'An account with this email already exists.',
      ),
      fieldErrors: {
        email: tDefault(
          'auth.errors.emailRegistered',
          'This email is already registered.',
        ),
      },
    };
  }

  if (hasApiErrorCode(error, 'INVALID_CREDENTIALS')) {
    return {
      status: 'failed',
      message: tDefault(
        'auth.errors.invalidCredentials',
        'Invalid email or password.',
      ),
    };
  }

  const validationDetails = getValidationDetails(error);

  if (validationDetails.length > 0) {
    return {
      status: 'failed',
      message: tDefault(
        'auth.validation.submitInvalid',
        'Check the highlighted fields and try again.',
      ),
      fieldErrors: Object.fromEntries(
        validationDetails.map((detail) => [detail.path, detail.message]),
      ) as Partial<Record<keyof RegisterRequest, string>>,
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
