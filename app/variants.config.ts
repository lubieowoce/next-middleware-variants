import { createVariant } from "@/app/lib/variants/core";
import { type VariantMatcherConfig } from "@/app/lib/variants/matcher";

const variant123 = createVariant({ id: "123", variants: ["A", "B"] });
const variant456 = createVariant({ id: "456", variants: ["A", "B"] });

export default {
  patterns: [
    [{ pathname: "/" }, [variant123]],
    [{ pathname: "/foo" }, [variant123, variant456]],
    [{ pathname: "/bar/:barId" }, [variant456]],
  ],
} satisfies VariantMatcherConfig;
