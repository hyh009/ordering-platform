process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.LOG_LEVEL = 'silent';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.CLOUDINARY_API_KEY = 'test-cloudinary-api-key';
process.env.CLOUDINARY_API_SECRET = 'test-cloudinary-api-secret';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloudinary-cloud-name';
process.env.AUTH_ACCESS_TOKEN_SECRET =
  'test-access-token-secret-at-least-32-characters';
process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS = '900';
process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS = '2592000';

// The AI ordering assistant is pinned OFF for the whole suite.
//
// Blank, not deleted: `config/env.ts` loads `apps/api/.env` through dotenv, and
// dotenv fills in any key that is absent from process.env. Leaving these unset
// would let a developer's own working configuration leak into the test run, so a
// suite that passes on a machine with no key could reach a live provider on a
// machine that has one. Setting them blank is what dotenv will not overwrite,
// and env validation treats blank as absent.
//
// Tests that need the runtime stub the model instead of configuring a provider.
process.env.GEMINI_API_KEY = '';
process.env.GEMINI_MODEL = '';
process.env.AI_ORDERING_VERSION_ID = '';
