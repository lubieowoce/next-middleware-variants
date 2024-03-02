export function setToArray<T>(set: Set<T>) {
  // don't want to assume --downlevelIteration for Sets
  const arr: T[] = [];
  set.forEach((value) => arr.push(value));
  return arr;
}
