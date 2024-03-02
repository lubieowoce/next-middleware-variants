import { ReactNode } from "react";
import { encodeVariantsIntoParam, VARIANTS_PARAM_NAME } from "./core";
import { renameFunction } from './utils'
import { provideVariants } from "./react-server";

export function withVariants<TComponent extends (props: any & {}) => ReactNode>(
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
    return <Component {...(props as any)} />;
  };
  return renameFunction(
    Wrapper,
    `withVariants(${Component.name ?? "<anonymous>"})`,
  ) as TComponent;
}


