import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { guestTokenService } from '../src/services/guestToken.service.js';

const CHAT_PATH = '/api/v1/public/guest/ai-ordering/chat';
const DECISION_PATH = '/api/v1/public/guest/ai-ordering/proposals/decision';
const CONVERSATION_PATH = '/api/v1/public/guest/ai-ordering/conversation';

const guestToken = guestTokenService.signGuestToken({
  storeId: 'store-ai-eval',
  cartId: 'cart-ai-eval',
  participantId: 'participant-self',
});

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('POST /v1/public/guest/ai-ordering/chat', () => {
  it('rejects a request with no guest token', async () => {
    const response = await request(createApp())
      .post(CHAT_PATH)
      .send({ message: '介紹一下珍珠奶茶' });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_GUEST_TOKEN');
  });

  it('rejects a request with an invalid guest token', async () => {
    const response = await request(createApp())
      .post(CHAT_PATH)
      .set(auth('not-a-real-token'))
      .send({ message: '介紹一下珍珠奶茶' });

    expect(response.status).toBe(401);
  });

  it('rejects an empty message', async () => {
    const response = await request(createApp())
      .post(CHAT_PATH)
      .set(auth(guestToken))
      .send({ message: '   ' });

    expect(response.status).toBe(400);
  });

  it('rejects a message over the length limit', async () => {
    const response = await request(createApp())
      .post(CHAT_PATH)
      .set(auth(guestToken))
      .send({ message: 'a'.repeat(1001) });

    expect(response.status).toBe(400);
  });

  it('rejects a decision that names no proposal', async () => {
    const response = await request(createApp())
      .post(DECISION_PATH)
      .set(auth(guestToken))
      .send({ keptOperationIds: ['op-1'] });

    expect(response.status).toBe(400);
  });

  it('rejects a decision carrying operation content instead of ids', async () => {
    const response = await request(createApp())
      .post(DECISION_PATH)
      .set(auth(guestToken))
      .send({ proposalId: 'proposal-1', keptOperationIds: [{ id: 'op-1' }] });

    // Ids only. What executes is rebuilt from the proposal the backend
    // recorded, so operation content from a caller has nowhere to go.
    expect(response.status).toBe(400);
  });

  it('is published in the generated OpenAPI document', async () => {
    const response = await request(createApp()).get('/docs.json');

    // Asserting the generated spec rather than trusting the JSDoc glob to have
    // matched the new file.
    expect(response.status).toBe(200);
    expect(
      response.body.paths?.['/v1/public/guest/ai-ordering/chat']?.post,
    ).toBeDefined();
  });

  it('wraps every response in the standard envelope', async () => {
    const response = await request(createApp())
      .post(CHAT_PATH)
      .send({ message: '介紹一下珍珠奶茶' });

    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 401,
    });
  });
});

describe('GET /v1/public/guest/ai-ordering/conversation', () => {
  it('rejects a request with no guest token', async () => {
    const response = await request(createApp()).get(CONVERSATION_PATH);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_GUEST_TOKEN');
  });

  it('rejects a request with an invalid guest token', async () => {
    const response = await request(createApp())
      .get(CONVERSATION_PATH)
      .set(auth('not-a-real-token'));

    expect(response.status).toBe(401);
  });

  it('is published in the generated OpenAPI document', async () => {
    const response = await request(createApp()).get('/docs.json');

    expect(response.status).toBe(200);
    expect(
      response.body.paths?.['/v1/public/guest/ai-ordering/conversation']?.get,
    ).toBeDefined();
  });
});
