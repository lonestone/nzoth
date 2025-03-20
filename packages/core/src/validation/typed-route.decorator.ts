import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import type { ZodType, ZodTypeDef } from 'zod';
import { generateSchema } from '@anatine/zod-openapi';
import { applyDecorators, Delete, Get, Patch, Post, Put, UseInterceptors } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { map } from 'rxjs/operators';
import { ZodSerializationException } from './validation.exception';
import { registerSchema } from '../validation/typed-schema';
/**
 * Interceptor that validates response data against a Zod schema
 */
class TypedRouteInterceptor implements NestInterceptor {
  constructor(private readonly schema: ZodType<any, ZodTypeDef, any>) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map(value => {
        const result = this.schema.safeParse(value);
        if (!result.success) {
          throw new ZodSerializationException(result.error);
        }
        return result.data;
      }),
    );
  }
}

const ROUTERS = {
  Get,
  Post,
  Put,
  Patch,
  Delete,
} as const;

/**
 * Type-safe route decorators that validate response data using Zod schemas.
 * Automatically generates OpenAPI documentation from the schema.
 *
 * @example
 * ```typescript
 * const UserSchema = z.object({
 *   id: z.string().uuid(),
 *   name: z.string(),
 *   email: z.string().email(),
 * })
 *
 * @Controller('users')
 * class UserController {
 *   @TypedRoute.Get(undefined, UserSchema)
 *   findAll(): Promise<z.infer<typeof UserSchema>[]> {
 *     return this.userService.findAll()
 *   }
 *
 *   // You can override the generated OpenAPI documentation by using @ApiResponse before the method
 *   @ApiResponse({
 *     status: 200,
 *     description: 'Custom description',
 *     content: {
 *       'application/json': {
 *         examples: {
 *           user: { value: { id: '123', name: 'John', email: 'john@example.com' } }
 *         }
 *       }
 *     }
 *   })
 *   @TypedRoute.Get(':id', UserSchema)
 *   findOne(@TypedParam('id', 'uuid') id: string): Promise<z.infer<typeof UserSchema>> {
 *     return this.userService.findOne(id)
 *   }
 * }
 */

function createRouteDecorator(method: keyof typeof ROUTERS) {
  return function route<T>(
    path?: string | string[],
    schema?: ZodType<T, ZodTypeDef, any>,
  ): MethodDecorator {
    if (!schema) {
      return ROUTERS[method](path);
    }

    // Generate schema and register all nested schemas
    const openApiSchema = generateSchema(schema) as SchemaObject;

    // Format Name
    const schemaName =
      openApiSchema.title || `${method}_${(path || 'default').toString().replace(/[:/]/g, '_')}`;

    // Register all nested schemas recursively
    function registerNestedSchemas(schema: SchemaObject) {
      if (schema.title) {
        registerSchema(schema.title, schema, 'Route');
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
    const refSchema = registerSchema(schemaName, openApiSchema, 'Route');

    // Generate OpenAPI schema
    const baseDecorator = ApiResponse({
      status: 200,
      description: openApiSchema.description || 'Successful response',
      schema: refSchema,
    });

    // Apply the base decorator first, to ensure manually applied decorators will take precedence
    // Then apply the route method and interceptor
    return applyDecorators(
      baseDecorator,
      ROUTERS[method](path),
      UseInterceptors(new TypedRouteInterceptor(schema)),
    );
  };
}

export const TypedRoute = {
  Get: createRouteDecorator('Get'),
  Post: createRouteDecorator('Post'),
  Put: createRouteDecorator('Put'),
  Patch: createRouteDecorator('Patch'),
  Delete: createRouteDecorator('Delete'),
} as const;
