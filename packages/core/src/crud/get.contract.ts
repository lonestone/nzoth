import type { ZodType, ZodTypeDef } from 'zod'
import type { FilteringQuery } from '../filtering/filtering.js'
import type { PaginationQuery } from '../pagination/pagination.js'
import type { SortingQuery } from '../sorting/sorting.js'

export interface GetContract {
  paginationSchema: PaginationQuery
  sortingSchema: SortingQuery
  filteringSchema: FilteringQuery
  searchSchema: ZodType<any, ZodTypeDef, any> // a custom schema for searching
}
