import { ResetVariants } from "@/app/reset-variants";
import Link from "next/link";
import { provideVariants, getVariant } from "@/app/lib/variants";

type Params = {
  [param: string]: string;
};

export default async function Foo({ params }: { params: Params }) {
  // provideVariants(params.variants);
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
      <div>
        <Link href={"/"}>go to /</Link>
      </div>
    </main>
  );
}
