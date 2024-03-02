import { PropsWithChildren } from "react";
import { getVariants, withVariants } from "@/app/lib/variants";
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
      {<VariantsDebug />}
      {children}
    </>
  );
}

async function VariantsDebug() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }
  return <div style={{}}>{JSON.stringify(await getVariants())}</div>;
}

export default withVariants(Layout);
