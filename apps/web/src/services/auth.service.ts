import { apiJson } from '@/api';
import { authPaths } from '@/api/paths/auth.paths';
import { authModel } from '@/models/auth.model';
import type {
  AuthActionSuccessResponse,
  AuthSession,
  AuthSuccessResponse,
  AuthUserSuccessResponse,
  LoginRequest,
  RegisterRequest,
} from '@/models/auth.types';

export const authService = {
  async login(input: LoginRequest): Promise<AuthSession> {
    const response = await apiJson<AuthSuccessResponse>(authPaths.login, {
      body: JSON.stringify(input),
      method: 'POST',
    });

    return authModel.deserializeSession(response);
  },

  async register(input: RegisterRequest): Promise<AuthSession> {
    const response = await apiJson<AuthSuccessResponse>(authPaths.register, {
      body: JSON.stringify(input),
      method: 'POST',
    });

    return authModel.deserializeSession(response);
  },

  async refresh(): Promise<AuthSession> {
    const response = await apiJson<AuthSuccessResponse>(authPaths.refresh, {
      method: 'POST',
    });

    return authModel.deserializeSession(response);
  },

  async me() {
    const response = await apiJson<AuthUserSuccessResponse>(authPaths.me);

    return response.data.user;
  },

  async logout() {
    const response = await apiJson<AuthActionSuccessResponse>(
      authPaths.logout,
      {
        method: 'POST',
      },
    );

    return response.data;
  },
};
