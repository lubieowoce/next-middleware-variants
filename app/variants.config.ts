// import { type VariantMatcherConfig } from "@/app/lib/variants/matcher";
// import { colorVariant, fontVariant } from "./variants";

// export default {
//   patterns: [
//     [{ pathname: "/" }, [colorVariant]],
//     [{ pathname: "/foo" }, [colorVariant, fontVariant]],
//     [{ pathname: "/bar/:barId" }, [fontVariant, colorVariant]],
//     [{ pathname: "/dynamic" }, [fontVariant]],
//   ],
// } satisfies VariantMatcherConfig;

export { default as default } from "./.variants/config.generated";
