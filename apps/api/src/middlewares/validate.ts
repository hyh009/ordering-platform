import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

type RequestSource = 'body' | 'query' | 'params';

export const validate = (schema: ZodType, source: RequestSource = 'body') => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = await schema.parseAsync(req[source]);
      req[source] = result;
      next();
    } catch (error) {
      next(error);
    }
  };
};
