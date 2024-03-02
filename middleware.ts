import { NextResponse, URLPattern } from "next/server";
import type { NextRequest } from "next/server";
import variantsConfig from "./app/variants.config";
import {
  getRandomVariant,
  type AssignedVariants,
  encodeVariantsIntoParam,
  VARIANTS_PATH_SEGMENT,
  type Variant,
} from "@/app/lib/variants/core";
import { createVariantMatcher } from "@/app/lib/variants/matcher";

const variantsMatcher = createVariantMatcher(variantsConfig);

function getAssignedVariants(request: NextRequest) {
  const assignedVariantsRaw = request.cookies.get("assignedVariants")?.value;
  const previouslyAssignedVariants: AssignedVariants = assignedVariantsRaw
    ? JSON.parse(assignedVariantsRaw)
    : {};
  return previouslyAssignedVariants;
}

async function getOrAssignVariantsForParam(
  previouslyAssignedVariants: AssignedVariants,
  applicableVariants: Set<Variant>,
) {
  const variantsForParam: AssignedVariants = {};
  let needCookieUpdate = false;
  for (const variant of applicableVariants.values()) {
    let variantValue: string;
    if (!(variant.id in previouslyAssignedVariants)) {
      variantValue = await getRandomVariant(variant);
      console.log("New variant value to assign:", {
        [variant.id]: variantValue,
      });
      needCookieUpdate = true;
    } else {
      variantValue = previouslyAssignedVariants[variant.id];
    }
    variantsForParam[variant.id] = variantValue;
  }
  return {
    param: variantsForParam,
    persist: needCookieUpdate
      ? {
          ...previouslyAssignedVariants,
          ...variantsForParam,
        }
      : null,
  };
}

export async function middleware(request: NextRequest) {
  // console.log("middleware :: nextUrl", request.nextUrl.pathname);

  const applicableVariants = variantsMatcher(request.nextUrl);
  if (request.nextUrl.pathname.match(VARIANTS_PATH_SEGMENT)) {
    // console.log("middleware :: already rewritten");
    return;
  }

  const previouslyAssignedVariants = getAssignedVariants(request);
  const { param: variantsForParam, persist: variantsToPersist } =
    await getOrAssignVariantsForParam(
      previouslyAssignedVariants,
      applicableVariants,
    );

  const variantsParam = encodeVariantsIntoParam(
    variantsForParam,
    applicableVariants,
  );

  const internalUrl = Object.assign(request.nextUrl.clone(), {
    pathname: `/${variantsParam}` + request.nextUrl.pathname,
  });

  // console.log("middleware :: internalUrl", internalUrl);
  const response = NextResponse.rewrite(internalUrl);
  if (variantsToPersist) {
    console.log(
      "middleware :: saving newly assigned variants into cookie",
      variantsToPersist,
      "\n(previous:",
      previouslyAssignedVariants,
      ")",
    );
    const cookieValue = JSON.stringify(variantsToPersist);
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
