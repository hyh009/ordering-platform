import 'dotenv/config';

import { z } from 'zod';

/**
 * Treats a blank value as absent.
 *
 * `.env` files spell "not configured" as `KEY=`, and `.env.example` ships the AI
 * ordering keys that way. Without this, an empty string is present-but-invalid
 * and env validation throws on boot, so copying the example file would leave the
 * API unable to start.
 */
function optionalEnvString() {
  return z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().min(1).optional(),
  );
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  AUTH_ACCESS_TOKEN_SECRET: z
    .string()
    .min(32, 'AUTH_ACCESS_TOKEN_SECRET must be at least 32 characters'),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(900),
  AUTH_REFRESH_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 30),
  /**
   * Optional. Only the AI ordering runtime needs it, and the key alone never
   * activates that runtime, so a missing key leaves the assistant off instead of
   * stopping the API from serving ordering.
   */
  GEMINI_API_KEY: optionalEnvString(),
  /**
   * Which provider route the assistant runs against. One of the ids in
   * `modules/aiOrdering/runtime/providers.ts`.
   *
   * Left as a plain string here rather than an enum so this low-level config does
   * not depend on a feature module. An id that names no provider leaves the
   * assistant off, exactly as an unknown version id does.
   */
  AI_ORDERING_PROVIDER: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().min(1).default('gemini'),
  ),
  /**
   * The model the assistant runs against. A provider and a model are one choice,
   * so these two move together.
   *
   * Both are separate from the prompt version on purpose: replaying an older
   * prompt against a newer model is the whole point of versioning the prompt, so
   * the version must not pin either of them.
   */
  AI_ORDERING_MODEL: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().min(1).default('gemini-3.5-flash-lite'),
  ),
  /**
   * Which released assistant version serves guest traffic. Unset means the
   * assistant is off. Routing guests to a metered provider has to be a
   * deliberate deployment decision, never an implicit consequence of an API key
   * sitting in the environment.
   */
  AI_ORDERING_VERSION_ID: optionalEnvString(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const message = parsedEnv.error.issues
    .map((issue) => {
      const path = issue.path.join('.') || 'env';
      return `${path}: ${issue.message}`;
    })
    .join('; ');

  throw new Error(`Invalid environment variables: ${message}`);
}

export const env = parsedEnv.data;
