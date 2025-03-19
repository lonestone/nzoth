import type { PaginationQuery } from './pagination'
import { TypedQueryObject } from '../validation/typed-query.decorator'

export interface PaginationOptions {
  defaultPageSize?: number
  maxPageSize?: number
  minPageSize?: number
}

/**
 * Decorator for parsing and validating pagination parameters from query string
 *
 * @param schema Schema created by createPaginationQuerySchema
 *
 * @example
 * ```typescript
 * @Get()
 * findAll(@PaginationParams(createPaginationQuerySchema({ defaultPageSize: 10, maxPageSize: 50 })) pagination: Pagination) {
 *   // pagination will always be defined with defaults
 *   // Valid queries:
 *   // ?offset=0&pageSize=10
 *   // ?pageSize=20
 *   // ?offset=100
 * }
 * ```
 */
export function PaginationParams(schema: PaginationQuery) {
  return TypedQueryObject(schema)
}
