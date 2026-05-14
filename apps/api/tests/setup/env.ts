process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.LOG_LEVEL = 'silent';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.AUTH_ACCESS_TOKEN_SECRET =
  'test-access-token-secret-at-least-32-characters';
process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS = '900';
process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS = '2592000';
