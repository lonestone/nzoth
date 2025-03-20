import type { ExecutionContext } from '@nestjs/common';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import type { ZodType, ZodTypeDef } from 'zod';
import { generateSchema } from '@anatine/zod-openapi';
import { BadRequestException, createParamDecorator } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationException } from './validation.exception';
import { registerSchema } from './typed-schema';

function isApplicationJson(contentType?: string): boolean {
  return (
    contentType !== undefined &&
    contentType
      .split(';')
      .map(str => str.trim())
      .includes('application/json')
  );
}

function isFormUrlEncoded(contentType?: string): boolean {
  return (
    contentType !== undefined &&
    contentType
      .split(';')
      .map(str => str.trim())
      .includes('application/x-www-form-urlencoded')
  );
}

/**
 * Type-safe body decorator that validates request body using Zod schemas.
 * Automatically generates OpenAPI documentation from the schema.
 * Expects application/json content type.
 *
 * @param schema - Zod schema for validation
 *
 * @example
 * ```typescript
 * const CreateUserSchema = z.object({
 *   name: z.string().min(3),
 *   email: z.string().email(),
 *   role: z.enum(['admin', 'user']),
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
export function TypedBody<T>(schema: ZodType<T, ZodTypeDef, any>) {
  // Generate OpenAPI schema
  const openApiSchema = generateSchema(schema) as SchemaObject;

  // Format Name
  const schemaName = openApiSchema.title || `Body_${Date.now()}`;

  // Register all nested schemas recursively
  function registerNestedSchemas(schema: SchemaObject) {
    if (schema.title) {
      registerSchema(schema.title, schema, 'Body');
    }

    // Handle nested objects
    if (schema.properties) {
      Object.values(schema.properties).forEach(prop => {
        if (typeof prop === 'object' && !('$ref' in prop)) {
          registerNestedSchemas(prop as SchemaObject);
        }
      });
    }

    // Handle arrays
    if (schema.items && typeof schema.items === 'object' && !('$ref' in schema.items)) {
      registerNestedSchemas(schema.items as SchemaObject);
    }
  }

  registerNestedSchemas(openApiSchema);

  // Register the main schema and get the reference
  const refSchema = registerSchema(schemaName, openApiSchema, 'Body');

  // Create our base ApiBody decorator first
  const baseDecorator = ApiBody({
    required: true,
    schema: refSchema,
    description: openApiSchema.description,
  });

  // Create parameter decorator for validation
  const paramDecorator = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const contentType = request.headers['content-type'];

    if (!isApplicationJson(contentType)) {
      throw new BadRequestException('Content-Type must be application/json');
    }

    try {
      return schema.parse(request.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ZodValidationException(err);
      }
      throw err;
    }
  });

  // Return a decorator that applies our base ApiBody first (so manual decorators take precedence)
  return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
    baseDecorator(target.constructor, propertyKey, {
      value: target.constructor.prototype[propertyKey],
      writable: true,
      enumerable: true,
      configurable: true,
    });
    return paramDecorator()(target, propertyKey, parameterIndex);
  };
}

/**
 * Type-safe form-urlencoded body decorator that validates request body using Zod schemas.
 * Automatically generates OpenAPI documentation from the schema.
 * Expects application/x-www-form-urlencoded content type.
 *
 * @param schema - Zod schema for validation
 *
 * @example
 * ```typescript
 * const CreateArticleSchema = z.object({
 *   title: z.string().min(3),
 *   content: z.string(),
 *   tags: z.array(z.string()),
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
export function TypedFormBody<T>(schema: ZodType<T, ZodTypeDef, any>) {
  // Generate OpenAPI schema
  const openApiSchema = generateSchema(schema) as SchemaObject;

  // Format Name
  const schemaName = openApiSchema.title || `FormBody_${Date.now()}`;

  // Register all nested schemas recursively
  function registerNestedSchemas(schema: SchemaObject) {
    if (schema.title) {
      registerSchema(schema.title, schema, 'Body');
    }

    // Handle nested objects
    if (schema.properties) {
      Object.values(schema.properties).forEach(prop => {
        if (typeof prop === 'object' && !('$ref' in prop)) {
          registerNestedSchemas(prop as SchemaObject);
        }
      });
    }

    // Handle arrays
    if (schema.items && typeof schema.items === 'object' && !('$ref' in schema.items)) {
      registerNestedSchemas(schema.items as SchemaObject);
    }
  }

  registerNestedSchemas(openApiSchema);

  // Register the main schema and get the reference
  const refSchema = registerSchema(schemaName, openApiSchema, 'Body');

  // Create our base ApiBody decorator first
  const baseDecorator = ApiBody({
    required: true,
    schema: refSchema,
    description: openApiSchema.description,
    type: 'object',
  });

  // Create parameter decorator for validation
  const paramDecorator = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const contentType = request.headers['content-type'];

    if (!isFormUrlEncoded(contentType)) {
      throw new BadRequestException('Content-Type must be application/x-www-form-urlencoded');
    }

    // Convert URLSearchParams to object
    const formData = new URLSearchParams(request.body);
    const data = Object.fromEntries(formData);
    try {
      return schema.parse(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ZodValidationException(err);
      }
      throw err;
    }
  });

  // Return a decorator that applies our base ApiBody first (so manual decorators take precedence)
  return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
    baseDecorator(target.constructor, propertyKey, {
      value: target.constructor.prototype[propertyKey],
      writable: true,
      enumerable: true,
      configurable: true,
    });
    return paramDecorator()(target, propertyKey, parameterIndex);
  };
}
