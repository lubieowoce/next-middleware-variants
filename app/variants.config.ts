import { type VariantMatcherConfig } from "@/app/lib/variants/matcher";
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

export default {
  patterns: [
    [{ pathname: "/" }, [colorVariant]],
    [{ pathname: "/foo" }, [colorVariant, fontVariant]],
    [{ pathname: "/bar/:barId" }, [fontVariant]],
    [{ pathname: "/dynamic" }, [fontVariant]],
  ],
} satisfies VariantMatcherConfig;
