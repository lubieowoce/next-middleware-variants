import { PropsWithChildren } from "react";
import { withVariants } from "@/app/variants-provider";
// import { VariantsDebug } from "@/app/variants-debug";
import { generateVariantParams } from "@/app/lib/variants/static";
import { whateverVariant } from "@/app/variants";

export const dynamicParams = true;

export async function generateStaticParams(): Promise<Params[]> {
  const { default: config } = await import("@/app/variants.config");
  return generateVariantParams("/", config);
}

type Params = {
  variants: string;
  [param: string]: string;
};

async function Layout({
  params,
  children,
}: PropsWithChildren<{ params: Params }>) {
  const isActive = (await whateverVariant()) === "yes" ? true : false;
  return (
    <>
      {isActive && (
        <div>
          <code>whateverVariant</code> is active, so the root layout will show
          some stuff!
        </div>
      )}
      {/* <VariantsDebug /><br /> */}
      {children}
    </>
  );
}

export default withVariants(Layout);
