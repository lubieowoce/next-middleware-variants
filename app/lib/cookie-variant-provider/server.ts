import type { NextRequest, NextResponse } from "next/server";
import type { cookies } from "next/headers";
import {
  createVariant,
  getVariantProvider,
  type AssignedVariants,
  createVariantProvider,
} from "@/app/lib/variants";
import {
  COOKIE_NAME,
  parseVariantsFromCookie,
  serializeVariantsToCookie,
} from "./shared";

type RequestCookies = NextRequest["cookies"] | ReturnType<typeof cookies>;
type ResponseCookies = NextResponse["cookies"] | ReturnType<typeof cookies>;

export const cookieVariantProvider =
  createVariantProvider<CookieVariantResolver>("cookie-variant");

export function createCookieVariant(options: {
  id: string;
  variants: string[];
  //fallback?: string;
}) {
  return createVariant({
    id: options.id,
    variants: options.variants,
    //fallback: options.fallback,
    async resolve() {
      const resolver = await getVariantProvider(cookieVariantProvider);
      return resolver.resolve(options.id, options.variants);
    },
  });
}

async function getRandomVariant<T>(choices: T[]) {
  const ix = Math.floor(Math.random() * choices.length);
  return choices[ix];
}

type CookieVariantResolver = ReturnType<typeof createCookieVariantResolver>;


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
      const cookieValue = serializeVariantsToCookie({
        ...existing,
        ...persist,
      });
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
  const cookieValue = cookies.get(COOKIE_NAME)?.value;
  return cookieValue ? parseVariantsFromCookie(cookieValue) : {};
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
