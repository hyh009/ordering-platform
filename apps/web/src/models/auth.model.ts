import type { AuthSession, AuthSuccessResponse } from './auth.types';

export const authModel = {
  deserializeSession(response: AuthSuccessResponse): AuthSession {
    return {
      accessToken: response.data.accessToken,
      user: response.data.user,
    };
  },
};
