import type { FilteringQuery } from './filtering.js'
import { TypedQuery } from '../validation/typed-query.decorator.js'

/**
 * Decorator for parsing and validating filtering parameters from query string
 *
 * @param filteringSchema Schema created by createFilterQuerySchema
 *
 * @example
 * ```typescript
 * @Get()
 * findAll(@FilteringParams(createFilterQuerySchema(['name', 'age'])) filters?: Filtering[]) {
 *   // filters will be undefined or Filtering[]
 *   // Valid queries:
 *   // ?filter=name:eq:john
 *   // ?filter=age:gt:25;name:like:john
 *   // ?filter=active:isnull
 * }
 * ```
 */
export function FilteringParams(filteringSchema: FilteringQuery) {
  return TypedQuery('filter', filteringSchema, { optional: true })
}
