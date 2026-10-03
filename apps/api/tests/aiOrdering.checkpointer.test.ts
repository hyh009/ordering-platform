import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const saverParams: unknown[] = [];
  const setup = vi.fn(async () => []);
  const connect = vi.fn(async () => undefined);
  const close = vi.fn(async () => undefined);
  const clientUris: string[] = [];

  class FakeSaver {
    constructor(params: unknown) {
      saverParams.push(params);
    }

    setup = setup;
  }

  class FakeClient {
    constructor(uri: string) {
      clientUris.push(uri);
    }

    connect = connect;
    close = close;
  }

  return { saverParams, setup, connect, close, clientUris, FakeSaver, FakeClient };
});

vi.mock('@langchain/langgraph-checkpoint-mongodb', () => ({
  MongoDBSaver: mocks.FakeSaver,
}));

vi.mock('mongodb', () => ({ MongoClient: mocks.FakeClient }));

const {
  AI_ORDERING_CHECKPOINT_TTL_SECONDS,
  closeAiOrderingCheckpointer,
  getAiOrderingCheckpointer,
} = await import('../src/modules/aiOrdering/runtime/checkpointer.js');

describe('AI ordering checkpointer', () => {
  beforeEach(async () => {
    await closeAiOrderingCheckpointer();
    mocks.saverParams.length = 0;
    mocks.clientUris.length = 0;
    mocks.setup.mockClear();
    mocks.close.mockClear();
  });

  it('expires a paused run after the proposal lifetime', async () => {
    await getAiOrderingCheckpointer();

    // The TTL is the proposal's lifetime, not a storage detail. Without it a
    // proposal nobody answers stays applicable forever, against a menu and a
    // cart that have both moved on.
    expect(mocks.saverParams[0]).toMatchObject({
      ttl: AI_ORDERING_CHECKPOINT_TTL_SECONDS,
    });
    expect(AI_ORDERING_CHECKPOINT_TTL_SECONDS).toBe(24 * 60 * 60);
  });

  it('keeps paused runs out of the conversation collection', async () => {
    await getAiOrderingCheckpointer();

    // The conversation is the record and must outlive its cart; the checkpoint
    // is execution state and must not. They cannot share a collection.
    expect(mocks.saverParams[0]).toMatchObject({
      checkpointCollectionName: 'aiOrderingCheckpoints',
      checkpointWritesCollectionName: 'aiOrderingCheckpointWrites',
    });
  });

  it('creates its indexes once per process rather than once per turn', async () => {
    await getAiOrderingCheckpointer();
    await getAiOrderingCheckpointer();
    await getAiOrderingCheckpointer();

    expect(mocks.setup).toHaveBeenCalledTimes(1);
    expect(mocks.clientUris).toHaveLength(1);
  });

  it('closes the client it opened', async () => {
    await getAiOrderingCheckpointer();
    await closeAiOrderingCheckpointer();

    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the assistant never needed a checkpointer', async () => {
    await closeAiOrderingCheckpointer();

    // The pool is opened lazily, so a deployment with the assistant off never
    // pays for a second connection.
    expect(mocks.clientUris).toHaveLength(0);
    expect(mocks.close).not.toHaveBeenCalled();
  });
});
