import { aiOrderingModelResponseSchema } from '@src/modules/aiOrdering/modelResponse';
import {
  readAiOrderingModelReply,
  readAiOrderingToolAnswer,
} from '@src/modules/aiOrdering/tools';

import type { AiOrderingModelResponse } from '@src/modules/aiOrdering/modelResponse';
import type { AiOrderingVersionConfig } from '@src/modules/aiOrdering/types';

export type AiOrderingGateRejectionCode =
  | 'schema_invalid'
  | 'reply_too_long'
  | 'too_many_operations'
  /** Bound tools are not enforced the way a response schema was. */
  | 'no_tool_call'
  | 'ambiguous_tool_call';

export type AiOrderingGateRejection = {
  code: AiOrderingGateRejectionCode;
  detail: string;
};

export type AiOrderingGateResult =
  | { ok: true; modelResponse: AiOrderingModelResponse }
  | { ok: false; rejection: AiOrderingGateRejection };

/**
 * Gives a question that came without a `reply` its own question as the reply.
 *
 * The model often leaves `reply` out when asking, since the question already is
 * what it wants to say. Refusing that cost a whole extra model call for a field
 * whose content was sitting in the next one.
 */
function withQuestionAsReply(candidate: unknown): unknown {
  const { type, reply, question } = (candidate ?? {}) as {
    type?: unknown;
    reply?: unknown;
    question?: unknown;
  };
  const hasReply = typeof reply === 'string' && reply.trim().length > 0;

  if (type !== 'choices' || hasReply || typeof question !== 'string') {
    return candidate;
  }

  return { ...(candidate as object), reply: question };
}

/**
 * Drops a `notes` of `null` or blank from every item being ADDED.
 *
 * On an update `null` means "erase the note", and the model carries that habit
 * over to additions, where there is no note to erase and the only possible
 * meaning is "none". Refusing it cost a whole extra model call to be told
 * something the gate could read for itself. An update's `notes` is left exactly
 * as sent: there `null` is an instruction.
 */
function withoutEmptyAddNotes(candidate: unknown): unknown {
  const { operations } = (candidate ?? {}) as { operations?: unknown };

  if (!Array.isArray(operations)) {
    return candidate;
  }

  return {
    ...(candidate as object),
    operations: (operations as unknown[]).map((operation) => {
      const { type, item } = (operation ?? {}) as {
        type?: unknown;
        item?: unknown;
      };

      if (type !== 'add_item' || typeof item !== 'object' || item === null) {
        return operation;
      }

      const { notes, ...rest } = item as { notes?: unknown };
      const isEmpty =
        notes === null || (typeof notes === 'string' && notes.trim() === '');

      return isEmpty ? { ...(operation as object), item: rest } : operation;
    }),
  };
}

/**
 * The boundary between untrusted model output and everything else.
 *
 * Synchronous and pure: shape only, no menu or cart access. Checking a proposed
 * operation against real data is a separate stage (`validation.ts`) because it
 * needs data this one deliberately does not take, and keeping them apart is what
 * lets this gate stay trivially testable against hand-written hostile output.
 *
 * It also owns the tool-name-to-response-type mapping. A model that called no
 * tool, or two at once, is a shape problem like malformed arguments are, so it
 * belongs in the same rejection set and earns the same repair attempts.
 *
 * Treat the input as hostile. It arrived from a language model.
 */
export function inspectAiOrderingModelOutput(
  output: unknown,
  config: AiOrderingVersionConfig,
): AiOrderingGateResult {
  const reply = readAiOrderingModelReply(output);

  if (!reply) {
    return {
      ok: false,
      rejection: {
        code: 'schema_invalid',
        detail: 'provider output was not a model reply',
      },
    };
  }

  const answer = readAiOrderingToolAnswer(reply);

  if (!answer.ok) {
    return {
      ok: false,
      rejection: { code: answer.code, detail: answer.detail },
    };
  }

  // The tool name supplied `type`, so the answer goes through the same union the
  // arguments were narrowed from — one set of rules, stated once.
  const parsed = aiOrderingModelResponseSchema.safeParse(
    withQuestionAsReply(withoutEmptyAddNotes(answer.candidate)),
  );

  if (!parsed.success) {
    return {
      ok: false,
      rejection: {
        code: 'schema_invalid',
        detail: parsed.error.issues
          .map(
            (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
          )
          .join('; '),
      },
    };
  }

  const modelResponse = parsed.data;

  // Length and count caps live here rather than in the schema so one version can
  // tighten them without forking the schema, and so the rejection says which cap
  // was hit instead of surfacing a generic schema error.
  if (modelResponse.reply.length > config.maxReplyCharacters) {
    return {
      ok: false,
      rejection: {
        code: 'reply_too_long',
        detail: `reply is ${modelResponse.reply.length} characters, over the ${config.maxReplyCharacters} allowed`,
      },
    };
  }

  if (
    modelResponse.type === 'proposal' &&
    modelResponse.operations.length > config.maxOperationsPerProposal
  ) {
    return {
      ok: false,
      rejection: {
        code: 'too_many_operations',
        detail: `${modelResponse.operations.length} operations, over the ${config.maxOperationsPerProposal} allowed`,
      },
    };
  }

  return { ok: true, modelResponse };
}
