import { loginSchema, registerSchema } from '@repo/shared';
import { authConfig, authCookieNames } from '@src/config/auth';
import { passport } from '@src/config/passport';
import { requireAuth } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { authService } from '@src/services/auth.service';
import { Router } from 'express';

import type {
  AuthActionSuccessResponse,
  AuthSuccessResponse,
  AuthUserSuccessResponse,
  LoginRequest,
  RegisterRequest,
} from '@repo/shared';
import type { UserEntity } from '@src/models/user/model';
import type { AuthResult } from '@src/services/auth.service';
import type { CookieOptions, NextFunction, Request, Response } from 'express';

const router = Router();

function createCookieOptions(
  maxAgeSeconds: number,
  path: string,
): CookieOptions {
  return {
    httpOnly: true,
    secure: authConfig.cookies.secure,
    sameSite: authConfig.cookies.sameSite,
    maxAge: maxAgeSeconds * 1000,
    path,
  };
}

function setAuthCookies(res: Response, result: AuthResult) {
  res.cookie(
    authCookieNames.refreshToken,
    result.refreshToken,
    createCookieOptions(
      authConfig.refreshTokenExpiresInSeconds,
      authConfig.cookies.refreshTokenPath,
    ),
  );
}

function clearRefreshCookie(res: Response) {
  const clearOptions = {
    httpOnly: true,
    secure: authConfig.cookies.secure,
    sameSite: authConfig.cookies.sameSite,
  } satisfies CookieOptions;

  res.clearCookie(authCookieNames.refreshToken, {
    ...clearOptions,
    path: authConfig.cookies.refreshTokenPath,
  });
}

function sendAuthResult(
  res: Response<AuthSuccessResponse>,
  result: AuthResult,
  statusCode = 200,
) {
  setAuthCookies(res, result);

  res.status(statusCode).json({
    status: 'success',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
}

/**
 * @openapi
 * components:
 *   schemas:
 *     UserRole:
 *       type: string
 *       enum:
 *         - user
 *         - admin
 *     AuthUser:
 *       type: object
 *       required:
 *         - id
 *         - email
 *         - username
 *         - roles
 *       properties:
 *         id:
 *           type: string
 *           example: user-123
 *         email:
 *           type: string
 *           example: user@example.com
 *         username:
 *           type: string
 *           example: starter-user
 *         roles:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserRole'
 *     AuthSuccessResponse:
 *       type: object
 *       required:
 *         - status
 *         - data
 *       properties:
 *         status:
 *           type: string
 *           enum:
 *             - success
 *           example: success
 *         data:
 *           type: object
 *           required:
 *             - user
 *             - accessToken
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/AuthUser'
 *             accessToken:
 *               type: string
 *               description: JWT access token. Store in frontend memory/state and send with Authorization Bearer.
 *     AuthUserSuccessResponse:
 *       type: object
 *       required:
 *         - status
 *         - data
 *       properties:
 *         status:
 *           type: string
 *           enum:
 *             - success
 *           example: success
 *         data:
 *           type: object
 *           required:
 *             - user
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/AuthUser'
 *     AuthActionSuccessResponse:
 *       type: object
 *       required:
 *         - status
 *         - data
 *       properties:
 *         status:
 *           type: string
 *           enum:
 *             - success
 *           example: success
 *         data:
 *           type: object
 *           required:
 *             - ok
 *           properties:
 *             ok:
 *               type: boolean
 *               example: true
 */

/**
 * @openapi
 * /v1/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a user, return an access token, and issue a refresh cookie
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               username:
 *                 type: string
 *                 example: starter-user
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       201:
 *         description: User registered
 *         headers:
 *           Set-Cookie:
 *             description: HttpOnly refresh_token cookie
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *       409:
 *         description: Email is already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               statusCode: 409
 *               code: USER_ALREADY_EXISTS
 *               message: User already exists
 */
router.post<Record<string, never>, AuthSuccessResponse, RegisterRequest>(
  '/register',
  validate(registerSchema),
  async (req, res) => {
    const result = await authService.register(req.body);

    sendAuthResult(res, result, 201);
  },
);

/**
 * @openapi
 * /v1/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Log in, return an access token, and issue a refresh cookie
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       200:
 *         description: User logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               statusCode: 401
 *               code: INVALID_CREDENTIALS
 *               message: Invalid email or password
 */
router.post(
  '/login',
  validate(loginSchema),
  (
    req: Request<Record<string, never>, AuthSuccessResponse, LoginRequest>,
    res: Response<AuthSuccessResponse>,
    next: NextFunction,
  ) => {
    passport.authenticate(
      'local',
      { session: false },
      async (error: unknown, user: UserEntity | false | null) => {
        try {
          if (error) {
            next(error);
            return;
          }

          if (!user) {
            next(new Error('Passport local strategy did not return a user.'));
            return;
          }

          const result = await authService.login(user);

          sendAuthResult(res, result);
        } catch (authError) {
          next(authError);
        }
      },
    )(req, res, next);
  },
);

/**
 * @openapi
 * /v1/auth/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Rotate refresh token, return a new access token, and issue a new refresh cookie
 *     responses:
 *       200:
 *         description: Access token and refresh cookie refreshed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *       401:
 *         description: Refresh token is missing, invalid, expired, or revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               statusCode: 401
 *               code: INVALID_REFRESH_TOKEN
 *               message: Invalid refresh token
 */
router.post('/refresh', async (req, res) => {
  const result = await authService.refresh(
    req.cookies?.[authCookieNames.refreshToken],
  );

  sendAuthResult(res, result);
});

/**
 * @openapi
 * /v1/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Revoke the current refresh token and clear the refresh cookie
 *     responses:
 *       200:
 *         description: User logged out
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthActionSuccessResponse'
 */
router.post<Record<string, never>, AuthActionSuccessResponse>(
  '/logout',
  async (req, res) => {
    await authService.logout(req.cookies?.[authCookieNames.refreshToken]);
    clearRefreshCookie(res);

    res.json({
      status: 'success',
      data: {
        ok: true,
      },
    });
  },
);

/**
 * @openapi
 * /v1/auth/logout-all:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Revoke all refresh tokens for the authenticated user and clear the refresh cookie
 *     responses:
 *       200:
 *         description: All user sessions revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthActionSuccessResponse'
 *       401:
 *         description: Access token is missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post<Record<string, never>, AuthActionSuccessResponse>(
  '/logout-all',
  requireAuth,
  async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new Error('Authenticated user missing after requireAuth.');
    }

    await authService.logoutAll(user.id);
    clearRefreshCookie(res);

    res.json({
      status: 'success',
      data: {
        ok: true,
      },
    });
  },
);

/**
 * @openapi
 * /v1/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Return the authenticated user
 *     responses:
 *       200:
 *         description: Authenticated user returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthUserSuccessResponse'
 *       401:
 *         description: Access token is missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get<Record<string, never>, AuthUserSuccessResponse>(
  '/me',
  requireAuth,
  (req, res) => {
    const user = req.user;

    if (!user) {
      throw new Error('Authenticated user missing after requireAuth.');
    }

    res.json({
      status: 'success',
      data: {
        user,
      },
    });
  },
);

export default router;
