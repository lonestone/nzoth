import type { ZodType } from 'zod'
import { z } from 'zod'

export const PaginationMetaSchema = z.object({
  offset: z.number(),
  pageSize: z.number(),
  itemCount: z.number(),
  hasMore: z.boolean(),
})

export function paginatedSchema<T>(schema: ZodType<T, any>) {
  return z.object({
    data: z.array(schema),
    meta: PaginationMetaSchema,
  })
}

export type PaginatedSchema<T> = ReturnType<typeof paginatedSchema<T>>
export type Paginated<T> = z.infer<PaginatedSchema<T>>

const DEFAULT_OFFSET = 0
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
export const MIN_PAGE_SIZE = 1

export function createPaginationQuerySchema(options?: {
  defaultPageSize?: number
  maxPageSize?: number
  minPageSize?: number
}) {
  const defaultPageSize = options?.defaultPageSize ?? DEFAULT_PAGE_SIZE
  const maxPageSize = options?.maxPageSize ?? MAX_PAGE_SIZE
  const minPageSize = options?.minPageSize ?? MIN_PAGE_SIZE

  return z.preprocess(
    val => (val == null ? {} : val),

    z.object({
      offset: z.coerce
        .number()
        .int()
        .min(0)
        .default(DEFAULT_OFFSET)
        .describe('Starting position of the query'),
      pageSize: z.coerce
        .number()
        .int()
        .min(minPageSize)
        .max(maxPageSize)
        .default(defaultPageSize)
        .describe('Number of items to return'),
    }).meta({
      title: 'PaginationQuerySchema',
      description: 'Schema for pagination query',
    }),
  )
}

export type PaginationQuery = ReturnType<typeof createPaginationQuerySchema>
export type Pagination = z.infer<PaginationQuery>

// Helper function for serialization
export function PaginationToString(pagination: Pagination): string {
  return `${pagination.offset}:${pagination.pageSize}`
}
