import { cache } from "react";
export const createRequestLocal = <T>({ deadlockTimeout = 10_000 } = {}) =>
  cache(() => {
    const { promise: valuePromise, resolve } = promiseWithResolvers<T>();
    let didResolve = false,
      resolvedValue: T | undefined = undefined;
    let valueOrTimeoutPromise: Promise<T>;
    return {
      peek(): { isSet: true; value: T } | { isSet: false; value: undefined } {
        return didResolve
          ? { isSet: true, value: resolvedValue! }
          : { isSet: false, value: undefined };
      },
      get() {
        if (didResolve && !valueOrTimeoutPromise) {
          // we resolved before anyone read .promise, no need to race
          return valuePromise;
        }
        if (!valueOrTimeoutPromise) {
          valueOrTimeoutPromise = Promise.race([
            valuePromise,
            sleep(deadlockTimeout).then(() => {
              if (didResolve) {
                return resolvedValue!;
              }
              throw new Error(
                "value not set within 5s, this is probably a deadlock",
              );
            }),
          ]);
        }
        return valueOrTimeoutPromise!;
      },
      set: (value: T) => {
        if (didResolve) {
          if (value !== resolvedValue!) {
            throw new Error(
              `Attempted to set the value to ${value} after it was already set to ${resolvedValue}. This could leat to inconsistent results`,
            );
          }
        }
        didResolve = true;
        resolvedValue = value;
        resolve(value);
      },
    };
  });

function promiseWithResolvers<T>() {
  let resolve: (value: T) => void = undefined!;
  let reject: (error: unknown) => void = undefined!;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
