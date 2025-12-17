import { z } from 'zod'
import { createLiteralUnion } from '../utils/schema.js'

export enum FilterRule {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUALS = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUALS = 'lte',
  LIKE = 'like',
  NOT_LIKE = 'nlike',
  IN = 'in',
  NOT_IN = 'nin',
  IS_NULL = 'isnull',
  IS_NOT_NULL = 'isnotnull',
}

export interface Filtering {
  property: string
  rule: FilterRule
  value?: string
}

// Helper function to convert filters to string (useful for serialization)
export function FiltersToString(filters: Filtering[]): string {
  return filters
    .map((filter) => {
      if (filter.value === undefined) {
        return `${filter.property}:${filter.rule}`
      }
      return `${filter.property}:${filter.rule}:${filter.value}`
    })
    .join(';')
}

/**
 * This schema is used to validate a single filtering item represented as an object
 * Example: { property: 'name', rule: FilterRule.EQUALS, value: 'John' }
 * @param availableFilteringKeys - The list of allowed properties
 * @returns A zod schema for filtering items
 */
export function FilteringSchema<T extends readonly string[]>(
  availableFilteringKeys: T,
) {
  return z.object({
    property: createLiteralUnion(availableFilteringKeys, 'filtering'),
    rule: z.enum(FilterRule),
    value: z.string().optional(),
  }).meta({
    title: 'FilteringSchema',
    description: 'Schema for a single filtering item',
  })
}

/**
 * This schema is used to validate a single filtering item represented as a string (like in query params)
 * Example: "name:eq:John"
 * @param availableFilteringKeys - The list of allowed properties
 * @returns A zod schema for filtering items
 */
export function FilteringStringItemSchema<T extends readonly string[]>(
  availableFilteringKeys: T,
) {
  return z
    .string()
    .superRefine((value, ctx) => {
      const [, rule] = value.split(':')
      if (!Object.values(FilterRule).includes(rule as FilterRule)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid filter rule. Expected one of: ${Object.values(FilterRule).join(', ')}`,
          path: [],
        })
        return
      }

      const parts = value.split(':')

      // For IS_NULL and IS_NOT_NULL, exactly 2 parts are required
      if ([FilterRule.IS_NULL, FilterRule.IS_NOT_NULL].includes(rule as FilterRule)) {
        if (parts.length !== 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'IS_NULL and IS_NOT_NULL rules should not have a value',
            path: [],
          })
        }
      }
      // For other rules, exactly 3 parts are required
      else if (parts.length !== 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Value is required for this filter rule',
          path: [],
        })
      }
    })
    .transform((value): Filtering => {
      const [property, rule, filterValue] = value.split(':')

      // For IS_NULL and IS_NOT_NULL, value is not needed
      if ([FilterRule.IS_NULL, FilterRule.IS_NOT_NULL].includes(rule as FilterRule)) {
        return {
          property,
          rule: rule as FilterRule,
        }
      }

      return {
        property,
        rule: rule as FilterRule,
        value: filterValue,
      }
    })
    .pipe(FilteringSchema(availableFilteringKeys))
}

/**
 * Schema validating an entire filtering query string
 * Example: "name:eq:John;age:gt:30"
 * @param availableFilteringKeys - The list of allowed properties
 * @returns A zod schema for filtering items
 */
export function createFilterQueryStringSchema<T extends readonly string[]>(
  availableFilteringKeys: T,
) {
  const itemSchema = FilteringStringItemSchema(availableFilteringKeys)

  return (
    z
      .string()
      // filter(Boolean) removes empty strings
      .transform(val =>
        val
          ?.split(';')
          .filter(Boolean)
          .map(s => s.trim()),
      )
      .pipe(z.array(itemSchema))
      .optional()
      .meta({
        title: 'FilterQueryStringSchema',
        description: `Filtering query string, in the format of "property:rule[:value];property:rule[:value];..."
    <br> Available rules: ${Object.values(FilterRule).join(', ')} 
    <br> Available properties: ${availableFilteringKeys.join(', ')}`,
        example: 'name:eq:John;age:gt:30',
        override: {
          type: 'string',
          format: 'filter',
        },
      })
  )
}

export type FilteringItem = z.infer<ReturnType<typeof FilteringStringItemSchema>>
export type FilteringQuery = z.infer<ReturnType<typeof createFilterQueryStringSchema>>
