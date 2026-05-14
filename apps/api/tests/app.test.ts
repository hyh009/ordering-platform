import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';

describe('app', () => {
  it('returns health status', async () => {
    const app = createApp();

    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns a 404 error response for unknown routes', async () => {
    const app = createApp();

    const response = await request(app).get('/api/v1/missing-route');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 404,
      code: 'NOT_FOUND',
      message: "Can't find /api/v1/missing-route on this server!",
    });
  });

  it('returns a request id response header', async () => {
    const app = createApp();

    const response = await request(app).get('/api/v1/health');

    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('reuses a safe incoming request id', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/v1/health')
      .set('x-request-id', 'request-123');

    expect(response.headers['x-request-id']).toBe('request-123');
  });
});
