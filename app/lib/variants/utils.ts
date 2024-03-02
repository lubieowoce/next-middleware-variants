export function setToArray<T>(set: Set<T>) {
  // don't want to assume --downlevelIteration for Sets
  const arr: T[] = [];
  set.forEach((value) => arr.push(value));
  return arr;
}

export function renameFunction<TFn extends (...args: any[]) => any>(
    fn: TFn,
    name: string,
  ): TFn {
    return {
      [name]: function (...args: Parameters<TFn>) {
        return fn.call(this, ...args);
      },
    }[name] as TFn;
  }


export function lazyThunk<T>(create: () => T): () => T {
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
