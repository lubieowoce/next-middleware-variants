import Link from "next/link";
import { withVariants } from "@/app/variants-provider";

import { colorVariant } from "@/app/variants.config";
import { VariantsDebug } from "../variants-debug";

export const dynamic = "error";

type Params = {
  variant: string;
  [param: string]: string;
};

async function Home({ params }: { params: Params }) {
  return (
    <main>
      <div>
        <h1 style={{ fontSize: "24px", color: await colorVariant() }}>Home!</h1>
      </div>
      <VariantsDebug />
      <br />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <Link href={"/foo"}>go to /foo</Link>
        <Link href={"/dynamic"}>go to /dynamic</Link>
        <Link href={"/bar/first"}>go to /bar/first</Link>
        <Link href={"/bar/second"}>go to /bar/second</Link>
        <Link href={"/bar/third"}>go to /bar/third</Link>
      </div>
    </main>
  );
}

export default withVariants(Home);
