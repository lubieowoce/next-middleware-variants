import Link from "next/link";
import { withVariants } from "@/app/variants-provider";
import { generateVariantParams } from "@/app/lib/variants/static";

// import { colorVariant } from "@/app/variants";
import { VariantsDebug } from "@/app/variants-debug";
import { ShowColorVariant } from "./uses-variant";

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

async function Bar({ params }: { params: Params }) {
  return (
    <main
      style={
        {
          /* fontFamily: await fontVariant() */
        }
      }
    >
      <div>
        <h1
          style={{
            fontSize: "24px",
            // color: await colorVariant(),
          }}
        >
          Bar ({params.barId})!
        </h1>
        <VariantsDebug />
        <ShowColorVariant />
        <br />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <Link href={"/foo"}>go to /foo</Link>
        <Link href={"/"}>go to /</Link>
      </div>
    </main>
  );
}

export default withVariants(Bar);
