import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { toGeminiToolSchema } from '../src/modules/aiOrdering/runtime/geminiSchema.js';
import { aiOrderingToolDefinitions } from '../src/modules/aiOrdering/tools.js';

/** Every key appearing anywhere in a JSON Schema document. */
function collectKeys(node: unknown, found: Set<string> = new Set()): Set<string> {
  if (Array.isArray(node)) {
    for (const item of node) collectKeys(item, found);
    return found;
  }

  if (typeof node !== 'object' || node === null) {
    return found;
  }

  for (const [key, value] of Object.entries(node)) {
    found.add(key);
    collectKeys(value, found);
  }

  return found;
}

describe('Gemini tool schema translation', () => {
  it('rewrites a literal as a single-member enum', () => {
    expect(
      toGeminiToolSchema(z.object({ type: z.literal('add_item') })),
    ).toMatchObject({
      properties: { type: { type: 'string', enum: ['add_item'] } },
    });
  });

  it('rewrites a literal nested inside an array of unions', () => {
    const schema = z.object({
      operations: z.array(
        z.discriminatedUnion('type', [
          z.object({ type: z.literal('add_item'), summary: z.string() }),
          z.object({ type: z.literal('remove_own_item'), itemId: z.string() }),
        ]),
      ),
    });

    // This is the exact shape the provider rejected: a tool argument whose array
    // items are a union discriminated by a literal.
    expect(collectKeys(toGeminiToolSchema(schema))).not.toContain('const');
  });

  it('drops the schema-document keywords the endpoint does not accept', () => {
    const converted = toGeminiToolSchema(z.object({ reply: z.string() }));

    expect(converted).not.toHaveProperty('$schema');
  });

  it('leaves an explicit multi-value enum alone', () => {
    expect(
      toGeminiToolSchema(z.object({ reason: z.enum(['a', 'b']) })),
    ).toMatchObject({ properties: { reason: { enum: ['a', 'b'] } } });
  });

  it('keeps the constraints that carry meaning', () => {
    const converted = toGeminiToolSchema(
      z.object({ reply: z.string().min(1).max(1000) }),
    );

    // The rewrite is about dialect, not about relaxing what the model may send.
    expect(converted).toMatchObject({
      properties: { reply: { minLength: 1, maxLength: 1000 } },
      required: ['reply'],
    });
  });

  it('states a union on the documented anyOf field, not oneOf', () => {
    const converted = toGeminiToolSchema(
      z.object({
        operation: z.discriminatedUnion('type', [
          z.object({ type: z.literal('add_item'), summary: z.string() }),
          z.object({ type: z.literal('remove_own_item'), itemId: z.string() }),
        ]),
      }),
    );

    const keys = collectKeys(converted);

    expect(keys).toContain('anyOf');
    expect(keys).not.toContain('oneOf');
  });

  it('expresses a nullable field as nullable rather than a null branch', () => {
    const converted = toGeminiToolSchema(
      z.object({ notes: z.string().min(1).nullable() }),
    );

    // The subset's type list has no NULL, so a `{type:'null'}` branch is a 400
    // waiting to happen.
    expect(converted).toMatchObject({
      properties: { notes: { type: 'string', minLength: 1, nullable: true } },
    });
    expect(collectKeys(converted)).not.toContain('anyOf');
  });

  it('keeps a real union nullable without flattening it', () => {
    const converted = toGeminiToolSchema(
      z.object({ value: z.union([z.string(), z.number()]).nullable() }),
    );

    expect(converted).toMatchObject({
      properties: { value: { nullable: true } },
    });
    expect(
      (converted.properties as { value: { anyOf: unknown[] } }).value.anyOf,
    ).toHaveLength(2);
  });

  it('no bound tool schema names a null type', () => {
    for (const definition of aiOrderingToolDefinitions) {
      const converted = toGeminiToolSchema(definition.schema);

      expect(
        JSON.stringify(converted),
        `tool ${definition.name} must not name a null type`,
      ).not.toContain('"null"');
    }
  });

  it('no bound tool schema carries a const', () => {
    // The guard for the 400 that only appears against a real provider: the unit
    // tests all stub the model, so without this the next literal added to a tool
    // argument schema would ship.
    for (const definition of aiOrderingToolDefinitions) {
      expect(
        collectKeys(toGeminiToolSchema(definition.schema)),
        `tool ${definition.name} must not emit const`,
      ).not.toContain('const');
    }
  });
});
