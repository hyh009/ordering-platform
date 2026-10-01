/**
 * The Gemini half of the runtime: constructing the chat model, and nothing else.
 *
 * Everything that is true of any provider — the session, usage accounting, the
 * per-call timeout clamp — lives in `model.ts`. Keep this file to construction so
 * that comparing providers stays a matter of adding one beside it.
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { toGeminiToolSchema } from '@src/modules/aiOrdering/runtime/geminiSchema';
import { extractText } from '@src/modules/aiOrdering/runtime/model';
import { aiOrderingToolDefinitions } from '@src/modules/aiOrdering/tools';

import type {
  AiOrderingTextModel,
  AiOrderingToolCallingModel,
} from '@src/modules/aiOrdering/runtime/model';

function createChat(input: { apiKey: string; model: string }) {
  return new ChatGoogleGenerativeAI({
    apiKey: input.apiKey,
    model: input.model,
  });
}

/**
 * A plain-text Gemini model, with NO tools bound.
 *
 * Leaving the tools off is a capability restriction, not a typing detail: a model
 * that can call `propose_cart_operations` while it is supposed to be writing a
 * summary will eventually do it.
 */
export function createGeminiTextModel(input: {
  apiKey: string;
  model: string;
}): AiOrderingTextModel {
  const chat = createChat(input);

  return {
    async invoke(messages, options) {
      const result = await chat.invoke(messages, options);

      return { content: result.content };
    },
  };
}

/**
 * Builds the real Gemini-backed model, with the assistant's tools bound.
 *
 * All provider access goes through LangChain rather than the Google SDK, so a
 * later version can compare providers without rewriting this module. Only the
 * binding is LangChain's; the turn loop is ours (design decision 14).
 *
 * The whole provider message is passed on as `raw` because it carries
 * `usage_metadata`, and the cache-read count is the only evidence that the prompt
 * ordering is working.
 */
export function createGeminiToolCallingModel(input: {
  apiKey: string;
  model: string;
}): AiOrderingToolCallingModel {
  const bound = createChat(input).bindTools(
    // The schema is converted here rather than handed over as zod: LangChain's
    // own converter emits `const`, which this endpoint rejects. See
    // `geminiSchema.ts`.
    aiOrderingToolDefinitions.map(({ name, description, schema }) => ({
      name,
      description,
      schema: toGeminiToolSchema(schema),
    })),
  );

  return {
    async invoke(messages, options) {
      const result = await bound.invoke(messages, options);

      return {
        toolCalls: (result.tool_calls ?? []).map((call) => ({
          name: call.name,
          args: call.args,
        })),
        text: extractText(result.content),
        raw: result,
      };
    },
  };
}
