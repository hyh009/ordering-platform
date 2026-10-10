import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { env } from '@src/config/env';
import { logger } from '@src/utils/logger';
import { MongoClient } from 'mongodb';

/**
 * How long a proposal stays answerable.
 *
 * This is the proposal's lifetime, not a storage detail. A guest who walks away
 * mid-conversation should not come back the next day and apply a proposal built
 * from a menu and a cart that have both moved on, and a paused run nobody
 * resumes would otherwise be kept forever.
 */
export const AI_ORDERING_CHECKPOINT_TTL_SECONDS = 24 * 60 * 60;

/**
 * The paused-run store.
 *
 * Deliberately not a repository and not a Mongoose model. Its documents are
 * `@langchain/langgraph`'s own checkpoint format, so a hand-written schema here
 * would be a second, driftable definition of a shape that is not ours to keep
 * stable. Nothing outside the resume path reads it, and nothing a guest or a
 * merchant sees comes out of it — the conversation collection remains the
 * record. Dropping this collection expires pending proposals and loses nothing
 * else.
 *
 * It gets its own client rather than borrowing Mongoose's: the saver depends on
 * the v6 MongoDB driver and Mongoose 9 ships v7, so sharing one would mean
 * passing a client across a driver major on a type assertion. A second pool to
 * the same database is the cheaper risk, and it is only ever opened when the
 * assistant is enabled.
 */
let client: MongoClient | null = null;
let saver: MongoDBSaver | null = null;
let ready: Promise<MongoDBSaver> | null = null;

async function createCheckpointer(): Promise<MongoDBSaver> {
  client = new MongoClient(env.MONGODB_URI);
  await client.connect();

  saver = new MongoDBSaver({
    client,
    checkpointCollectionName: 'aiOrderingCheckpoints',
    checkpointWritesCollectionName: 'aiOrderingCheckpointWrites',
    // `setup()` turns this into the TTL indexes. Expiry is by inactivity, which
    // is what a proposal's lifetime means: the clock starts when the run pauses.
    ttl: AI_ORDERING_CHECKPOINT_TTL_SECONDS,
  });

  // Index creation, so it runs once per process rather than once per turn. It
  // reports failures instead of throwing, and a missing TTL index must not take
  // the assistant down with it: the proposals still work, they just outlive
  // their welcome until the index lands.
  const errors = await saver.setup();

  if (errors.length > 0) {
    logger.warn(
      { errors: errors.map((error) => error.message) },
      'AI ordering checkpoint index setup reported errors; pending proposals may not expire',
    );
  }

  return saver;
}

export async function getAiOrderingCheckpointer(): Promise<MongoDBSaver> {
  ready ??= createCheckpointer();

  return ready;
}

export async function closeAiOrderingCheckpointer(): Promise<void> {
  const open = client;

  client = null;
  saver = null;
  ready = null;

  await open?.close();
}
