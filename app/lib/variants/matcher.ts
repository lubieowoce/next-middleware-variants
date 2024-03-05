import { URLPattern } from "./url-pattern";
import type { VariantGetter } from "./variant-base";
import {
  type RouteTree,
  componentKeys,
  leafComponentKeys,
  allComponentKeys,
  isGroupSegment,
  wrapperComponentKeys,
} from "./build/routing";

export type URLPatternInput = ConstructorParameters<typeof URLPattern>[0];
export type VariantPatterns = [
  pattern: URLPatternInput,
  variants: VariantGetter[],
][];

export type VariantMatcherConfig = {
  patterns: VariantPatterns;
  routes?: RouteTreeWithVariants;
};

export function createVariantMatcher(config: VariantMatcherConfig) {
  if (config.routes) {
    return createRouteMatcher(config);
  }
  if (typeof URLPattern !== "function") {
    throw new Error("URLPattern is not available in this environment");
  }
  // TODO: this should probably be a trie
  const patterns = config.patterns.map(
    ([init, variants]) => [new URLPattern(init), variants] as const,
  );
  return (url: URL) => {
    const applicableVariants = new Set<VariantGetter>();
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

//====================================

type RouteTreeWithVariants = Omit<RouteTree, "children"> & {
  variants?: Record<string, VariantGetter[]>;
  children?: RouteTreeWithVariants[];
};

class NotFoundError extends Error {}

const NO_VARIANTS: VariantGetter[] = [];

// look... it's not great okay. i'm in a rush
function createRouteMatcher(config: VariantMatcherConfig) {
  return (url: URL): Set<VariantGetter> => {
    const segments = [
      ...("/__variants__" + (url.pathname || "/").replace(/\/$/, "")).split(
        "/",
      ),
      "__PAGE__",
    ];

    const matchImpl = (
      segments: string[],
      tree: RouteTreeWithVariants,
    ): VariantGetter[] => {
      const [segmentToMatch, ...rest] = segments;
      const { dynamic, children } = tree;
      if (!dynamic) {
        if (isGroupSegment(tree.segment)) {
          // need to recurse
          throw new Error("Not implemented: group segments");
        }
        if (segmentToMatch !== tree.segment) {
          throw new NotFoundError();
        }
        if (segmentToMatch === "__PAGE__" && rest.length === 0) {
          return tree.variants?.page ?? NO_VARIANTS;
        }
        if (!children) {
          throw new NotFoundError();
        }
        return matchChildren(rest, tree, children);
      } else {
        switch (dynamic.kind) {
          // TODO: if there's other segments at this level, we should check them first...
          case "optional-catchall":
          case "catchall": {
            throw new Error("Not implemented: catchall segments");
          }
          case "dynamic": {
            // normally, we'd substitute this and be done with it, but we don't actually care.
            const { children } = tree;
            if (!children) {
              throw new NotFoundError();
            }
            return matchChildren(rest, tree, children);
          }
        }
      }
    };

    const matchChildren = (
      segments: string[],
      tree: RouteTreeWithVariants,
      children: RouteTreeWithVariants[],
    ) => {
      for (const child of children) {
        try {
          // TODO: actually handle not-found/error and default
          // TODO: what do we even do for error? we don't know if it'll happen at this point...
          const fromChild = matchImpl(segments, child);
          const ownVariants = wrapperComponentKeys.flatMap(
            (componentKey) => tree.variants?.[componentKey] ?? NO_VARIANTS,
          );
          return fromChild ? [...ownVariants, ...fromChild] : ownVariants;
        } catch (err) {
          if (err instanceof NotFoundError) {
            continue;
          }
          throw err;
        }
      }
      throw new NotFoundError();
    };

    // TODO: what if a NotFoundError bubbles up to here?
    return new Set(matchImpl(segments, config.routes!) ?? NO_VARIANTS);
  };
}
