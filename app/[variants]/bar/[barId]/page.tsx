import Link from "next/link";
import { withVariants } from "@/app/variants-provider";
import { generateVariantParams } from "@/app/lib/variants/static";

import { fontVariant, colorVariant } from "@/app/variants.config";
import { VariantsDebug } from "@/app/variants-debug";

export const dynamic = "error";
export const dynamicParams = true;

const DYNAMIC_ERROR_ON_PURPOSE = false;

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
        <h1
          style={{
            fontSize: "24px",
            color: DYNAMIC_ERROR_ON_PURPOSE ? await colorVariant() : undefined,
          }}
        >
          Bar ({params.barId})!
        </h1>
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
