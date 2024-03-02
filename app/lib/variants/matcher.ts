import { URLPattern } from "./url-pattern";
import type { Variant } from "./core";
export type URLPatternInput = ConstructorParameters<typeof URLPattern>[0];
export type VariantPatterns = [pattern: URLPatternInput, variants: Variant[]][];
export type VariantMatcherConfig = { patterns: VariantPatterns };

export function createVariantMatcher(config: VariantMatcherConfig) {
  if (typeof URLPattern !== "function") {
    throw new Error("URLPattern is not available in this environment");
  }
  // TODO: this should probably be a trie
  const patterns = config.patterns.map(
    ([init, variants]) => [new URLPattern(init), variants] as const,
  );
  return (url: URL) => {
    const applicableVariants = new Set<Variant>();
    for (const [pattern, variants] of patterns) {
      if (pattern.test(url)) {
        for (const variant of variants) {
          applicableVariants.add(variant);
        }
      }
    }
    return applicableVariants;
  };
}
