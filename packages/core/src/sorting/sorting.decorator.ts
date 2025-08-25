import type { createSortingQueryStringSchema } from './sorting'
import { TypedQuery } from '../validation/typed-query.decorator.js'

/**
 * Decorator for parsing and validating sorting parameters from query string
 *
 * @param schema Schema created by createSortQuerySchema
 *
 * @example
 * ```typescript
 * @Get()
 * findAll(@SortingParams(createSortQuerySchema(['name', 'createdAt'])) sort?: Sort[]) {
 *   // sort will be undefined or Sort[]
 *   // Valid query: ?sort=name:asc,createdAt:desc
 * }
 * ```
 */
export function SortingParams(schema: ReturnType<typeof createSortingQueryStringSchema>) {
  return TypedQuery('sort', schema, { optional: true })
}
