import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'
import type { ZodType } from 'zod'
import { createParamDecorator } from '@nestjs/common'
import { ApiQuery } from '@nestjs/swagger'
import { z } from 'zod'
import { getOpenApiSchema } from '../openapi/openapi'
import { ZodValidationException } from './validation.exception'

function createQuerySchema<T, U extends z.ZodType<T, any>>(
  schema: U,
): U {
  return schema
}

/**
 * Type-safe query parameter decorator
 *
 * @param key - Query parameter key
 * @param schema - Zod schema for validation
 * @see https://lonestone.github.io/nzoth/core/validation/
 * @example
 * ```typescript
 * @Get()
 * async search(
 *   @TypedQuery('q', z.string().min(2).meta({
 *     description: 'Search query',
 *     example: 'typescript'
 *   })) query: string,
 *   @TypedQuery('tags', z.array(z.string()).meta({
 *     description: 'Filter by tags',
 *     example: ['api']
 *   })) tags: string[],
 *   @TypedQuery('page', z.coerce.number().int().positive().optional().meta({
 *     description: 'Page number',
 *     example: 1
 *   })) page?: number,
 * ) {
 *   return this.service.search(query, tags, page)
 * }
 * ```
 */
export function TypedQuery<T>(
  key: string,
  schema: ZodType<T, any>,
) {
  const querySchema = createQuerySchema(schema)
  const openApiSchema = getOpenApiSchema(querySchema)

  // Create our base ApiQuery decorator
  const baseDecorator = ApiQuery({
    name: key,
    required: !schema.isOptional(),
    schema: openApiSchema,
    description: openApiSchema.description,
  })

  // Create parameter decorator for validation
  const paramDecorator = createParamDecorator((_: unknown, ctx: any) => {
    const request = ctx.switchToHttp().getRequest()
    const value = request.query[key]

    // Handle array conversion for single values when schema expects an array
    let processedValue = value
    if (schema instanceof z.ZodArray && !Array.isArray(value) && value !== undefined) {
      processedValue = [value]
    }

    try {
      return querySchema.parse(processedValue)
    }
    catch (err) {
      if (err instanceof z.ZodError) {
        throw new ZodValidationException(err)
      }
      throw err
    }
  })

  // Return a decorator that applies our base ApiQuery first
  return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
    baseDecorator(target.constructor, propertyKey, {
      value: target.constructor.prototype[propertyKey],
      writable: true,
      enumerable: true,
      configurable: true,
    })
    return paramDecorator()(target, propertyKey, parameterIndex)
  }
}

/**
 * Creates a validator for an entire query object
 *
 * @param schema - Zod schema for the entire query object
 *
 * @example
 * ```typescript
 * const SearchQuery = z.object({
 *   q: z.string().min(2).meta({
 *     description: 'Search query',
 *     example: 'typescript'
 *   }),
 *   tags: z.array(z.string()).optional().meta({
 *     description: 'Filter by tags',
 *     example: ['api', 'typescript']
 *   }),
 *   page: z.coerce.number().int().positive().optional().meta({
 *     description: 'Page number',
 *     example: 1
 *   }),
 * }).meta({
 *   title: 'SearchQuery',
 *   description: 'Search query parameters'
 * })
 *
 * @Get()
 * async search(@TypedQueryObject(SearchQuery) query: z.infer<typeof SearchQuery>) {
 *   return this.service.search(query)
 * }
 * ```
 */
export function TypedQueryObject<T>(schema: ZodType<T, any>) {
  const openApiSchema = getOpenApiSchema(schema)
  const properties = openApiSchema.properties || {}
  const required = openApiSchema.required || []

  // Create base ApiQuery decorators for each property
  const baseDecorators = Object.entries(properties).map(([name, prop]) => {
    return ApiQuery({
      name,
      required: required.includes(name),
      schema: prop as SchemaObject,
    })
  })

  // Create parameter decorator for validation
  const paramDecorator = createParamDecorator((_: unknown, ctx: any) => {
    const request = ctx.switchToHttp().getRequest()
    const query = request.query

    try {
      return schema.parse(query)
    }
    catch (err) {
      if (err instanceof z.ZodError) {
        throw new ZodValidationException(err)
      }
      throw err
    }
  })

  // Return a decorator that applies all base ApiQuery decorators first
  return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
    baseDecorators.forEach(decorator => {
      decorator(target.constructor, propertyKey, {
        value: target.constructor.prototype[propertyKey],
        writable: true,
        enumerable: true,
        configurable: true,
      })
    })
    return paramDecorator()(target, propertyKey, parameterIndex)
  }
}
