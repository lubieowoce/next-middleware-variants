import { sortBy } from "lodash-es";

export type Variant = { id: string; variants: string[] };
export async function getRandomVariant(variant: Variant) {
  const ix = Math.floor(Math.random() * variant.variants.length);
  return variant.variants[ix];
}

export type AssignedVariants = Record<string, string>;

const KEY_VALUE_SEPARATOR = ".";
const ITEM_SEPARATOR = "..";
const PREFIX = "__v-";
const ITEM_PATTERN = /(?:[^.]+\.[^.]+)/;
const VARIANTS_ITEMS_PATTERN = new RegExp(
  ITEM_PATTERN.source + `(?:\.\.${ITEM_PATTERN.source})*`,
);
export const VARIANTS_PATTERN = new RegExp(
  PREFIX + VARIANTS_ITEMS_PATTERN.source,
);

const VARIANTS_ONLY = new RegExp("^" + VARIANTS_PATTERN.source + "$");

export const VARIANTS_PATH_PREFIX = new RegExp(
  "^/" + VARIANTS_PATTERN.source + "/",
);

export function encodeVariantsIntoParam(assignedVariants: AssignedVariants) {
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
  if (!param.match(VARIANTS_ONLY)) {
    return {};
  }
  param = param.slice(PREFIX.length);
  return Object.fromEntries(
    param
      .split(ITEM_SEPARATOR)
      .map((part) => part.split(KEY_VALUE_SEPARATOR, 2)),
  );
}
