import { type VariantMatcherConfig } from "@/app/lib/variants/matcher";
import { createCookieVariant } from "./lib/cookie-variant-provider";

export const colorVariant = createCookieVariant({
  id: "color",
  variants: ["green", "blue"],
});
export const fontVariant = createCookieVariant({
  id: "font",
  variants: ["sans-serif", "Georgia"],
});

export default {
  patterns: [
    [{ pathname: "/" }, [colorVariant]],
    [{ pathname: "/foo" }, [colorVariant, fontVariant]],
    [{ pathname: "/bar/:barId" }, [fontVariant]],
  ],
} satisfies VariantMatcherConfig;
