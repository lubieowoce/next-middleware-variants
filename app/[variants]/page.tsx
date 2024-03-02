import { ResetVariants } from "@/app/reset-variants";
import Link from "next/link";
import { getVariant, withVariants } from "@/app/lib/variants";

export const dynamic = "error";

type Params = {
  variant: string;
  [param: string]: string;
};

async function Home({ params }: { params: Params }) {
  return (
    <main>
      <div>
        Home!{" "}
        {JSON.stringify({
          123: await getVariant("123"),
          // 456: await getVariant("456"),
          //789: await getVariant("789").catch((err) => err.message),
        })}
      </div>
      <ResetVariants />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <Link href={"/foo"}>go to /foo</Link>
        <Link href={"/bar/first"}>go to /bar/first</Link>
        <Link href={"/bar/second"}>go to /bar/second</Link>
        <Link href={"/bar/third"}>go to /bar/third</Link>
      </div>
    </main>
  );
}

export default withVariants(Home);
