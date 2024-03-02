import { VariantGetter, getVariantId, resolveVariant } from "./variant-base";
import { encodeVariantsIntoParam } from "./core";
import { setToArray } from "./utils";

export async function resolveVariantsIntoParam(
  applicableVariants: Set<VariantGetter>,
) {
  const entries = await Promise.all(
    setToArray(applicableVariants).map(
      async (variant) =>
        [getVariantId(variant), await resolveVariant(variant)] as const,
    ),
  );
  const variantsForParam = Object.fromEntries(entries);

  const variantsParam = encodeVariantsIntoParam(
    variantsForParam,
    applicableVariants,
  );
  return variantsParam;
}
