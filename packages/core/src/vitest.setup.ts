import { ZodType } from 'zod';
import { extendApi as anatineExtendApi } from '@anatine/zod-openapi';
/**
 * ⚠️ WARNING: This code augments the Zod module by adding a .openapi() method to all Zod types.
 * This is a global modification that affects all Zod instances in your application.
 * See the module declaration below for the implementation details.
 *
 * @see {@link https://github.com/colinhacks/zod#module-augmentation Module Augmentation in Zod}
 */
declare module 'zod' {
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

