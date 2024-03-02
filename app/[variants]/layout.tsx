import { AssignedVariants, provideVariants } from "@/app/lib/variants";
import { encodeVariantsIntoParam } from "@/app/lib/variants/core";
import {} from "lodash-es";
import { PropsWithChildren } from "react";

export const dynamicParams = true;

export async function generateStaticParams(): Promise<
  Record<string, string>[]
> {
  const { default: staticVariants } = await import("@/app/variants");

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

export default function Layout({
  params,
  children,
}: PropsWithChildren<{ params: Params }>) {
  // NOTE: CAN'T RELY ON THIS ALWAYS RUNNING in case of nested navigations
  // ...but maybe that's fine? we only care about static pages here,
  // and those are prerendered using the full tree, so actually we might not need
  // `provideVariants` on each page
  provideVariants(params.variants);
  return <>{children}</>;
}
