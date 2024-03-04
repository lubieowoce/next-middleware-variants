import {
  createVariant,
  getVariantProvider,
  createVariantProvider,
} from "@/app/lib/variants";
import { getUserId } from "../user-id";
import { ExperimentClient } from "./experiment-client";

type ExperimentVariantOptions = {
  id: string;
  variants: string[];
  fallback?: string;
};

export function createExperimentVariant(options: ExperimentVariantOptions) {
  return createVariant({
    id: options.id,
    variants: options.variants,
    fallback: options.fallback,
    async resolve() {
      const userId = getUserId();
      if (!userId) {
        throw new Error(
          `ExperimentVariant(id: ${options.id}) :: Cannot resolve variant: User ID is not available and no fallback was defined`,
        );
      }
      const resolver = await getVariantProvider(experimentVariantProvider);
      return resolver.resolve(options, { userId });
    },
  });
}

export const experimentVariantProvider =
  createVariantProvider<ExperimentVariantResolver>("experiments");

type ExperimentVariantResolver = ReturnType<
  typeof createExperimentVariantResolver
>;

export function createExperimentVariantResolver(client: ExperimentClient) {
  return {
    async resolve(
      options: ExperimentVariantOptions,
      context: { userId: string },
    ) {
      try {
        return client.getVariation(context, options.variants);
      } catch (err) {
        throw new Error(
          `ExperimentVariantResolver.resolve(id: ${options.id}) :: Failed to get variation`,
          { cause: err },
        );
      }
    },
  };
}
