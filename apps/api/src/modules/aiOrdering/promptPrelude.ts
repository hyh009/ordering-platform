import { createHash } from 'node:crypto';

import { aiOrderingToolDefinitions } from '@src/modules/aiOrdering/tools';

import type { AiOrderingPromptPrelude } from '@src/models/aiOrdering/model';
import type { AiOrderingAssembledContext } from '@src/modules/aiOrdering/types';

/**
 * The unchanging opening of a turn's prompt, as one storable record.
 *
 * Built from the same assembled context and the same tool definitions the agent
 * is given, so what is stored is what was sent rather than a second rendering
 * that could drift from it. The tools are written out the way the provider is
 * shown them — name, description, parameter schema in the provider's dialect —
 * because the descriptions inside that schema are prompt text too.
 */
export function buildAiOrderingPromptPrelude(input: {
  context: AiOrderingAssembledContext;
  toToolSchema: (schema: unknown) => Record<string, unknown>;
  now: Date;
}): AiOrderingPromptPrelude {
  const block = (kind: string) =>
    input.context.blocks.find((candidate) => candidate.kind === kind)?.text ??
    '';

  const coreInstructions = block('core_instructions');
  const storeData = block('store_data');
  const tools = JSON.stringify(
    aiOrderingToolDefinitions.map((definition) => ({
      name: definition.name,
      description: definition.description,
      parameters: input.toToolSchema(definition.schema),
    })),
    null,
    2,
  );

  return {
    hash: createHash('sha256')
      .update(coreInstructions)
      .update('\u0000')
      .update(tools)
      .update('\u0000')
      .update(storeData)
      .digest('hex')
      .slice(0, 12),
    coreInstructions,
    tools,
    storeData,
    createdAt: input.now,
  };
}
