import { createRequestLocal } from "@/app/lib/request-local";

import {
  decodeVariantsFromParam as decodeVariantsFromParamUncached,
  type AssignedVariants,
} from "./core";
import { lazyCache } from "./lazy-cache";

export { type Variant, type AssignedVariants } from "./core";

export const decodeVariantsFromParamCached = lazyCache(
  decodeVariantsFromParamUncached,
);

const variantsFromParamsLocal = createRequestLocal<AssignedVariants>();

export function provideVariants(param: string) {
  const parsed = decodeVariantsFromParamCached(param);
  variantsFromParamsLocal().set(parsed);
  return parsed;
}

export function getVariants() {
  // TODO: maybe use variantsFromParamsLocal().peek(),
  // which'll only be set if we're including the /[variants]/ layout,
  // which'll always be the case for static pages
  return variantsFromParamsLocal().get();
}
