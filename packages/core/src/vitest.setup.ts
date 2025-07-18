import { extendApi as anatineExtendApi } from '@anatine/zod-openapi'
import { ZodType } from 'zod'
/**
 * ⚠️ WARNING: This code augments the Zod module by adding a .openapi() method to all Zod types.
 * This is a global modification that affects all Zod instances in your application.
 * See the module declaration below for the implementation details.
 *
 * @see {@link https://github.com/colinhacks/zod#module-augmentation Module Augmentation in Zod}
 */

// Add openapi method to ZodType prototype
ZodType.prototype.openapi = function (metadata = {}) {
  return anatineExtendApi(this, metadata as any)
}
