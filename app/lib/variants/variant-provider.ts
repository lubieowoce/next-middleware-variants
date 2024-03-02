import { createRequestLocal } from "../request-local";

type VariantProviders = Record<string, () => unknown>;

export const variantProvidersLocal = createRequestLocal<VariantProviders>();
export const variantProvidersStorage =
  new AsyncLocalStorage<VariantProviders>();

export type VariantProvider<T> = { id: string; __tag: T };
export function createVariantProvider<T>(id: string): VariantProvider<T> {
  return { id, __tag: undefined! };
}

export async function getVariantProvider<T>(
  provider: VariantProvider<T>,
): Promise<T> {
  const providers =
    variantProvidersStorage.getStore() ?? (await variantProvidersLocal().get());
  if (!(provider.id in providers)) {
    throw new Error(`Missing provider with id ${provider.id}`);
  }
  return providers[provider.id]() as T;
}
