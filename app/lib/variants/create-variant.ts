import { renameFunction, lazyThunk } from "./utils";
import {
  stashVariantOptions,
  resolveVariantValueFromOptions,
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

    return cache(async () => {
      const variantsFromParams = await getVariants();
      if (!(id in variantsFromParams)) {
        // TODO: reading works fine, but what if a provider needs to write?
        return resolveVariantValueFromOptions(options);
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
