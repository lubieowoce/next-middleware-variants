import { PropsWithChildren } from "react";
import { AssignedVariants, withVariants } from "@/app/lib/variants";
import { encodeVariantsIntoParam } from "@/app/lib/variants/core";

export const dynamicParams = true;

export async function generateStaticParams(): Promise<Params[]> {
  const { default: staticVariants } = await import("@/app/variants.config");

  // cartesian product of all possible assignments
  let assignments: AssignedVariants[] = [{}];
  for (const variant of staticVariants) {
    assignments = assignments.flatMap((assignment) =>
      variant.variants.map((variantValue) => ({
        ...assignment,
        [variant.id]: variantValue,
      })),
    );
  }
  return assignments.map((assignment) => ({
    variants: encodeVariantsIntoParam(assignment),
  }));
}

type Params = {
  variants: string;
  [param: string]: string;
};

function Layout({ params, children }: PropsWithChildren<{ params: Params }>) {
  return <>{children}</>;
}

export default withVariants(Layout);
