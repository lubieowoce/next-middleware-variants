import Link from "next/link";
import { withVariants } from "@/app/variants-provider";
import { generateVariantParams } from "@/app/lib/variants/static";

import { VariantsDebug } from "@/app/variants-debug";
import { colorVariant, fontVariant } from "@/app/variants";

export async function generateStaticParams(): Promise<Params[]> {
  const { default: config } = await import("@/app/variants.config");
  return generateVariantParams("/foo", config);
}

type Params = {
  [param: string]: string;
};

async function Foo({ params }: { params: Params }) {
  return (
    <main style={{ fontFamily: await fontVariant() }}>
      <div>
        <h1 style={{ fontSize: "24px", color: await colorVariant() }}>Foo!</h1>
        <VariantsDebug />
        <br />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <Link href={"/"}>go to /</Link>
      </div>
    </main>
  );
}

export default withVariants(Foo);
