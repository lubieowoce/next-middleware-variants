import { cookies } from "next/headers";
import { createVariantsWrapper, pair } from "@/app/lib/variants";
import {
  cookieVariantProvider,
  createCookieVariantResolver,
} from "./lib/cookie-variant-provider/server";
import {
  experimentVariantProvider,
  createExperimentVariantResolver,
} from "./lib/experiment-provider/server";
import { getGlobalExperimentClient } from "./lib/experiment-provider/global-experiment-client";
export const variantsProvider = createVariantsWrapper({
  dynamicProviders: [
    pair(cookieVariantProvider, () =>
      createCookieVariantResolver({
        getCookies: () => cookies(),
        canPersist: false,
      }),
    ),
    pair(experimentVariantProvider, () =>
      createExperimentVariantResolver(getGlobalExperimentClient()),
    ),
  ],
});
export const { withVariants } = variantsProvider;
