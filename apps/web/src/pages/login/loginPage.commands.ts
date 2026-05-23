import { authCommands } from '@/app/global/auth/auth.commands';
import type { AuthUserDto, LoginRequest } from '@/models/auth.types';

type LoginFieldErrors = Partial<Record<keyof LoginRequest, string>>;

export type LoginSubmitResult =
  | {
      status: 'authenticated';
      user: AuthUserDto;
    }
  | {
      status: 'failed';
      message: string;
      fieldErrors?: LoginFieldErrors;
    };

export const loginPageCommands = {
  async submit(values: LoginRequest): Promise<LoginSubmitResult> {
    const result = await authCommands.login(values);

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
