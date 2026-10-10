/**
 * The Gemini half of the runtime: constructing the chat model, and nothing else.
 *
 * Everything that is true of any provider — the session, usage accounting, the
 * per-call timeout clamp — lives in `model.ts`. Keep this file to construction so
 * that comparing providers stays a matter of adding one beside it.
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { toGeminiToolSchema } from '@src/modules/aiOrdering/runtime/geminiSchema';

import type { AiOrderingTextModel } from '@src/modules/aiOrdering/runtime/model';

function createChat(input: {
  apiKey: string;
  model: string;
  temperature?: number;
}) {
  return new ChatGoogleGenerativeAI({
    apiKey: input.apiKey,
    model: input.model,
    ...(input.temperature !== undefined
      ? { temperature: input.temperature }
      : {}),
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
  temperature?: number;
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
 * The chat model the agent run drives, with NO tools bound here.
 *
 * `createAgent` binds the tools itself, so binding them twice would be two
 * sources of the same list. What the provider still owns is the DIALECT those
 * schemas have to be written in, which is `toGeminiToolSchema` below.
 */
export function createGeminiChatModel(input: {
  apiKey: string;
  model: string;
  temperature?: number;
}) {
  return createChat(input);
}

/**
 * Gemini's `functionDeclarations[].parameters` is an OpenAPI 3.0 subset, not
 * full JSON Schema. LangChain's own converter emits `const`, which the endpoint
 * rejects — so the conversion stays on the provider side, where a second
 * provider can want something else.
 */
export { toGeminiToolSchema };
