import { z } from 'zod';

export function paginationNumberSchema(schema: z.ZodNumber) {
  return z.preprocess(
    (value) => (value === undefined ? undefined : Number(value)),
    schema,
  );
}

export const offsetPaginationQuerySchema = z.object({
  offset: paginationNumberSchema(z.number().int().min(0)).optional().default(0),
  limit: paginationNumberSchema(z.number().int().min(1).max(100)).optional().default(20),
});
