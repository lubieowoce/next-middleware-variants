import { PropsWithChildren } from "react";
import { withVariants } from "@/app/lib/variants";
// import { VariantsDebug } from "@/app/variants-debug";
import { generateVariantParams } from "@/app/lib/variants/static";

export const dynamicParams = true;

export async function generateStaticParams(): Promise<Params[]> {
  const { default: config } = await import("@/app/variants.config");
  return generateVariantParams("/", config);
}

type Params = {
  variants: string;
  [param: string]: string;
};

function Layout({ params, children }: PropsWithChildren<{ params: Params }>) {
  return (
    <>
      {/* <VariantsDebug /><br /> */}
      {children}
    </>
  );
}

export default withVariants(Layout);
