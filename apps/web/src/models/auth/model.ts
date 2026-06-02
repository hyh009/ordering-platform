import type { AuthSession, AuthSuccessResponse } from './types';

export const authModel = {
  deserializeSession(response: AuthSuccessResponse): AuthSession {
    return {
      accessToken: response.data.accessToken,
      user: response.data.user,
    };
  },
};
