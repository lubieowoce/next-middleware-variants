import Link from "next/link";
import { withVariants } from "@/app/lib/variants";
import { generateVariantParams } from "@/app/lib/variants/static";

import { fontVariant } from "@/app/variants.config";
import { VariantsDebug } from "@/app/variants-debug";

export const dynamic = "error";
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Partial<Params>[]> {
  const { default: config } = await import("@/app/variants.config");
  const barIds = ["first", "second"];
  const variantParams = generateVariantParams("/bar/[barId]", config);
  return variantParams.flatMap((params) =>
    barIds.map((barId) => ({ ...params, barId })),
  );
}

type Params = {
  barId: string;
  [param: string]: string;
};

async function Foo({ params }: { params: Params }) {
  return (
    <main style={{ fontFamily: await fontVariant() }}>
      <div>
        <h1 style={{ fontSize: "24px" }}>Bar ({params.barId})!</h1>
        <VariantsDebug />
        <br />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <Link href={"/foo"}>go to /foo</Link>
        <Link href={"/"}>go to /</Link>
      </div>
    </main>
  );
}

export default withVariants(Foo);
