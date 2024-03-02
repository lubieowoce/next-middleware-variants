import { ResetVariants } from "@/app/reset-variants";
import Link from "next/link";
import { provideVariants, getVariant } from "@/app/lib/variants";

export const dynamic = "error";

type Params = {
  variant: string;
  [param: string]: string;
};

export default async function Home({ params }: { params: Params }) {
  // provideVariants(params.variants);
  return (
    <main>
      <div>
        Home!{" "}
        {JSON.stringify({
          123: await getVariant("123"),
          456: await getVariant("456"),
          //789: await getVariant("789").catch((err) => err.message),
        })}
      </div>
      <ResetVariants />
      <div>
        <Link href={"/foo"}>go to /foo</Link>
      </div>
    </main>
  );
}
