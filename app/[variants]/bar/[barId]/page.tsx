import { ResetVariants } from "@/app/reset-variants";
import Link from "next/link";
import { withVariants, getVariant } from "@/app/lib/variants";
import { generateVariantParams } from "@/app/lib/variants/static";

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
    <main>
      <div>
        Bar ({params.barId})!{" "}
        {JSON.stringify({
          456: await getVariant("456"),
        })}
      </div>
      <ResetVariants />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <Link href={"/foo"}>go to /foo</Link>
        <Link href={"/"}>go to /</Link>
      </div>
    </main>
  );
}

export default withVariants(Foo);
