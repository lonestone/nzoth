import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'
import type { ZodType } from 'zod'
import { extendApi as anatineExtendApi, extendApi, generateSchema } from '@anatine/zod-openapi'

// Type pour schéma Zod avec .openapi()
type ZodWithOpenApi<T extends ZodType> = T & {
  openapi: (metadata?: Record<string, any>) => T
}

/**
 * Fonction pour ajouter .openapi() à un schéma Zod
 */
function addOpenApiMethod<T extends ZodType>(schema: T): ZodWithOpenApi<T> {
  const enhancedSchema = schema as ZodWithOpenApi<T>

  if (!Object.prototype.hasOwnProperty.call(enhancedSchema, 'openapi')) {
    Object.defineProperty(enhancedSchema, 'openapi', {
      value(metadata: Record<string, any> = {}) {
        return anatineExtendApi(this, metadata)
      },
      configurable: true,
      writable: true,
      enumerable: false,
    })
  }

  return enhancedSchema
}

/**
 * Convertit un schéma Zod en schéma OpenAPI
 */
export function toOpenApi<T>(schema: ZodType<T>): SchemaObject {
  return generateSchema(schema) as SchemaObject
}

/**
 * Utilitaire pour ajouter .openapi() à n'importe quel schéma Zod
 */
export function withOpenApi<T extends ZodType>(
  schema: T,
  metadata?: Record<string, any>,
): ZodWithOpenApi<T> {
  const enhanced = addOpenApiMethod(schema)

  if (metadata) {
    return enhanced.openapi(metadata) as ZodWithOpenApi<T>
  }

  return enhanced
}

// Pour la compatibilité avec le code existant
export function zodToOpenApi<T>(schema: ZodType<T>, options?: Record<string, any>): SchemaObject {
  if (options) {
    schema = extendApi(schema, options)
  }
  return toOpenApi(schema)
}

/*
  Other way to overload zod with openapi and keep original z
/*

// // Types pour les méthodes de Zod
// type ZodTypeFunction = (...args: any[]) => ZodType;

// // Type pour transformer les méthodes qui retournent un ZodType
// type TransformZodMethod<T> = T extends ZodTypeFunction
//   ? (...args: Parameters<T>) => ZodWithOpenApi<ReturnType<T>>
//   : T;

// // Type pour transformer toutes les méthodes de Zod
// type ZodOpenApiMethods = {
//   [K in keyof typeof z]: TransformZodMethod<typeof z[K]>
// } & {
//   openapi: <T extends ZodType>(schema: T, metadata?: Record<string, any>) => ZodWithOpenApi<T>;
//   toOpenApi: <T>(schema: ZodType<T>) => SchemaObject;
// };

// /**
//  * Version dynamique de zOpenApi qui expose une API type-safe et supporte automatiquement toutes les méthodes de Zod
//  */
// export const zOpenApi = new Proxy(z, {
//   get(target, prop) {
//     if (prop === 'openapi') {
//       return <T extends ZodType>(schema: T, metadata?: Record<string, any>) => {
//         const enhanced = addOpenApiMethod(schema);
//         if (metadata) {
//           return enhanced.openapi(metadata);
//         }
//         return enhanced;
//       };
//     }

//     if (prop === 'toOpenApi') {
//       return <T>(schema: ZodType<T>): SchemaObject => {
//         return generateSchema(schema) as SchemaObject;
//       };
//     }

//     const originalMethod = target[prop as keyof typeof target];
//     if (typeof originalMethod === 'function') {
//       return (...args: any[]) => {
//         const result = originalMethod.apply(target, args);
//         if (result instanceof ZodType) {
//           return addOpenApiMethod(result);
//         }
//         return result;
//       };
//     }

//     return originalMethod;
//   }
// }) as unknown as ZodOpenApiMethods;
