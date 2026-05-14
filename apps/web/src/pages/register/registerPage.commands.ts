import { authCommands } from '@/app/auth.commands';
import type { RegisterRequest } from '@/models/auth.types';
import type { RegisterFieldErrors } from './useRegisterForm';

export type RegisterSubmitResult =
  | {
      status: 'authenticated';
    }
  | {
      status: 'failed';
      message: string;
      fieldErrors?: RegisterFieldErrors;
    };

export const registerPageCommands = {
  async submit(request: RegisterRequest): Promise<RegisterSubmitResult> {
    const result = await authCommands.register(request);

    if (result.status === 'authenticated') {
      return result;
    }

    return {
      fieldErrors: result.fieldErrors,
      message: result.message,
      status: 'failed',
    };
  },
};
