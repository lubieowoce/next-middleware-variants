import { ReactNode } from "react";
import { encodeVariantsIntoParam, VARIANTS_PARAM_NAME } from "./core";
import { lazyThunk, renameFunction } from "./utils";
import { provideVariants } from "./react-server";
import {
  VariantProvider,
  variantProvidersStorage,
  variantProvidersLocal,
} from "./variant-provider";
import { lazyCache } from "./lazy-cache";

export type ProviderFactory<T> = () => T;

export function createVariantsWrapper({
  dynamicProviders,
}: {
  dynamicProviders: ProviderAndImpl<any>[];
}) {
  const providersForDynamicRender = Object.fromEntries(
    dynamicProviders.map(([p, impl]) => [p.id, lazyCache(impl)] as const),
  );
  return {
    withVariants<TComponent extends (props: any & {}) => ReactNode>(
      Component: TComponent,
    ): TComponent {
      const Wrapper = (props: Parameters<TComponent>[0]) => {
        let variantsParam = props.params?.[VARIANTS_PARAM_NAME];
        if (!variantsParam) {
          console.error(
            `'${VARIANTS_PARAM_NAME}' param is missing, defaulting to empty`,
          );
          variantsParam = encodeVariantsIntoParam({});
        }
        provideVariants(variantsParam);
        variantProvidersLocal().set(providersForDynamicRender);
        return <Component {...(props as any)} />;
      };
      return renameFunction(
        Wrapper,
        `withVariants(${Component.name ?? "<anonymous>"})`,
      ) as TComponent;
    },
    runWithProviders<TRes>(
      providers: ProviderAndImpl<any>[],
      cb: () => TRes,
    ): TRes {
      const providersForALS = Object.fromEntries(
        providers.map(([p, impl]) => [p.id, lazyThunk(impl)] as const),
      );
      return variantProvidersStorage.run(providersForALS, cb);
    },
  };
}

type ProviderAndImpl<T> = [
  provider: VariantProvider<T>,
  implementation: () => T,
];
