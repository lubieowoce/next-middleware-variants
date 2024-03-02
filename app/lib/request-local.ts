export const createRequestLocal = <T>({ deadlockTimeout = 10_000 } = {}) => {
  const lazyGetter = lazyThunk(() => {
    const React = require("react") as typeof import("react");
    const { cache } = React;
    return cache(() => {
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
                `Attempted to set the value to ${value} after it was already set to ${resolvedValue}. This could lead to inconsistent results`,
              );
            } else {
              return;
            }
          }
          didResolve = true;
          resolvedValue = value;
          resolve(value);
        },
      };
    });
  });
  return () => lazyGetter()();
};

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

function lazyThunk<T>(create: () => T): () => T {
  type Cache<T> =
    | { status: "empty" }
    | { status: "ok"; value: T }
    | { status: "error"; error: unknown };
  let cache: Cache<T> = { status: "empty" };
  return () => {
    if (cache.status === "empty") {
      try {
        cache = { status: "ok", value: create() };
      } catch (error) {
        cache = { status: "error", error };
      }
    }
    switch (cache.status) {
      case "ok": {
        return cache.value;
      }
      case "error": {
        throw cache.error;
      }
    }
  };
}
