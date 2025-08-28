import type { ExecutionContext } from '@nestjs/common'
import { BadRequestException, createParamDecorator } from '@nestjs/common'
import { ApiParam } from '@nestjs/swagger'
import { z, type ZodType } from 'zod'
import { getOpenApiSchema } from '../openapi/openapi.js'
import { ZodValidationException } from './validation.exception'

type SupportedParamTypes = string | number | boolean | null

/**
 * Converts a string parameter to the target type based on a Zod schema
 *
 * @see https://lonestone.github.io/nzoth/core/validation/
 *
 * @example
 * ```typescript
 * const uuidSchema = z.string().uuid().meta({
 *   description: 'User UUID',
 *   example: '123e4567-e89b-12d3-a456-426614174000'
 * })
 * const numberSchema = z.coerce.number().int().positive().meta({
 *   description: 'User ID',
 *   example: 123
 * })
 * const boolSchema = z.string().nullish().transform((s) => !!s && s !== "false" && s !== "0").meta({
 *   description: 'Active status',
 *   example: 'true'
 * })
 * ```
 */
export function TypedParam<T extends SupportedParamTypes>(
  key: string,
  schema: ZodType<T, any, any>,
) {
  // Create parameter decorator for validation
  const paramDecorator = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const value = request.params[key]

    if (value === undefined) {
      throw new BadRequestException(`Missing required parameter: ${key}`)
    }

    try {
      return schema.parse(value)
    }
    catch (err) {
      if (err instanceof z.ZodError) {
        throw new ZodValidationException(err)
      }
      throw err
    }
  })

  // Return a decorator that applies our base ApiParam first
  return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
    // Generate OpenAPI schema using zod-openapi
    const openApiSchema = getOpenApiSchema(schema)

    // Create our base ApiParam decorator
    const baseDecorator = ApiParam({
      name: key,
      schema: openApiSchema,
      description: openApiSchema.description,
    })

    baseDecorator(target.constructor, propertyKey, {
      value: target.constructor.prototype[propertyKey],
      writable: true,
      enumerable: true,
      configurable: true,
    })
    return paramDecorator()(target, propertyKey, parameterIndex)
  }
}
