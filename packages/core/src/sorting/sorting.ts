import { z } from 'zod'
import { createLiteralUnion } from '../utils/schema.js'

export interface Sort<T extends readonly string[]> {
  property: T[number] & string
  direction: z.infer<typeof SortDirection>
}

export const SortDirection = z.enum(['asc', 'desc'], {
  error: (_issue) => {
    return {
      message: 'Invalid sort direction. Use either "asc" or "desc"',
      code: 'invalid_direction',
    }
  },
})

export function SortingToString<T extends readonly string[]>(
  sorting: Sort<T>[],
): string {
  return sorting.map(el => `${el.property}:${el.direction}`).join(',')
}
/**
 * This schema is used to validate a single sorting item represented as an object
 * Example: { property: 'name', direction: 'asc' }
 * @param enabledKeys - The list of allowed properties
 * @returns A zod schema for sorting items
 */
export function SortingSchema<T extends readonly string[]>(enabledKeys: T) {
  return z
    .object({
      property: createLiteralUnion(enabledKeys, 'sorting'),
      direction: SortDirection,
    })
    .meta({
      title: 'SortingSchema',
      description: 'Schema for sorting items',
    })
}

/**
 * This schema is used to validate a single sorting item represented as a string (like in query params)
 * Example: "name:asc"
 * @param enabledKeys - The list of allowed properties
 * @returns A zod schema for sorting items
 */
export function SortingStringSchema<T extends readonly string[]>(
  enabledKeys: T,
) {
  return z.string()
    // First validate basic format
    .regex(/^[^:]+(?::(asc|desc))?$/, 'Invalid sort format. Expected format: property[:asc|desc]')
    .transform((val) => {
      const [property, direction = 'asc'] = val.split(':')
      return {
        property,
        direction: direction as z.infer<typeof SortDirection>,
      }
    })
    .pipe(SortingSchema(enabledKeys))
    .meta({
      title: 'SortingStringSchema',
      description: 'Schema for sorting items',
    })
}

/**
 * Schema validating an entire sorting query string
 * Example: "sort=name:asc,age:desc"
 * @param enabledKeys - The list of allowed properties
 * @returns A zod schema for sorting items
 */
export function createSortingQueryStringSchema<T extends readonly string[]>(
  enabledKeys: T,
) {
  return z
    .string()
    .transform(val => val?.split(',').map(s => s.trim()))
    .pipe(z.array(SortingStringSchema(enabledKeys)))
    .optional()
    .meta({
      title: 'SortingQueryStringSchema',
      description: 'Schema for sorting items',
      example: 'name:asc,age:desc',
      override: {
        type: 'string',
        format: 'sort',
      },
    })
}

export type SortingItem<T extends readonly string[]> = z.infer<
  ReturnType<typeof SortingStringSchema<T>>
>
export type SortingQuery = z.infer<ReturnType<typeof createSortingQueryStringSchema>>
