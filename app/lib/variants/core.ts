import { pick, sortBy } from "lodash-es";
import { setToArray } from "./utils";
import { getVariantId, type VariantGetter } from "./variant-base";

export const VARIANTS_PARAM_NAME = "variants";

export type Variant = { id: string; variants: string[] };

export type VariantsConfig = Variant[];

export type AssignedVariants = Record<string, string>;

const KEY_VALUE_SEPARATOR = ".";
const ITEM_SEPARATOR = "..";
const PREFIX = "__v-";

const ITEM_PATTERN = /(?:[^.]+\.[^.]+)/;
const VARIANTS_ITEMS_PATTERN = new RegExp(
  ITEM_PATTERN.source + `(?:\.\.${ITEM_PATTERN.source})*`,
);
export const VARIANTS_PARAM_PATTERN = new RegExp(
  PREFIX + VARIANTS_ITEMS_PATTERN.source,
);

export const VARIANTS_PARAM_ONLY = new RegExp(
  "^" + VARIANTS_PARAM_PATTERN.source + "$",
);

export const VARIANTS_PATH_SEGMENT = new RegExp(
  "/" + VARIANTS_PARAM_PATTERN.source + "/",
);

export function encodeVariantsIntoParam(
  assignedVariants: AssignedVariants,
  applicableVariants?: Set<VariantGetter>,
) {
  if (applicableVariants) {
    const ids = setToArray(applicableVariants).map((variant) =>
      getVariantId(variant),
    );
    assignedVariants = pick(assignedVariants, ids);
  }
  const variantsParamRaw = sortBy(
    Object.entries(assignedVariants),
    ([id]) => id,
  )
    .map(([id, val]) => {
      for (const separator of [ITEM_SEPARATOR, KEY_VALUE_SEPARATOR]) {
        if (id.includes(separator)) {
          throw new Error(
            `Variant id cannot include '${separator}' (got ${id})`,
          );
        }
        if (val.includes(separator)) {
          throw new Error(
            `Variant value cannot include '${separator}' (got ${val})`,
          );
        }
      }
      return id + KEY_VALUE_SEPARATOR + val;
    })
    .join(ITEM_SEPARATOR);
  return encodeURIComponent(PREFIX + variantsParamRaw);
}

export function decodeVariantsFromParam(param: string): AssignedVariants {
  if (param === PREFIX) {
    // no static variants were added. this is uncommon, but expected.
    return {};
  }
  if (!param.match(VARIANTS_PARAM_ONLY)) {
    console.error(
      `Variants param value '${param}' does not match expected pattern: ${VARIANTS_PARAM_ONLY}. Defaulting variants to empty`,
    );
    return {};
  }
  param = decodeURIComponent(param).slice(PREFIX.length);
  return Object.fromEntries(
    param
      .split(ITEM_SEPARATOR)
      .map((part) => part.split(KEY_VALUE_SEPARATOR, 2)),
  );
}
