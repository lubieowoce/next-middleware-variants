import { createVariant, VariantsConfig } from "@/app/lib/variants/core";

const variant123 = createVariant({ id: "123", variants: ["A", "B"] });
const variant456 = createVariant({ id: "456", variants: ["A", "B"] });

export default [variant123, variant456] satisfies VariantsConfig;
