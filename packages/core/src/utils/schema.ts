
import { z } from 'zod';

/**
 * Creates a union of literal types from an array of strings with proper type checking
 * @param keys - Array of at least two strings that will be used as literal types
 * @returns A Zod union schema of the literal types
 */
export function createLiteralUnion<T extends readonly [string, ...string[]]>(keys: T, type:  'filtering' | 'sorting' | 'param') {
  return z
    .union(
      keys.map(key => z.literal(key)) as [
        z.ZodLiteral<T[number]>,
        z.ZodLiteral<T[number]>,
        ...z.ZodLiteral<T[number]>[],
      ],
    )
    .catch(ctx => {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: [0, 'property'],
          message: `Invalid ${type} property '${ctx.input}'. Allowed properties are: ${keys.join(', ')}`,
        },
      ]);
    });
}
