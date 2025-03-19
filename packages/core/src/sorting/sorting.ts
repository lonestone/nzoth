import { extendApi } from '@anatine/zod-openapi'
import { z } from 'zod'

export const SortDirection = z.enum(['asc', 'desc'], {
  errorMap: () => ({
    message: 'Invalid sort direction. Use either "asc" or "desc"',
    code: 'invalid_direction',
  }),
})

// We can't infer fron zod, because zod would add questionMarks (undefined) to the type due to generics
// This is a known issue
export interface Sort {
  property: string
  direction: z.infer<typeof SortDirection>
}

export function SortingToString(sorting: Sort[]): string {
  return sorting.map(el => `${el.property}:${el.direction}`).join(',')
}

/**
 * This schema is used to validate a single sorting item represented as an object
 * Example: { property: 'name', direction: 'asc' }
 * @param enabledKeys - The list of allowed properties
 * @returns A zod schema for sorting items
 */
export function SortingSchema(enabledKeys: string[]) {
  return extendApi(z.object({
    property: z.string().refine(
      value => enabledKeys.includes(value),
      () => ({
        message: `Invalid sorting property. Allowed properties are: ${enabledKeys.join(', ')}`,
        code: 'invalid_property',
      }),
    ),
      direction: SortDirection,
    }),
    {
      title: "SortingSchema",
      description: "Schema for sorting items",
    }
  );
}

/**
 * This schema is used to validate a single sorting item represented as a string (like in query params)
 * Example: "name:asc"
 * @param enabledKeys - The list of allowed properties
 * @returns A zod schema for sorting items
 */
export function SortingStringSchema(enabledKeys: string[]) {
  return extendApi(z.string()
  // First validate basic format
    .regex(
      /^[^:]+(?::(asc|desc))?$/,
      'Invalid sort format. Expected format: property[:asc|desc]',
    )
    .transform((val) => {
      const [property, direction = 'asc'] = val.split(':')
      return {
        property,
        direction: direction as z.infer<typeof SortDirection>,
      }
    })
    .pipe(SortingSchema(enabledKeys)),
    {
      title: "SortingStringSchema",
      description: "Schema for sorting items",
    }
  );
}

/**
 * Schema validating an entire sorting query string
 * Example: "sort=name:asc,age:desc"
 * @param enabledKeys - The list of allowed properties
 * @returns A zod schema for sorting items
 */
export function createSortingQueryStringSchema(enabledKeys: string[]) {
  return extendApi(z.string()
    .transform(val => val?.split(',').map(s => s.trim()))
    .pipe(z.array(SortingStringSchema(enabledKeys)))
    .optional(),
    {
      title: "SortingQueryStringSchema",
      description: "Schema for sorting items",
    }
  );
}

export type SortingItem = ReturnType<typeof SortingStringSchema>
export type SortingQuery = ReturnType<typeof createSortingQueryStringSchema>
