import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import staticVariants from "./app/variants.config";
import {
  getRandomVariant,
  type AssignedVariants,
  encodeVariantsIntoParam,
  VARIANTS_PATH_SEGMENT,
} from "@/app/lib/variants/core";

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  // console.log("middleware :: nextUrl", request.nextUrl.pathname);
  if (request.nextUrl.pathname.match(VARIANTS_PATH_SEGMENT)) {
    // console.log("middleware :: already rewritten");
    return;
  }
  const assignedVariantsRaw = request.cookies.get("assignedVariants")?.value;
  const assignedVariants: AssignedVariants = assignedVariantsRaw
    ? JSON.parse(assignedVariantsRaw)
    : {};

  let needCookieUpdate = false;
  for (const variant of staticVariants) {
    if (!(variant.id in assignedVariants)) {
      const variantValue = await getRandomVariant(variant);
      assignedVariants[variant.id] = variantValue;
      needCookieUpdate = true;
    }
  }
  const variantsParam = encodeVariantsIntoParam(assignedVariants);

  const internalUrl =
    request.nextUrl.protocol +
    "//" +
    request.nextUrl.host +
    `/${variantsParam}` +
    request.nextUrl.pathname +
    request.nextUrl.search +
    request.nextUrl.hash;
  // console.log("middleware :: internalUrl", internalUrl);
  const response = NextResponse.rewrite(internalUrl);
  if (needCookieUpdate) {
    console.log("middleware :: assigning updated variants", assignedVariants);
    const cookieValue = JSON.stringify(assignedVariants);
    response.cookies.set("assignedVariants", cookieValue, {
      maxAge: 24 * 60 * 60,
    });
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
