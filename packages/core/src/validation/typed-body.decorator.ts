import type { ExecutionContext } from '@nestjs/common'
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'
import type { ZodType } from 'zod'
import { BadRequestException, createParamDecorator } from '@nestjs/common'
import { ApiBody } from '@nestjs/swagger'
import { z } from 'zod'
import { autoRegisterSchema } from '../openapi/openapi.js'
import { ZodValidationException } from './validation.exception'

function isApplicationJson(contentType?: string): boolean {
  return (
    contentType !== undefined
    && contentType
      .split(';')
      .map(str => str.trim())
      .includes('application/json')
  )
}

function isFormUrlEncoded(contentType?: string): boolean {
  return (
    contentType !== undefined
    && contentType
      .split(';')
      .map(str => str.trim())
      .includes('application/x-www-form-urlencoded')
  )
}

/**
 * Type-safe body decorator that validates request body using Zod schemas.
 * Automatically generates OpenAPI documentation from the schema using zod-openapi.
 * Expects application/json content type.
 *
 * @param schema - Zod schema for validation
 *
 * @example
 * ```typescript
 * const CreateUserSchema = z.object({
 *   name: z.string().min(3).meta({
 *     description: 'User name',
 *     example: 'John Doe'
 *   }),
 *   email: z.string().email().meta({
 *     description: 'User email',
 *     example: 'john@example.com'
 *   }),
 *   role: z.enum(['admin', 'user']).meta({
 *     description: 'User role',
 *     example: 'user'
 *   }),
 * }).meta({
 *   title: 'CreateUser',
 *   description: 'User creation payload'
 * })
 *
 * @Post()
 * async createUser(@TypedBody(CreateUserSchema) dto: z.infer<typeof CreateUserSchema>) {
 *   return this.userService.create(dto)
 * }
 * ```
 *
 * You can override the generated OpenAPI documentation by using @ApiBody before the method:
 * ```typescript
 * @ApiBody({ description: 'Custom description' })
 * @Post()
 * async createUser(@TypedBody(CreateUserSchema) dto: z.infer<typeof CreateUserSchema>) {
 *   return this.userService.create(dto)
 * }
 * ```
 */
export function TypedBody<T>(schema: ZodType<T, any, any>) {
  // Generate OpenAPI schema and automatically register it
  const openApiSchema = autoRegisterSchema(schema, 'Body')

  // Create our base ApiBody decorator
  const baseDecorator = ApiBody({
    required: true,
    schema: openApiSchema,
    description: openApiSchema.description,
  })

  // Create parameter decorator for validation
  const paramDecorator = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const contentType = request.headers['content-type']

    if (!isApplicationJson(contentType)) {
      throw new BadRequestException('Content-Type must be application/json')
    }

    try {
      return schema.parse(request.body)
    }
    catch (err) {
      if (err instanceof z.ZodError) {
        throw new ZodValidationException(err)
      }
      throw err
    }
  })

  // Return a decorator that applies our base ApiBody first (so manual decorators take precedence)
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
 * Type-safe form-urlencoded body decorator that validates request body using Zod schemas.
 * Automatically generates OpenAPI documentation from the schema using zod-openapi.
 * Expects application/x-www-form-urlencoded content type.
 *
 * @param schema - Zod schema for validation
 *
 * @example
 * ```typescript
 * const CreateArticleSchema = z.object({
 *   title: z.string().min(3).meta({
 *     description: 'Article title',
 *     example: 'My First Article'
 *   }),
 *   content: z.string().meta({
 *     description: 'Article content',
 *     example: 'This is the article content...'
 *   }),
 *   tags: z.array(z.string()).meta({
 *     description: 'Article tags',
 *     example: ['tech', 'programming']
 *   }),
 * }).meta({
 *   title: 'CreateArticle',
 *   description: 'Article creation payload'
 * })
 *
 * @Post()
 * async create(@TypedFormBody(CreateArticleSchema) data: z.infer<typeof CreateArticleSchema>) {
 *   return this.service.create(data)
 * }
 * ```
 *
 * You can override the generated OpenAPI documentation by using @ApiBody before the method:
 * ```typescript
 * @ApiBody({ description: 'Custom description' })
 * @Post()
 * async create(@TypedFormBody(CreateArticleSchema) data: z.infer<typeof CreateArticleSchema>) {
 *   return this.service.create(data)
 * }
 * ```
 */
export function TypedFormBody<T>(schema: ZodType<T, any, any>) {
  // Generate OpenAPI schema using zod-openapi
  const openApiSchema = autoRegisterSchema(schema, 'Form')

  // Create our base ApiBody decorator
  const baseDecorator = ApiBody({
    required: true,
    schema: openApiSchema,
    description: openApiSchema.description,
    type: 'object',
  })

  // Create parameter decorator for validation
  const paramDecorator = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const contentType = request.headers['content-type']

    if (!isFormUrlEncoded(contentType)) {
      throw new BadRequestException('Content-Type must be application/x-www-form-urlencoded')
    }

    // Convert URLSearchParams to object
    const formData = new URLSearchParams(request.body)
    const data = Object.fromEntries(formData)
    try {
      return schema.parse(data)
    }
    catch (err) {
      if (err instanceof z.ZodError) {
        throw new ZodValidationException(err)
      }
      throw err
    }
  })

  // Return a decorator that applies our base ApiBody first (so manual decorators take precedence)
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
