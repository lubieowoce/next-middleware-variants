import type { NextRequest, NextResponse } from "next/server";
import type { cookies } from "next/headers";
import { createVariant, type AssignedVariants } from "@/app/lib/variants";

type RequestCookies = NextRequest["cookies"] | ReturnType<typeof cookies>;
type ResponseCookies = NextResponse["cookies"] | ReturnType<typeof cookies>;

export function createCookieVariant(options: {
  id: string;
  variants: string[];
  //fallback?: string;
}) {
  return createVariant({
    id: options.id,
    variants: options.variants,
    //fallback: options.fallback,
    resolve() {
      const resolver = cookieVariantResolverStorage.getStore();
      return resolver!.resolve(options.id, options.variants);
    },
  });
}

async function getRandomVariant<T>(choices: T[]) {
  const ix = Math.floor(Math.random() * choices.length);
  return choices[ix];
}

type CookieVariantResolver = ReturnType<typeof createCookieVariantResolver>;

const COOKIE_NAME = "assignedVariants";

export function createCookieVariantResolver(getCookies: () => RequestCookies) {
  const getExisting = once(() => {
    const cookies = getCookies();
    return parseAssignedVariants(cookies);
  });
  let persist: AssignedVariants | null = null;
  return {
    get existing() {
      return getExisting();
    },
    get newAssignments() {
      return persist;
    },
    get needsPersist() {
      return !!persist;
    },
    persistAssignments(cookies: ResponseCookies) {
      const existing = getExisting();
      const cookieValue = JSON.stringify({ ...existing, ...persist });
      // TODO: this won't work if we're resolving a variant during a page render...
      // in fact dynamic renders will probably make this crash altogether,
      // because the ALS won't be set up
      cookies.set(COOKIE_NAME, cookieValue, {
        maxAge: 24 * 60 * 60,
      });
    },
    async resolve(id: string, variants: string[]) {
      let variantValue: string;
      const existing = getExisting();
      if (!(id in existing)) {
        variantValue = await getRandomVariant(variants);
        if (persist === null) {
          persist = {};
        }
        persist[id] = variantValue;
      } else {
        variantValue = existing[id];
      }
      return variantValue;
    },
  };
}

export const cookieVariantResolverStorage =
  new AsyncLocalStorage<CookieVariantResolver>();

function parseAssignedVariants(cookies: RequestCookies) {
  const assignedVariantsRaw = cookies.get(COOKIE_NAME)?.value;
  const previouslyAssignedVariants: AssignedVariants = assignedVariantsRaw
    ? JSON.parse(assignedVariantsRaw)
    : {};
  return previouslyAssignedVariants;
}

function once<T extends {}>(create: () => T): () => T {
  let cached: T = undefined!;
  return () => {
    if (!cached) {
      cached = create();
    }
    return cached;
  };
}
