import { z } from 'zod'

/**
 * Creates a union of literal types from an array of strings with proper type checking
 * @param keys - Array of at least two strings that will be used as literal types
 * @returns A Zod union schema of the literal types
 */
export function createLiteralUnion<T extends readonly string[]>(keys: T, type: 'filtering' | 'sorting' | 'param') {
  return z
    .union(
      keys.map(key => z.literal(key)) as [
        z.ZodLiteral<T[number]>,
        z.ZodLiteral<T[number]>,
        ...z.ZodLiteral<T[number]>[],
      ],
    )
    .superRefine((val, ctx) => {
      if (!keys.includes(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['property'],
          message: `Invalid ${type} property '${val}'. Allowed properties are: ${keys.join(', ')}`,
        })
      }
    })
}
