/**
 * Translating a tool argument schema into the dialect Gemini accepts.
 *
 * Gemini's `functionDeclarations[].parameters` is an OpenAPI 3.0 subset, not full
 * JSON Schema. The gap that bites is `const`: zod renders `z.literal('add_item')`
 * as `{"type":"string","const":"add_item"}`, and Gemini answers
 *
 *   400 Unknown name "const" at '...one_of[0].properties[0].value'
 *
 * `enum` with a single member says exactly the same thing and is in the subset, so
 * that is the rewrite.
 *
 * The second gap is nullability. `z.string().nullable()` renders as
 * `anyOf: [{type:'string'}, {type:'null'}]`, and the subset's type list has no
 * NULL — it spells this `nullable: true`. Left alone it would be the next 400.
 *
 * The third is `oneOf`, which zod emits for a discriminated union. The subset
 * documents `anyOf`. A discriminator makes the branches mutually exclusive, so
 * exactly-one and at-least-one mean the same thing here, and the rewrite puts the
 * request on the field the API actually documents.
 *
 * This lives on the provider side on purpose. The alternative — authoring the
 * model-facing schemas in Gemini's subset — would shape a backend contract around
 * one vendor's parser, and the next provider would want something else. The
 * schemas stay written in zod; each adapter says what its own wire format needs.
 */

import { z } from 'zod';

/** Keys that describe the schema document rather than the value it accepts. */
const DOCUMENT_KEYS = new Set(['$schema', '$id', '$comment']);

// `oneOf` is rewritten to `anyOf` on the way in, so only one survives to collapse.
const UNION_KEYS = ['anyOf'] as const;

function isNullBranch(branch: unknown): boolean {
  return (
    typeof branch === 'object' &&
    branch !== null &&
    (branch as { type?: unknown }).type === 'null'
  );
}

/**
 * Turns a union that merely includes null into the same union marked nullable.
 *
 * With one branch left, that branch moves up and replaces the union: a
 * `nullable` string is a string, and the wrapper only cost the subset a type it
 * does not have.
 */
function collapseNullBranches(
  node: Record<string, unknown>,
): Record<string, unknown> {
  for (const unionKey of UNION_KEYS) {
    const branches = node[unionKey];

    if (!Array.isArray(branches) || !branches.some(isNullBranch)) {
      continue;
    }

    const kept = branches.filter((branch) => !isNullBranch(branch));
    const { [unionKey]: _removed, ...rest } = node;

    if (kept.length === 1 && typeof kept[0] === 'object' && kept[0] !== null) {
      return { ...rest, ...(kept[0] as Record<string, unknown>), nullable: true };
    }

    return { ...rest, [unionKey]: kept, nullable: true };
  }

  return node;
}

function convertNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(convertNode);
  }

  if (typeof node !== 'object' || node === null) {
    return node;
  }

  const source = node as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (DOCUMENT_KEYS.has(key)) {
      continue;
    }

    if (key === 'const') {
      // Single-member `enum` is the subset's way to pin one value. Written only
      // when the node does not already carry an `enum`, so an explicit one wins.
      if (source.enum === undefined) {
        result.enum = [value];
      }
      continue;
    }

    result[key === 'oneOf' ? 'anyOf' : key] = convertNode(value);
  }

  return collapseNullBranches(result);
}

/**
 * Renders a zod schema as the JSON Schema Gemini will accept.
 *
 * Returned as a plain JSON Schema rather than the zod schema because LangChain
 * passes a zod schema through its own converter, which emits the `const` this
 * function exists to remove.
 */
export function toGeminiToolSchema(schema: z.ZodType): Record<string, unknown> {
  return convertNode(z.toJSONSchema(schema, { io: 'input' })) as Record<
    string,
    unknown
  >;
}
