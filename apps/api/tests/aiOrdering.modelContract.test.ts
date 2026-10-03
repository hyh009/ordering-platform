import {
  cartItemInputSchema,
  updateCartItemSchema,
} from '@repo/shared';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { AI_ORDERING_MENU_FIXTURE } from './fixtures/aiOrdering.js';
import { aiOrderingModelArgumentSchemas } from '../src/modules/aiOrdering/modelResponse.js';
import { toGeminiToolSchema } from '../src/modules/aiOrdering/runtime/geminiSchema.js';
import { aiOrderingToolDefinitions } from '../src/modules/aiOrdering/tools.js';

type JsonSchema = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
};

/** Every property in a generated schema, as `a.b.c` paths. */
function describedPaths(
  schema: JsonSchema,
  prefix = '',
): { path: string; described: boolean }[] {
  const found: { path: string; described: boolean }[] = [];

  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    const path = prefix ? `${prefix}.${name}` : name;

    found.push({ path, described: typeof property.description === 'string' });
    found.push(...describedPaths(property, path));
  }

  if (schema.items) {
    found.push(...describedPaths(schema.items, `${prefix}[]`));
  }

  for (const [index, branch] of (schema.anyOf ?? []).entries()) {
    found.push(...describedPaths(branch, `${prefix}|${String(index)}`));
  }

  return found;
}

function toolSchema(name: string): JsonSchema {
  const definition = aiOrderingToolDefinitions.find(
    (candidate) => candidate.name === name,
  );

  if (!definition) throw new Error(`no tool named ${name}`);

  return toGeminiToolSchema(definition.schema) as JsonSchema;
}

describe('AI ordering model contract documentation', () => {
  it.each(aiOrderingToolDefinitions.map((definition) => definition.name))(
    'describes every field it offers the model in %s',
    (name) => {
      const undescribed = describedPaths(toolSchema(name))
        .filter((entry) => !entry.described)
        .map((entry) => entry.path);

      // A new field must be documented rather than merely added. The model has
      // nothing else to go on: it was handed `summary` and `item.notes` with no
      // statement of what either was for, and wrote an ordering instruction into
      // the one that is never executed.
      expect(undescribed).toEqual([]);
    },
  );

  it('states that omitting a field leaves that part of the item alone', () => {
    const quantity =
      toolSchema('propose_cart_operations').properties?.operations?.items
        ?.anyOf?.[1]?.properties?.item?.properties?.quantity?.description ?? '';

    expect(quantity.toLowerCase()).toContain('omit');
  });

  it('states that clearing a note is not the same as omitting it', () => {
    const notes =
      toolSchema('propose_cart_operations').properties?.operations?.items
        ?.anyOf?.[1]?.properties?.item?.properties?.notes?.description ?? '';

    // Opposite meanings on one field. Nothing else in the contract could tell
    // the model that `null` erases and absence preserves.
    expect(notes.toLowerCase()).toContain('omit');
    expect(notes.toLowerCase()).toContain('null');
  });

  it('keeps model-facing wording out of the shared cart contract', () => {
    // These are the guest cart API's own request contracts. Prose written to
    // steer a language model would be read there by the wrong audience.
    const shared = JSON.stringify([
      z.toJSONSchema(cartItemInputSchema, { io: 'input' }),
      z.toJSONSchema(updateCartItemSchema, { io: 'input' }),
    ]);

    expect(shared).not.toContain('description');
  });

  it('carries descriptions through the provider rewrite', () => {
    // The OpenAPI subset documents `description`, but the rewrite is ours and
    // nothing else pins that it survives.
    const rewritten = toGeminiToolSchema(
      z.object({ field: z.string().describe('a described field') }),
    ) as JsonSchema;

    expect(rewritten.properties?.field?.description).toBe('a described field');
  });
});

describe('AI ordering proposal labels', () => {
  it('does not let the model author the label', () => {
    const parsed = aiOrderingModelArgumentSchemas.proposal.parse({
      reply: 'ok',
      operations: [
        {
          type: 'add_item',
          summary: 'a label the model wrote',
          item: { productId: 'prod-rice', quantity: 1 },
        },
      ],
    });

    expect(Object.keys(parsed.operations[0] as object).sort()).toEqual([
      'item',
      'type',
    ]);
  });

  it('offers the model only products that exist in the fixture menu', () => {
    // Guards the fixture the label tests read from, so a menu change cannot make
    // those assertions silently meaningless.
    const ids = AI_ORDERING_MENU_FIXTURE.groups.flatMap((group) =>
      group.products.map((product) => product.id),
    );

    expect(ids).toContain('prod-rice');
  });
});
