"use variant";
import { createCookieVariant } from "@/app/lib/cookie-variant-provider/server";
import { createExperimentVariant } from "@/app/lib/experiment-provider/server";

export const colorVariant = createExperimentVariant({
  id: "123456",
  variants: ["green", "blue"],
});

export const fontVariant = createCookieVariant({
  id: "font",
  variants: ["sans-serif", "Georgia"],
});

export const whateverVariant = createExperimentVariant({
  id: "789012",
  variants: ["yes", "no"],
});
