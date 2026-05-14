import { env } from '@src/config/env';
import { authService } from '@src/services/auth.service';
import passport from 'passport';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';

import type { AccessTokenPayload } from '@src/services/auth.service';

function isAccessTokenPayload(payload: unknown): payload is AccessTokenPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const candidate = payload as Partial<AccessTokenPayload>;

  return (
    typeof candidate.sub === 'string' &&
    candidate.type === 'access' &&
    typeof candidate.tokenVersion === 'number' &&
    Array.isArray(candidate.roles)
  );
}

passport.use(
  'local',
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const user = await authService.validateCredentials(email, password);

        done(null, user);
      } catch (error) {
        done(error);
      }
    },
  ),
);

passport.use(
  'jwt',
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.AUTH_ACCESS_TOKEN_SECRET,
    },
    async (payload: unknown, done) => {
      try {
        if (!isAccessTokenPayload(payload)) {
          done(null, false);
          return;
        }

        const user = await authService.findAuthenticatedUser(payload);

        done(null, user ?? false);
      } catch (error) {
        done(error, false);
      }
    },
  ),
);

export { passport };
