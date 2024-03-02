import { ResetVariants } from "@/app/reset-variants";
import Link from "next/link";
import { withVariants, getVariant } from "@/app/lib/variants";
import { generateVariantParams } from "@/app/lib/variants/static";

export async function generateStaticParams(): Promise<Params[]> {
  const { default: config } = await import("@/app/variants.config");
  return generateVariantParams("/foo", config);
}

type Params = {
  [param: string]: string;
};

async function Foo({ params }: { params: Params }) {
  return (
    <main>
      <div>
        Foo!{" "}
        {JSON.stringify({
          123: await getVariant("123"),
          456: await getVariant("456"),
        })}
      </div>
      <ResetVariants />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <Link href={"/"}>go to /</Link>
      </div>
    </main>
  );
}

export default withVariants(Foo);
