import 'dotenv/config';

import { connectMongo } from '@src/config/db';
import { env } from '@src/config/env';
import { AiOrderingConversationMongoModel } from '@src/models/aiOrdering/mongo';
import { AI_ORDERING_REGRESSION_CASES } from '@src/modules/aiOrdering/evaluation/regressionCases';
import {
  compareAiOrderingReplayRuns,
  replayAiOrderingVersion,
} from '@src/modules/aiOrdering/evaluation/replay';
import { resolveAiOrderingProvider } from '@src/modules/aiOrdering/runtime/providers';
import {
  listAiOrderingVersionIds,
  resolveAiOrderingVersion,
} from '@src/modules/aiOrdering/versions/index';
import mongoose from 'mongoose';

import type { AiOrderingConversationEntity } from '@src/models/aiOrdering/model';
import type { AiOrderingRegressionCase } from '@src/modules/aiOrdering/evaluation/regressionCases';
import type {
  AiOrderingReplayCase,
  AiOrderingReplayRun,
} from '@src/modules/aiOrdering/evaluation/replay';

/**
 * Replays stored guest messages against one or more prompt versions.
 *
 *   pnpm --filter api replay -- --versions v1-2026-09-30,v2-... --store store-1
 *   pnpm --filter api replay -- --versions v1-2026-09-30 --messages "我不能吃蔥"
 *
 *   pnpm --filter api replay -- --versions v1-2026-09-30 --suite regression
 *
 * `--suite regression` replays the fixed set in `evaluation/regressionCases.ts`
 * and marks each answer PASS or FAIL. Run it before and after a prompt edit.
 * Add `--match 紅茶` to replay only the cases whose message contains that.
 *
 * Reads the corpus, never writes to it. The menu and cart come from the frozen
 * fixture, so the only thing moving between two runs is the version.
 */

type Args = {
  versions: string[];
  storeId?: string;
  limit: number;
  messages: string[];
  model?: string;
  suite?: string;
  /** With `--suite`: only the cases whose message contains this. */
  match?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { versions: [], limit: 20, messages: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (flag === '--versions' && value) {
      args.versions = value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      index += 1;
    } else if (flag === '--store' && value) {
      args.storeId = value;
      index += 1;
    } else if (flag === '--limit' && value) {
      args.limit = Number.parseInt(value, 10);
      index += 1;
    } else if (flag === '--messages' && value) {
      args.messages = value
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean);
      index += 1;
    } else if (flag === '--match' && value) {
      args.match = value;
      index += 1;
    } else if (flag === '--suite' && value) {
      args.suite = value;
      index += 1;
    } else if (flag === '--model' && value) {
      args.model = value;
      index += 1;
    }
  }

  return args;
}

/** Guest messages only. What the assistant replied is what replay is re-deciding. */
async function loadCasesFromCorpus(
  storeId: string,
  limit: number,
): Promise<AiOrderingReplayCase[]> {
  const conversations = await AiOrderingConversationMongoModel.find({ storeId })
    .sort({ createdAt: -1 })
    .lean<AiOrderingConversationEntity[]>()
    .exec();

  const cases: AiOrderingReplayCase[] = [];

  for (const conversation of conversations) {
    for (const turn of conversation.turns) {
      if (cases.length >= limit) return cases;

      cases.push({
        message: turn.message,
        source: { conversationId: conversation.id, turnId: turn.id },
      });
    }
  }

  return cases;
}

function printRun(
  run: AiOrderingReplayRun,
  regressionCases: AiOrderingRegressionCase[],
) {
  console.log(
    `\n### ${run.versionId}  [${run.versionFingerprint}]  ${run.provider}/${run.modelName}`,
  );

  // Empty unless a suite was asked for: an ad-hoc message has no known right
  // answer, so it is printed without a verdict.
  const regressionByMessage = new Map(
    regressionCases.map((regressionCase) => [
      regressionCase.message,
      regressionCase,
    ]),
  );
  let checked = 0;
  let passed = 0;

  for (const outcome of run.outcomes) {
    const flags = [
      outcome.repairAttempted ? 'repaired' : null,
      outcome.droppedOperationCount > 0
        ? `dropped:${String(outcome.droppedOperationCount)}`
        : null,
      outcome.ownershipViolationCount > 0
        ? `ownership:${String(outcome.ownershipViolationCount)}`
        : null,
    ].filter(Boolean);

    const expected = regressionByMessage.get(outcome.message);
    const verdict = expected
      ? expected.check(outcome)
        ? 'PASS  '
        : 'FAIL  '
      : '';

    if (expected) {
      checked += 1;
      passed += verdict.startsWith('PASS') ? 1 : 0;
    }

    console.log(
      `  ${verdict}${outcome.responseType ?? 'FAILED'}${flags.length > 0 ? ` (${flags.join(', ')})` : ''}  <- ${outcome.message}`,
    );

    if (expected && verdict.startsWith('FAIL')) {
      console.log(`      expected: ${expected.expects}`);
    }

    if (outcome.failure) console.log(`      failure: ${outcome.failure}`);
    if (outcome.reply) console.log(`      reply: ${outcome.reply}`);

    for (const asked of outcome.asked ?? []) {
      console.log(
        `      asked: ${asked.question} [${asked.optionLabels.join(' / ')}]`,
      );
    }

    if (outcome.shown) {
      console.log(
        `      shown: ${String(outcome.shown.productIds.length)} products${
          outcome.shown.categoryId !== undefined
            ? ` from ${outcome.shown.categoryId}`
            : ''
        }`,
      );
    }

    for (const summary of outcome.operationSummaries) {
      console.log(`      op: ${summary}`);
    }
  }

  if (checked > 0) {
    console.log(`\n  ${String(passed)} of ${String(checked)} passed`);
  }
}

function printComparison(runs: AiOrderingReplayRun[]) {
  const rows = compareAiOrderingReplayRuns(runs);
  const differing = rows.filter((row) => row.responseTypesDiffer);

  console.log(
    `\n### Comparison: ${String(differing.length)} of ${String(rows.length)} messages answered with a different KIND of response`,
  );

  for (const row of differing) {
    console.log(`\n  ${row.message}`);
    row.outcomes.forEach((outcome, index) => {
      const run = runs[index];
      console.log(
        `    ${run?.versionId ?? '?'}: ${outcome?.responseType ?? 'FAILED'}${outcome?.reply ? ` — ${outcome.reply}` : ''}`,
      );
    });
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (args.versions.length === 0) {
    console.error(
      `--versions is required. Known: ${listAiOrderingVersionIds().join(', ')}`,
    );
    process.exitCode = 1;
    return;
  }

  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error(
      'No provider credential configured; replay needs a real model.',
    );
    process.exitCode = 1;
    return;
  }

  const provider = resolveAiOrderingProvider(env.AI_ORDERING_PROVIDER);

  if (!provider) {
    console.error(`Unknown provider: ${String(env.AI_ORDERING_PROVIDER)}`);
    process.exitCode = 1;
    return;
  }

  const modelName = args.model ?? env.AI_ORDERING_MODEL;

  if (args.suite !== undefined && args.suite !== 'regression') {
    console.error(
      `Unknown suite: ${args.suite}. The only suite is "regression".`,
    );
    process.exitCode = 1;
    return;
  }

  const regressionCases =
    args.suite === 'regression'
      ? AI_ORDERING_REGRESSION_CASES.filter(
          (regressionCase) =>
            args.match === undefined ||
            regressionCase.message.includes(args.match),
        )
      : [];

  let cases: AiOrderingReplayCase[] =
    regressionCases.length > 0
      ? regressionCases
      : args.messages.map((message) => ({ message }));

  if (cases.length === 0) {
    if (!args.storeId) {
      console.error('Pass --messages, or --store to replay the stored corpus.');
      process.exitCode = 1;
      return;
    }

    await connectMongo();
    cases = await loadCasesFromCorpus(args.storeId, args.limit);
  }

  if (cases.length === 0) {
    console.error('No messages to replay.');
    process.exitCode = 1;
    return;
  }

  console.log(`Replaying ${String(cases.length)} message(s) on ${modelName}`);

  const runs: AiOrderingReplayRun[] = [];

  for (const versionId of args.versions) {
    const config = resolveAiOrderingVersion(versionId);

    if (!config) {
      console.error(`Unknown version: ${versionId}`);
      process.exitCode = 1;
      continue;
    }

    const replayRun = await replayAiOrderingVersion({
      config,
      provider: provider.id,
      modelName,
      cases,
      // The production model and the production tool dialect. Replay drives the
      // same agent; only the resume never comes.
      //
      // `temperature` comes from the version config, like production's does.
      // It used to be pinned to 0 here, which made the suite reproducible and
      // simultaneously made it a measurement of a configuration nobody served.
      // Whatever the version says, both sides get.
      createChatModel: () =>
        provider.adapter.createChatModel({
          apiKey,
          model: modelName,
          temperature: config.temperature,
        }),
      toToolSchema: (schema) => provider.adapter.toToolSchema(schema),
    });

    runs.push(replayRun);
    printRun(replayRun, regressionCases);
  }

  if (runs.length > 1) {
    printComparison(runs);
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}

void run();
