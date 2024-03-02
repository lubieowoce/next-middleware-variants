import { renameFunction, lazyThunk } from "./utils";
import {
  stashVariantOptions,
  // resolveVariantValueFromOptions,
  type VariantGetter,
  type VariantOptions,
} from "./variant-base";

export type { VariantGetter, VariantOptions };

type _TVariantValue = string; // TODO: make this generic, i.e support serializable types

export function createVariant(
  options: VariantOptions<_TVariantValue>,
): VariantGetter<_TVariantValue> {
  const { id } = options;
  const lazyGetter = lazyThunk(async () => {
    // this can get imported in various places where `React.cache` is not defined,
    // so we have to be careful and import it all lazily
    const { getVariants } = await import("./react-server");
    const { cache } = await import("react");
    const { headers } = await import("next/headers");

    return cache(async () => {
      const variantsFromParams = await getVariants();
      if (!(id in variantsFromParams)) {
        // TODO: how do we call the resolver dynamically, during a render of a dynamic page?
        // we can't easily do this if it needs some context...
        // return resolveVariantValueFromOptions(options);

        headers(); // make sure we error out during static generation
        throw new Error("Variant not assigned via params: " + id);
      }
      return variantsFromParams[id];
    });
  });

  const getter = renameFunction(
    async () => (await lazyGetter())(),
    `createVariant(id:${id})`,
  );
  return stashVariantOptions(getter, options);
}
