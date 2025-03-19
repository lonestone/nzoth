import type { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import {
  generateSchema,
  extendApi as anatineExtendApi,
} from "@anatine/zod-openapi";
import { ZodType } from "zod";

// Type pour schéma Zod avec .openapi()
type ZodWithOpenApi<T extends ZodType> = T & {
  openapi: (metadata?: Record<string, any>) => T;
};

/**
 * Fonction pour ajouter .openapi() à un schéma Zod
 */
function addOpenApiMethod<T extends ZodType>(schema: T): ZodWithOpenApi<T> {
  const enhancedSchema = schema as ZodWithOpenApi<T>;
  
  if (!enhancedSchema.hasOwnProperty('openapi')) {
    Object.defineProperty(enhancedSchema, 'openapi', {
      value: function(metadata: Record<string, any> = {}) {
        return anatineExtendApi(this, metadata);
      },
      configurable: true,
      writable: true,
      enumerable: false
    });
  }
  
  return enhancedSchema;
}
declare module "zod" {
  interface ZodType {
    openapi(metadata?: {
      title?: string;
      description?: string;
      example?: any;
      [key: string]: any;
    }): this;
  }
}

// Add openapi method to ZodType prototype
ZodType.prototype.openapi = function (metadata = {}) {
  return anatineExtendApi(this, metadata);
};
/**
 * Convertit un schéma Zod en schéma OpenAPI
 */
export function toOpenApi<T>(schema: ZodType<T>): SchemaObject {
  return generateSchema(schema) as SchemaObject;
}

/**
 * Étend un schéma Zod avec des métadonnées OpenAPI
 */
export function extendApi<T extends ZodType>(
  schema: T,
  metadata: Record<string, any>
): T {
  return anatineExtendApi(schema, metadata);
}

/**
 * Utilitaire pour ajouter .openapi() à n'importe quel schéma Zod
 */
export function withOpenApi<T extends ZodType>(schema: T, metadata?: Record<string, any>): ZodWithOpenApi<T> {
  const enhanced = addOpenApiMethod(schema);
  
  if (metadata) {
    return enhanced.openapi(metadata) as ZodWithOpenApi<T>;
  }
  
  return enhanced;
}

// Pour la compatibilité avec le code existant
export function zodToOpenApi<T>(
  schema: ZodType<T>,
  options?: Record<string, any>
): SchemaObject {
  if (options) {
    schema = extendApi(schema, options);
  }
  return toOpenApi(schema);
}
