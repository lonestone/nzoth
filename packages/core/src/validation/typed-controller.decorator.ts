import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import type { ZodType, ZodTypeDef } from 'zod';
import { generateSchema } from '@anatine/zod-openapi';
import { applyDecorators, Controller } from '@nestjs/common';
import { ApiTags, ApiParam } from '@nestjs/swagger';
import { z } from 'zod';
import { registerSchema } from './typed-schema';
import { PENDING_ROUTE_METADATA } from './typed-route.decorator';

// Interface to define controller parameter metadata
export interface ControllerParamMetadata {
  name: string;
  schema: ZodType<any, ZodTypeDef, any>;
  openApiSchema: SchemaObject;
}

// Global storage for controller parameters
export const CONTROLLER_PARAMS_STORAGE = new Map<string, ControllerParamMetadata[]>();

/**
 * Generate OpenAPI schema with proper format information based on Zod schema
 */
function generateOpenApiSchemaWithFormat(schema: ZodType<any, ZodTypeDef, any>): SchemaObject {
  // Use the standard generateSchema function from @anatine/zod-openapi
  const openApiSchema = generateSchema(schema) as SchemaObject;

  // Fix the type format if it's an array with single element (common issue)
  if (openApiSchema.type && Array.isArray(openApiSchema.type) && openApiSchema.type.length === 1) {
    openApiSchema.type = openApiSchema.type[0];
  }

  return openApiSchema;
}

/**
 * Extract parameter names from a route path
 * @param path - The route path (e.g., 'users/:id/posts/:postId')
 * @returns Array of parameter names (e.g., ['id', 'postId'])
 */
export function extractParamNames(path: string): string[] {
  const paramRegex = /:([^/]+)/g;
  const params: string[] = [];
  let match;

  while ((match = paramRegex.exec(path)) !== null) {
    params.push(match[1]);
  }

  return params;
}

/**
 * Extract individual parameter schema from a Zod schema object
 * @param paramsSchema - The Zod schema object containing parameter definitions
 * @param paramName - The parameter name to extract
 * @returns The extracted schema for the parameter, or z.string() as fallback
 */
function extractParameterSchema(
  paramsSchema: ZodType<any, ZodTypeDef, any> | undefined,
  paramName: string,
): ZodType<any, ZodTypeDef, any> {
  if (!paramsSchema) {
    return z.string();
  }

  try {
    // Extract the individual parameter schema from the object schema
    // The shape is a function in newer versions of Zod, need to call it
    let schemaShape;

    // Method 1: Try calling _def.shape() as a function
    if (typeof (paramsSchema as any)._def?.shape === 'function') {
      schemaShape = (paramsSchema as any)._def.shape();
    }
    // Method 2: Try _def.shape as a property (older versions)
    else if ((paramsSchema as any)._def?.shape) {
      schemaShape = (paramsSchema as any)._def.shape;
    }
    // Method 3: Try .shape property directly
    else if ((paramsSchema as any).shape) {
      schemaShape = (paramsSchema as any).shape;
    }

    if (schemaShape && schemaShape[paramName]) {
      return schemaShape[paramName];
    } else {
      // Fallback to string schema
      return z.string();
    }
  } catch (e) {
    // If we can't extract the schema, use string as fallback
    return z.string();
  }
}

/**
 * Get controller parameters for a given controller class
 * @param controllerClass - The controller class
 * @returns Array of controller parameter metadata
 */
export function getControllerParams(controllerClass: any): ControllerParamMetadata[] {
  const className = controllerClass.name;
  return CONTROLLER_PARAMS_STORAGE.get(className) || [];
}

/**
 * Apply controller parameters to pending routes
 */
function applyControllerParametersToRoutes(
  controllerName: string,
  controllerParams: ControllerParamMetadata[],
) {
  const pendingRoutes = PENDING_ROUTE_METADATA.get(controllerName);
  if (!pendingRoutes) return;

  pendingRoutes.forEach(route => {
    const decorators: any[] = [];

    // Add controller parameters
    controllerParams.forEach(param => {
      decorators.push(
        ApiParam({
          name: param.name,
          required: true,
          schema: param.openApiSchema,
        }),
      );
    });

    // Add route-specific parameters
    if (route.path) {
      const routeParams = extractParamNames(route.path.toString());

      routeParams.forEach(paramName => {
        // Only add if not already covered by controller params
        if (!controllerParams.some(cp => cp.name === paramName)) {
          decorators.push(
            ApiParam({
              name: paramName,
              required: true,
              schema: { type: 'string' },
            }),
          );
        }
      });
    }

    // Apply the parameter decorators to the route
    decorators.forEach(decorator => {
      decorator(route.target.constructor, route.propertyKey, {
        value: route.target.constructor.prototype[route.propertyKey],
        writable: true,
        enumerable: true,
        configurable: true,
      });
    });
  });

  // Clear processed routes
  PENDING_ROUTE_METADATA.delete(controllerName);
}

/**
 * Type-safe controller decorator that registers route parameters at the controller level
 * and automatically makes them available to nested routes.
 */
export function TypedController<T extends Record<string, any> = any>(
  path: string,
  paramsSchema?: ZodType<T, ZodTypeDef, any>,
  options?: {
    tags?: string[];
    description?: string;
  },
): ClassDecorator {
  return function (target: any) {
    const paramNames = extractParamNames(path);

    const controllerParams: ControllerParamMetadata[] = [];

    // Create parameter metadata for each path parameter
    paramNames.forEach(paramName => {
      const paramSchema = extractParameterSchema(paramsSchema, paramName);

      // Generate OpenAPI schema using the extracted schema
      const openApiSchema = generateOpenApiSchemaWithFormat(paramSchema);

      // Register the parameter schema
      const schemaName = `${target.name}_${paramName}`;
      registerSchema(schemaName, openApiSchema, 'Other');

      controllerParams.push({
        name: paramName,
        schema: paramSchema,
        openApiSchema,
      });
    });

    // Store the controller parameters for later use
    CONTROLLER_PARAMS_STORAGE.set(target.name, controllerParams);

    // Process any pending routes for this controller
    applyControllerParametersToRoutes(target.name, controllerParams);

    // Extract controller name from path for tags
    const controllerName = path.split('/')[0] || target.name.replace('Controller', '');

    // Create decorators to apply
    const decorators = [Controller(path)];

    // Add API tags if specified or use default
    if (options?.tags || controllerName) {
      decorators.push(ApiTags(...(options?.tags || [controllerName])));
    }

    // Apply all decorators
    applyDecorators(...decorators)(target);

    return target;
  };
}
