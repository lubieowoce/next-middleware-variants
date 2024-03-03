"use client";

import type { AssignedVariants } from "@/app/lib/variants/core";
import {
  COOKIE_NAME,
  parseVariantsFromCookie,
  serializeVariantsToCookie,
} from "./shared";

export function updateAssignments(variants: AssignedVariants) {
  const existingRaw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];
  const existing = existingRaw ? parseVariantsFromCookie(existingRaw) : {};
  document.cookie = `${COOKIE_NAME}=${serializeVariantsToCookie({ ...existing, ...variants })}`;
}
