import type {
  OpenAPIObject,
  ReferenceObject,
  SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'
import type { ZodType } from 'zod'
import { INestApplication } from '@nestjs/common'
import { SwaggerModule } from '@nestjs/swagger'
import { createDocument, createSchema, CreateDocumentOptions } from 'zod-openapi'

// Define schema types
export type SchemaType = 'Body' | 'Query' | 'Route' | 'Form' | 'Other'

// Organize schemas by type
export const SCHEMA_STORAGE: Record<SchemaType, Map<string, SchemaObject>> = {
  Body: new Map<string, SchemaObject>(),
  Query: new Map<string, SchemaObject>(),
  Route: new Map<string, SchemaObject>(),
  Form: new Map<string, SchemaObject>(),
  Other: new Map<string, SchemaObject>(),
}

// Global registry for all schemas used in the application
export const GLOBAL_SCHEMA_REGISTRY = new Map<string, SchemaObject>()

// Cache OpenAPI schema conversion per Zod schema instance to avoid repeated work
const OPENAPI_CACHE = new WeakMap<ZodType<any>, {
  schema: SchemaObject,
  components?: { schemas?: Record<string, SchemaObject> }
}>()


/**
 * Converts a Zod schema to OpenAPI schema object and registers it in the schema storage
 *
 * @see https://lonestone.github.io/nzoth/core/openapi/
 */
export function getOpenApiSchema<T>(schema: ZodType<T>): SchemaObject {
  const cached = OPENAPI_CACHE.get(schema)
  if (cached) {
    const cachedSchema = cached.schema
    const cachedSchemaId = (schema as any)._def?.openapi?.id || cachedSchema.title

    // Ensure registries are populated even on cache hits (useful in tests/hot-reload)
    if (cachedSchemaId) {
      SCHEMA_STORAGE.Other.set(cachedSchemaId, cachedSchema)
      GLOBAL_SCHEMA_REGISTRY.set(cachedSchemaId, cachedSchema)
    }

    if (cached.components?.schemas) {
      Object.entries(cached.components.schemas).forEach(([name, s]) => {
        SCHEMA_STORAGE.Other.set(name, s as SchemaObject)
      })
    }

    return cachedSchema
  }

  const result = createSchema(schema)
  const schemaObject = result.schema as SchemaObject

  const schemaId = (schema as any)._def?.openapi?.id || schemaObject.title
  if (schemaId) {
    SCHEMA_STORAGE.Other.set(schemaId, schemaObject)
    GLOBAL_SCHEMA_REGISTRY.set(schemaId, schemaObject)
  }

  if (result.components?.schemas) {
    Object.entries(result.components.schemas).forEach(([name, s]) => {
      SCHEMA_STORAGE.Other.set(name, s as SchemaObject)
    })
  }

  OPENAPI_CACHE.set(schema, {
    schema: schemaObject,
    components: result.components as any,
  })

  return schemaObject
}

/**
 * Adds all registered schemas to the Swagger document
 */
export function createOpenApiDocument(app: INestApplication, swaggerConfig: Omit<OpenAPIObject, "paths">, zodOpenApiConfig?: CreateDocumentOptions) {
  const document = SwaggerModule.createDocument(app, swaggerConfig)

  document.components = document.components || {}
  document.components.schemas = document.components.schemas || {}

  // Add schemas from all types
  Object.values(SCHEMA_STORAGE).forEach((typeMap) => {
    for (const [name, schema] of typeMap.entries()) {
      if (document.components && document.components.schemas) {
        document.components.schemas[name] = schema
      }
    }
  })
  
  // Also add schemas from global registry
  for (const [name, schema] of GLOBAL_SCHEMA_REGISTRY.entries()) {
    if (document.components && document.components.schemas) {
      document.components.schemas[name] = schema
    }
  }

  return createDocument(document as any, zodOpenApiConfig)
}



/**
 * Registers an OpenAPI SchemaObject into the registry and returns a $ref.
 * Formerly named registerSchema; renamed to clarify that it expects an OpenAPI schema.
 */
export function registerSchemaRef(
  name: string,
  schema: SchemaObject,
  type: SchemaType = 'Other',
): ReferenceObject {
  // Clean up the schema by removing any nested definitions that should be references
  function cleanupSchema(obj: SchemaObject): SchemaObject {
    const cleaned = { ...obj }

    if (obj.title && obj.title !== name) {
      // If this is a named schema that isn't the root schema,
      // register it separately and return a reference
      SCHEMA_STORAGE.Other.set(obj.title, obj)
      GLOBAL_SCHEMA_REGISTRY.set(obj.title, obj)
      return {
        $ref: `#/components/schemas/${obj.title}`,
      } as SchemaObject
    }
    
    // Check if the schema has an id in metadata that should be used for reference
    if ((obj as any)._def?.openapi?.id && (obj as any)._def.openapi.id !== name) {
      const schemaId = (obj as any)._def.openapi.id
      // Register it separately and return a reference
      SCHEMA_STORAGE.Other.set(schemaId, obj)
      GLOBAL_SCHEMA_REGISTRY.set(schemaId, obj)
      return {
        $ref: `#/components/schemas/${schemaId}`,
      } as SchemaObject
    }

    if (obj.properties) {
      cleaned.properties = Object.entries(obj.properties).reduce(
        (acc, [key, value]) => {
          if (typeof value === 'object' && !('$ref' in value)) {
            acc[key] = cleanupSchema(value as SchemaObject)
          }
          else {
            acc[key] = value
          }
          return acc
        },
        {} as Record<string, SchemaObject | ReferenceObject>,
      )
    }

    if (obj.items && typeof obj.items === 'object' && !('$ref' in obj.items)) {
      cleaned.items = cleanupSchema(obj.items as SchemaObject)
    }

    return cleaned
  }

  const cleanedSchema = cleanupSchema(schema)

  // Store the schema in the appropriate type map
  SCHEMA_STORAGE[type].set(name, cleanedSchema)
  
  // Also store in global registry
  GLOBAL_SCHEMA_REGISTRY.set(name, cleanedSchema)

  return {
    $ref: `#/components/schemas/${name}`,
  } as ReferenceObject
}

/**
 * Automatically registers a Zod schema and returns its OpenAPI representation
 * This is the main function that should be used by decorators
 */
export function autoRegisterSchema<T>(
  schema: any,
  type: SchemaType = 'Other'
): SchemaObject {
  // Generate OpenAPI schema
  const openApiSchema = getOpenApiSchema(schema)
  
  // If the schema has a title, register it automatically
  if (openApiSchema.title) {
    registerSchemaRef(openApiSchema.title, openApiSchema, type)
  }
  
  return openApiSchema
}

/**
 * Registers a Zod schema into the OpenAPI registry.
 * This is a clearer, explicit function to persist schemas rather than relying on
 * getOpenApiSchema side-effects. It returns a $ref when a stable id/title exists.
 */
export function registerSchema<T>(
  schema: ZodType<T>,
  type: SchemaType = 'Other',
): ReferenceObject | undefined {
  const openApiSchema = getOpenApiSchema(schema)
  const schemaId = (schema as any)._def?.openapi?.id || openApiSchema.title

  if (schemaId) {
    return registerSchemaRef(schemaId, openApiSchema, type)
  }

  return undefined
}