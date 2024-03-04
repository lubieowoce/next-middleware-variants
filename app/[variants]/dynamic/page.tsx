import Link from "next/link";
import { withVariants } from "@/app/variants-provider";

import { VariantsDebug } from "@/app/variants-debug";
import { colorVariant, fontVariant } from "@/app/variants";

export const dynamic = "force-dynamic";

type Params = {
  [param: string]: string;
};

async function DynamicPage({ params }: { params: Params }) {
  return (
    <main style={{ fontFamily: await fontVariant() }}>
      <div>
        <h1 style={{ fontSize: "24px", color: await colorVariant() }}>
          DynamicPage!
        </h1>
        <VariantsDebug />
        <br />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <Link href={"/"}>go to /</Link>
      </div>
    </main>
  );
}

export default withVariants(DynamicPage);
