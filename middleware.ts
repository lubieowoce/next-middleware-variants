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
} from "@/app/lib/cookie-variant-provider/server";
import {
  experimentVariantProvider,
  createExperimentVariantResolver,
} from "@/app/lib/experiment-provider/server";
import { getGlobalExperimentClient } from "@/app/lib/experiment-provider/global-experiment-client";
import { withUserId, getUserId } from "@/app/lib/user-id";

const variantsMatcher = createVariantMatcher(variantsConfig);

export async function middleware(
  request: NextRequest,
): Promise<NextResponse | undefined> {
  const noopMiddleware = async () => undefined;
  return withUserId(request, () => withVariants(request, noopMiddleware));
}

async function withVariants(
  request: NextRequest,
  next: () => Promise<NextResponse | undefined>,
): Promise<NextResponse | undefined> {
  // console.log("middleware :: nextUrl", request.nextUrl.pathname);

  const applicableVariants = variantsMatcher(request.nextUrl);
  if (request.nextUrl.pathname.match(VARIANTS_PATH_SEGMENT)) {
    // console.log("middleware :: already rewritten");
    return next();
  }

  const cookieVariantResolver = createCookieVariantResolver({
    getCookies: () => request.cookies,
    canPersist: true,
  });

  const variantsParam = await variantsProvider.runWithProviders(
    [
      [cookieVariantProvider, () => cookieVariantResolver],
      [
        experimentVariantProvider,
        () => createExperimentVariantResolver(getGlobalExperimentClient()),
      ],
    ],
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
