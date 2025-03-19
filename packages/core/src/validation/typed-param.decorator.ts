import type { ExecutionContext } from '@nestjs/common'
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'
import { generateSchema } from '@anatine/zod-openapi'
import { BadRequestException, createParamDecorator } from '@nestjs/common'
import { ApiParam } from '@nestjs/swagger'
import { z } from 'zod'
import { ZodValidationException } from './validation.exception'

type SupportedParamTypes = string | number | boolean | null

/**
 * Converts a string parameter to the target type based on a Zod schema
 *
 * @example
 * ```typescript
 * const uuidSchema = z.string().uuid()
 * const numberSchema = z.coerce.number().int().positive()
 * const boolSchema = z.string().nullish().transform((s) => !!s && s !== "false" && s !== "0")
 * ```
 */
const paramConverters = {
  string: z.string(),
  number: z.coerce.number(),
  boolean: z.enum(['true', 'false']).transform(v => v === 'true'),
  uuid: z.string().uuid(),
  int: z.coerce.number().int(),
  positiveInt: z.coerce.number().int().positive(),
} as const

/**
 * Type-safe parameter decorator that validates and transforms URL parameters
 *
 * @param name - The name of the URL parameter
 * @param type - The type to convert the parameter to
 *
 * @example
 * ```typescript
 * @Get(':id/items/:count')
 * async getItems(
 *   @TypedParam('id', 'uuid') id: string,
 *   @TypedParam('count', 'positiveInt') count: number
 * ) {
 *   return this.service.getItems(id, count)
 * }
 * ```
 */
export function TypedParam(
  name: string,
  type: keyof typeof paramConverters = 'string',
) {
  const schema = paramConverters[type]
  const openApiSchema = generateSchema(schema) as SchemaObject

  // Create our base ApiParam decorator first
  const baseDecorator = ApiParam({
    name,
    required: true,
    schema: openApiSchema,
  })

  // Create parameter decorator for validation
  const paramDecorator = createParamDecorator((_: unknown, ctx: ExecutionContext): SupportedParamTypes => {
    const request = ctx.switchToHttp().getRequest()
    const value = request.params[name]

    if (value === undefined) {
      throw new BadRequestException(`Missing required parameter: ${name}`)
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

  // Return a decorator that applies our base ApiParam first (so manual decorators take precedence)
  return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
    baseDecorator(target.constructor, propertyKey, {
      value: target.constructor.prototype[propertyKey],
      writable: true,
      enumerable: true,
      configurable: true,
    })
    return paramDecorator(name)(target, propertyKey, parameterIndex)
  }
}

/**
 * Creates a custom parameter validator
 *
 * @param schema - A Zod schema to validate the parameter
 *
 * @example
 * ```typescript
 * const CustomParam = createTypedParam(z.string().min(3).max(10))
 *
 * @Get(':code')
 * async getByCode(@CustomParam('code') code: string) {
 *   return this.service.findByCode(code)
 * }
 * ```
 */
export function createTypedParam<T extends SupportedParamTypes>(schema: z.ZodType<T>) {
  const openApiSchema = generateSchema(schema) as SchemaObject

  return (name: string) => {
    // Create our base ApiParam decorator first
    const baseDecorator = ApiParam({
      name,
      required: true,
      schema: openApiSchema,
    })

    // Create parameter decorator for validation
    const paramDecorator = createParamDecorator((_: unknown, ctx: ExecutionContext): T => {
      const request = ctx.switchToHttp().getRequest()
      const value = request.params[name]

      if (value === undefined) {
        throw new BadRequestException(`Missing required parameter: ${name}`)
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

    // Return a decorator that applies our base ApiParam first (so manual decorators take precedence)
    return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
      baseDecorator(target.constructor, propertyKey, {
        value: target.constructor.prototype[propertyKey],
        writable: true,
        enumerable: true,
        configurable: true,
      })
      return paramDecorator(name)(target, propertyKey, parameterIndex)
    }
  }
}
