import { ZodType } from 'zod';
import { extendApi as anatineExtendApi } from '@anatine/zod-openapi';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface.js';

/**
 * ⚠️ WARNING: This code augments the Zod module by adding a .openapi() method to all Zod types.
 * This is a global modification that affects all Zod instances in your application.
 * See the module declaration below for the implementation details.
 *
 * @see {@link https://github.com/colinhacks/zod#module-augmentation Module Augmentation in Zod}
 */
declare module 'zod' {
  interface ZodType {
    openapi(metadata?: SchemaObject): this;
  }
}

// Add openapi method to ZodType prototype
ZodType.prototype.openapi = function (metadata = {}) {
  return anatineExtendApi(this, metadata as any);
};

export * from './crud/get.contract.js';
export * from './filtering/filtering.decorator.js';
export * from './filtering/filtering.js';
export * from './pagination/pagination.decorator.js';
export * from './pagination/pagination.js';
export * from './sorting/sorting.decorator.js';
export * from './sorting/sorting.js';
export * from './validation/typed-body.decorator.js';
export * from './validation/typed-controller.decorator.js';
export * from './validation/typed-param.decorator.js';
export * from './validation/typed-query.decorator.js';
export * from './validation/typed-route.decorator.js';
export {
  ZodSerializationExceptionFilter,
  ZodValidationExceptionFilter,
} from './validation/validation.exception.filter';
export * from './validation/validation.pipe.js';
export * from './validation/typed-schema.js';
export { toOpenApi, zodToOpenApi } from './utils/openapi.js';
