import { ReactNode } from "react";
import { encodeVariantsIntoParam } from "./core";
import { provideVariants } from "./react-server";

export function withVariants<TComponent extends (props: any & {}) => ReactNode>(
  Component: TComponent,
): TComponent {
  const Wrapper = (props: Parameters<TComponent>[0]) => {
    let variantsParam = props.params?.variants;
    if (!variantsParam) {
      console.error("'variants' param is missing, defaulting to empty");
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

function renameFunction<TFn extends (...args: any[]) => any>(
  fn: TFn,
  name: string,
): TFn {
  return {
    [name]: function (...args: Parameters<TFn>) {
      return fn.call(this, ...args);
    },
  }[name] as TFn;
}
