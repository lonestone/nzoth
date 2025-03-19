import type { SortingQuery } from './sorting'
import { TypedQuery } from '../validation/typed-query.decorator'

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
export function SortingParams(schema: SortingQuery) {
  return TypedQuery('sort', schema, { optional: true })
}
