import { VariantMatcherConfig, createVariantMatcher } from "./matcher";
import {
  AssignedVariants,
  encodeVariantsIntoParam,
  VARIANTS_PARAM_NAME,
} from "./core";
import { setToArray } from "./utils";
import { VariantGetter, getStaticVariants, getVariantId } from "./variant-base";

export function generateVariantParams(
  path: string,
  config: VariantMatcherConfig,
) {
  const pathWithoutDynamicParams = path.replace(
    /\[([^\]]+)\]/g,
    (_, param) => `__${param}__`,
  );
  const matcher = createVariantMatcher(config);
  const applicableVariants = matcher(
    new URL(pathWithoutDynamicParams, "http://__fake_host"),
  );
  const assignments = generatePossibleAssignments(applicableVariants);
  return assignments.map((assignment) => ({
    [VARIANTS_PARAM_NAME]: encodeVariantsIntoParam(assignment),
  }));
}

export function generatePossibleAssignments(
  applicableVariants: Set<VariantGetter>,
) {
  let assignments: AssignedVariants[] = [{}];
  for (const variant of setToArray(applicableVariants)) {
    assignments = assignments.flatMap((assignment) =>
      getStaticVariants(variant).map((variantValue) => ({
        ...assignment,
        [getVariantId(variant)]: variantValue,
      })),
    );
  }
  return assignments;
}
