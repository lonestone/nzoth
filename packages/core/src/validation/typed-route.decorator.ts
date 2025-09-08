import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import type { ApiResponseOptions } from '@nestjs/swagger'
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'
import type { ZodType } from 'zod'
import { applyDecorators, Delete, Get, Patch, Post, Put, UseInterceptors } from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'
import { getOpenApiSchema } from '../openapi/openapi.js'
import { registerSchemaRef } from '../openapi/openapi.js'
import { ZodSerializationException } from './validation.exception'
import { Observable } from 'rxjs'

/**
 * Interceptor that validates response data against a Zod schema
 */
class TypedRouteInterceptor implements NestInterceptor {
    constructor(private readonly schema: ZodType<any, any>) { }
  
    intercept(_: ExecutionContext, next: CallHandler) {
      return new Observable(observer => {
        next.handle().subscribe({
          next: value => {
            const result = this.schema.safeParse(value);
            if (!result.success) {
              observer.error(new ZodSerializationException(result.error));
            } else {
              observer.next(result.data);
            }
          },
          error: err => observer.error(err),
          complete: () => observer.complete(),
        });
      });
    }
  }

const ROUTERS = {
  Get,
  Post,
  Put,
  Patch,
  Delete,
} as const

// Store pending route metadata that needs controller parameters
export const PENDING_ROUTE_METADATA = new Map<
  string,
  Array<{
    target: any
    propertyKey: string | symbol
    descriptor: PropertyDescriptor
    path?: string | string[]
    schema?: ZodType<any, any>
    options?: ApiResponseOptions
    method: keyof typeof ROUTERS
  }>
>()

/**
 * Apply controller parameters to a route after controller is processed
 *
 * @see https://lonestone.github.io/nzoth/core/validation/
 *
 * @example
 * ```typescript
 * const UserSchema = z.object({
 *   id: z.string().uuid(),
 *   name: z.string(),
 *   email: z.string().email(),
 * })
 *
 * @TypedController('users')
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
export function applyControllerParamsToRoute(
  target: any,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
  path?: string | string[],
  schema?: ZodType<any, any>,
  options?: ApiResponseOptions,
  method?: keyof typeof ROUTERS,
) {
  // This will be called by TypedController after it processes controller params
  // For now, just apply a simple route without controller params - this will be enhanced
  if (!schema) {
    if (method) {
      ROUTERS[method](path)(target, propertyKey, descriptor)
    }
    return
  }

  // Apply the full route with schema validation
  const openApiSchema = getOpenApiSchema(schema)
  const schemaName
    = openApiSchema.title || `${method}_${(path || 'default').toString().replace(/[:/]/g, '_')}`

  function registerNestedSchemas(schema: SchemaObject, originalZodSchema?: ZodType<any>) {
    // Check if the schema has an id in metadata and use it for registration
    const schemaId = (originalZodSchema as any)?._def?.openapi?.id || schema.title
    
    if (schemaId) {
      registerSchemaRef(schemaId, schema, 'Route')
    }

    if (schema.properties) {
      Object.values(schema.properties).forEach((prop) => {
        if (typeof prop === 'object' && !('$ref' in prop)) {
          registerNestedSchemas(prop as SchemaObject)
        }
      })
    }

    if (schema.items && typeof schema.items === 'object' && !('$ref' in schema.items)) {
      registerNestedSchemas(schema.items as SchemaObject)
    }
  }

  registerNestedSchemas(openApiSchema, schema)
  const refSchema = registerSchemaRef(schemaName, openApiSchema, 'Route')

  const baseDecorator = ApiResponse({
    status: 200,
    description: openApiSchema.description || 'Successful response',
    schema: refSchema,
    ...options,
  })

  if (method) {
    applyDecorators(
      baseDecorator,
      ROUTERS[method](path),
      UseInterceptors(new TypedRouteInterceptor(schema)),
    )(target, propertyKey, descriptor)
  }
}

/**
 * Type-safe route decorators that validate response data using Zod schemas.
 * Automatically generates OpenAPI documentation from the schema.
 */
function createRouteDecorator(method: keyof typeof ROUTERS) {
  return function route<T>(
    path?: string | string[],
    schema?: ZodType<T, any>,
    options?: ApiResponseOptions,
  ): MethodDecorator {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
      // Store route metadata for later processing by TypedController
      const controllerName = target.constructor.name
      if (!PENDING_ROUTE_METADATA.has(controllerName)) {
        PENDING_ROUTE_METADATA.set(controllerName, [])
      }

      PENDING_ROUTE_METADATA.get(controllerName)!.push({
        target,
        propertyKey,
        descriptor,
        path,
        schema,
        options,
        method,
      })

      // Apply basic route decorator for now - will be enhanced by TypedController
      if (!schema) {
        ROUTERS[method](path)(target, propertyKey, descriptor)
        return
      }

      // Generate schema and register all nested schemas
      const openApiSchema = getOpenApiSchema(schema)
      const schemaName
        = openApiSchema.title || `${method}_${(path || 'default').toString().replace(/[:/]/g, '_')}`

      function registerNestedSchemas(schema: SchemaObject, originalZodSchema?: ZodType<any>) {
        // Check if the schema has an id in metadata and use it for registration
        const schemaId = (originalZodSchema as any)?._def?.openapi?.id || schema.title
        
        if (schemaId) {
          registerSchemaRef(schemaId, schema, 'Route')
        }

        if (schema.properties) {
          Object.values(schema.properties).forEach((prop) => {
            if (typeof prop === 'object' && !('$ref' in prop)) {
              registerNestedSchemas(prop as SchemaObject)
            }
          })
        }

        if (schema.items && typeof schema.items === 'object' && !('$ref' in schema.items)) {
          registerNestedSchemas(schema.items as SchemaObject)
        }
      }

      registerNestedSchemas(openApiSchema, schema)
      const refSchema = registerSchemaRef(schemaName, openApiSchema, 'Route')

      const baseDecorator = ApiResponse({
        status: 200,
        description: openApiSchema.description || 'Successful response',
        schema: refSchema,
        ...options,
      })

      // Apply base decorators for now
      applyDecorators(
        baseDecorator,
        ROUTERS[method](path),
        UseInterceptors(new TypedRouteInterceptor(schema)),
      )(target, propertyKey, descriptor)
    }
  }
}

export const TypedRoute = {
  Get: createRouteDecorator('Get'),
  Post: createRouteDecorator('Post'),
  Put: createRouteDecorator('Put'),
  Patch: createRouteDecorator('Patch'),
  Delete: createRouteDecorator('Delete'),
} as const
