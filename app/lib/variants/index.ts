import { cache } from "react";
import { createRequestLocal } from "@/app/lib/request-local";
import {
  decodeVariantsFromParam as decodeVariantsFromParamUncached,
  type AssignedVariants,
} from "./core";
import { headers } from "next/headers";

export { type Variant, type AssignedVariants } from "./core";

const decodeVariantsFromParamCached = cache(decodeVariantsFromParamUncached);

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

export async function getVariant(id: string) {
  const activeVariants = await getVariants();
  if (!(id in activeVariants)) {
    // TODO: use cookies() or headers() to do this dynamically and thus opt the page out?
    headers();
    throw new Error("Variant not assigned via params: " + id);
  }
  return activeVariants[id];
}
