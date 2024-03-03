import type { AssignedVariants } from "@/app/lib/variants/core";

export const COOKIE_NAME = "assignedVariants";

export function parseVariantsFromCookie(cookieValue: string) {
  const previouslyAssignedVariants: AssignedVariants = cookieValue
    ? JSON.parse(cookieValue)
    : {};
  return previouslyAssignedVariants;
}

export function serializeVariantsToCookie(variants: AssignedVariants) {
  return JSON.stringify(variants);
}
