export type VariantGetter<TVariantValue = string> =
  (() => Promise<TVariantValue>) & {
    __isVariant: true;
  };

const VARIANT_INTERNALS = Symbol("createVariant.options");

type _TVariantValue = string; // TODO: make this generic, i.e support serializable types

export type VariantOptions<TVariantValue> = {
  id: string;
  variants: TVariantValue[];
  fallback?: TVariantValue;
  resolve: () => TVariantValue | Promise<TVariantValue>;
};

export async function resolveVariantValueFromOptions(
  options: VariantOptions<_TVariantValue>,
) {
  const { id, fallback, resolve } = options;
  const hasFallback = "fallback" in options;
  try {
    return await resolve();
  } catch (err) {
    const baseMessage = `An error occurred while resolving value for variant '${id}'.`;
    if (hasFallback) {
      console.error(baseMessage + " Using fallback value\n", err);
      return fallback!;
    } else {
      console.error(baseMessage, err);
      // We could do this:
      //   throw new Error(baseMessage, { cause: err });
      // but this is likely a static bailout error from next,
      // and we don't wanna mess with that
      throw err;
    }
  }
}

type VariantGetterWithInternals<TVariantValue> =
  VariantGetter<TVariantValue> & {
    [VARIANT_INTERNALS]: VariantOptions<TVariantValue>;
  };

export function stashVariantOptions(
  getter: () => Promise<_TVariantValue>,
  options: VariantOptions<_TVariantValue>,
) {
  const _getter = getter as VariantGetterWithInternals<_TVariantValue>;
  _getter.__isVariant = true;
  _getter[VARIANT_INTERNALS] = options;
  return getter as VariantGetter<_TVariantValue>;
}

function getVariantOptions(getter: VariantGetter<_TVariantValue>) {
  const _getter = getter as VariantGetterWithInternals<_TVariantValue>;
  const options = _getter[VARIANT_INTERNALS];
  if (!options) {
    throw new Error("internal options not found on variant getter");
  }
  return options;
}

export function getStaticVariants(getter: VariantGetter<_TVariantValue>) {
  const options = getVariantOptions(getter);
  return options.variants;
}

export function getVariantId(getter: VariantGetter<_TVariantValue>) {
  const options = getVariantOptions(getter);
  return options.id;
}

export function resolveVariant(getter: VariantGetter<_TVariantValue>) {
  const options = getVariantOptions(getter);
  return resolveVariantValueFromOptions(options);
}
