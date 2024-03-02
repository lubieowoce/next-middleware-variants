import { NextResponse, URLPattern } from "next/server";
import type { NextRequest } from "next/server";
import { VARIANTS_PATH_SEGMENT } from "@/app/lib/variants/core";
import { createVariantMatcher } from "@/app/lib/variants/matcher";
import { resolveVariantsIntoParam } from "@/app/lib/variants/resolve";

import variantsConfig from "./app/variants.config";
import { variantsProvider } from "./app/variants-provider";
import {
  cookieVariantProvider,
  createCookieVariantResolver,
} from "./app/lib/cookie-variant-provider";

const variantsMatcher = createVariantMatcher(variantsConfig);

export async function middleware(request: NextRequest) {
  // console.log("middleware :: nextUrl", request.nextUrl.pathname);

  const applicableVariants = variantsMatcher(request.nextUrl);
  if (request.nextUrl.pathname.match(VARIANTS_PATH_SEGMENT)) {
    // console.log("middleware :: already rewritten");
    return;
  }

  const cookieVariantResolver = createCookieVariantResolver(
    () => request.cookies,
  );
  const variantsParam = await variantsProvider.runWithProviders(
    [[cookieVariantProvider, () => cookieVariantResolver]],
    () => resolveVariantsIntoParam(applicableVariants),
  );

  const internalUrl = Object.assign(request.nextUrl.clone(), {
    pathname: `/${variantsParam}` + request.nextUrl.pathname,
  });

  // console.log("middleware :: internalUrl", internalUrl);
  const response = NextResponse.rewrite(internalUrl);
  if (cookieVariantResolver.needsPersist) {
    console.log(
      "middleware :: saving newly assigned variants into cookie",
      cookieVariantResolver.newAssignments,
      "\n(previous:",
      cookieVariantResolver.existing,
      ")",
    );
    cookieVariantResolver.persistAssignments(response.cookies);
  }
  return response;
}

// See "Matching Paths" below to learn more
export const config = {
  unstable_allowDynamic: [
    "/node_modules/.pnpm/**/lodash-es/**",
    "/node_modules/**/lodash-es/**",
  ],
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
