import { cookies } from "next/headers";
import { createVariantsWrapper } from "@/app/lib/variants";
import {
  cookieVariantProvider,
  createCookieVariantResolver,
} from "./lib/cookie-variant-provider/server";
export const variantsProvider = createVariantsWrapper({
  dynamicProviders: [
    [cookieVariantProvider, () => createCookieVariantResolver(() => cookies())],
  ],
});
export const { withVariants } = variantsProvider;
