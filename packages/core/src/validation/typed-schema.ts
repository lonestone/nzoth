import { type OpenAPIObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import type { SchemaObject, ReferenceObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

// Define schema types
export type SchemaType = 'Body' | 'Query' | 'Route' | 'Other';

// Organize schemas by type
export const SCHEMA_STORAGE: Record<SchemaType, Map<string, SchemaObject>> = {
  Body: new Map<string, SchemaObject>(),
  Query: new Map<string, SchemaObject>(),
  Route: new Map<string, SchemaObject>(),
  Other: new Map<string, SchemaObject>(),
};

export function registerSchema(
  name: string,
  schema: SchemaObject,
  type: SchemaType = 'Other'
): ReferenceObject {
  // Clean up the schema by removing any nested definitions that should be references
  function cleanupSchema(obj: SchemaObject): SchemaObject {
    const cleaned = { ...obj };
    
    if (obj.title && obj.title !== name) {
      // If this is a named schema that isn't the root schema,
      // register it separately and return a reference
      SCHEMA_STORAGE.Other.set(obj.title, obj);
      return {
        $ref: `#/components/schemas/${obj.title}`,
      } as SchemaObject;
    }

    if (obj.properties) {
      cleaned.properties = Object.entries(obj.properties).reduce((acc, [key, value]) => {
        if (typeof value === 'object' && !('$ref' in value)) {
          acc[key] = cleanupSchema(value as SchemaObject);
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, SchemaObject | ReferenceObject>);
    }

    if (obj.items && typeof obj.items === 'object' && !('$ref' in obj.items)) {
      cleaned.items = cleanupSchema(obj.items as SchemaObject);
    }

    return cleaned;
  }

  const cleanedSchema = cleanupSchema(schema);
  
  // Store the schema in the appropriate type map
  SCHEMA_STORAGE[type].set(name, cleanedSchema);

  return {
    $ref: `#/components/schemas/${name}`,
  } as ReferenceObject;
}

export function addSchemasToSwagger(document: OpenAPIObject) {
  document.components = document.components || {};
  document.components.schemas = document.components.schemas || {};

  // Add schemas from all types
  Object.values(SCHEMA_STORAGE).forEach(typeMap => {
    for (const [name, schema] of typeMap.entries()) {
      if (document.components && document.components.schemas) {
        document.components.schemas[name] = schema;
      }
    }
  });
}