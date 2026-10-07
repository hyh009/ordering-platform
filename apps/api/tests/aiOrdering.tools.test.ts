import { describe, expect, it } from 'vitest';

import { aiOrderingToolDefinitions } from '../src/modules/aiOrdering/tools.js';

/**
 * Every field the backend owns, as named in `modelResponse.ts`.
 *
 * A tool argument schema that accepted any of these would hand the model a way
 * to set it, and the narrowed contract exists precisely so that it cannot.
 */
const BACKEND_OWNED_FIELDS = [
  'confirmationRequired',
  'proposalId',
  'promptId',
  'operationId',
  'allowFreeText',
];

describe('AI ordering tool definitions', () => {
  it('binds exactly the four tools that carry an answer', () => {
    // The fifth answer, a plain message, is what the model produces by calling
    // no tool at all. There is deliberately no menu-retrieval tool: showing
    // products is an answer to the guest, not the model fetching data for
    // itself, so it ends the turn the way the others do.
    expect(aiOrderingToolDefinitions.map((tool) => tool.name)).toEqual([
      'propose_cart_operations',
      'ask_choices',
      'show_products',
      'report_unanswerable',
    ]);
  });

  it('gives every tool a description for the model', () => {
    for (const tool of aiOrderingToolDefinitions) {
      expect(tool.description.length, tool.name).toBeGreaterThan(0);
    }
  });

  it('exposes no backend-owned field in any tool argument schema', () => {
    for (const tool of aiOrderingToolDefinitions) {
      for (const field of BACKEND_OWNED_FIELDS) {
        const parsed = tool.schema.safeParse({ [field]: 'anything' });

        // Either the field is not part of the schema at all, or the schema
        // rejects the object outright for missing what it does require. What must
        // never happen is the field surviving into the parsed arguments.
        expect(
          parsed.success && Object.hasOwn(parsed.data as object, field),
          `${tool.name}.${field}`,
        ).toBe(false);
      }
    }
  });

  it('strips a backend-owned field the model smuggled in beside valid arguments', () => {
    const proposal = aiOrderingToolDefinitions.find(
      (tool) => tool.name === 'propose_cart_operations',
    );

    const parsed = proposal?.schema.parse({
      reply: 'Adding that.',
      confirmationRequired: false,
      proposalId: 'chosen-by-the-model',
      operations: [
        {
          type: 'add_item',
          summary: 'Add rice',
          operationId: 'chosen-by-the-model',
          item: { productId: 'prod-rice', quantity: 1 },
        },
      ],
    });

    expect(Object.keys(parsed as object).sort()).toEqual([
      'operations',
      'reply',
    ]);
    expect(
      Object.keys(
        (parsed as { operations: object[] }).operations[0] as object,
      ).sort(),
      // No `summary`: the per-operation label is derived by the backend, so the
      // model has no field in which to describe an action instead of specifying
      // one.
    ).toEqual(['item', 'type']);
  });

  it('lets the model supply choice labels but not option ids', () => {
    const askChoice = aiOrderingToolDefinitions.find(
      (tool) => tool.name === 'ask_choices',
    );

    const parsed = askChoice?.schema.parse({
      reply: '要什麼甜度？',
      question: '要什麼甜度？',
      inputMode: 'single_choice',
      allowFreeText: false,
      options: [{ id: 'chosen-by-the-model', label: '半糖' }],
    }) as { allowFreeText?: unknown; options: object[] };

    // The backend issues option ids, so a later `selectedOptionId` always
    // resolves against something the backend handed out.
    expect(parsed.allowFreeText).toBeUndefined();
    expect(Object.keys(parsed.options[0] as object)).toEqual(['label']);
  });
});
