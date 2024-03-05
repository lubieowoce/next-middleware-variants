import * as path from "node:path";

export type FileTree = {
  name: string;
  absPath: string;
  children?: FileTree[];
};

export function pathsToFileTree(
  paths: string[],
  { appDir }: { appDir: string },
) {
  const segmentChains = paths.map((p) =>
    path
      .relative(appDir, p)
      .split("/")
      .map((name, i, allSegments) => ({
        type: i + 1 < allSegments.length ? "dir" : ("file" as const),
        name,
        path: path.resolve(appDir, allSegments.slice(0, i + 1).join("/")),
      })),
  );

  // const getSegmentType = (pathItem: typeof segmentChains[number][number]) => {
  //   if (pat)
  // }

  const fileTree: FileTree = {
    name: "",
    absPath: appDir,
    children: [],
  };
  for (const segmentChain of segmentChains) {
    let insertionPoint = fileTree;
    for (const segment of segmentChain) {
      if (!insertionPoint.children) {
        insertionPoint.children = [];
      }
      let existing = insertionPoint.children!.find(
        (child) => child.name === segment.name,
      );
      if (existing) {
        insertionPoint = existing;
        continue;
      }

      const fresh: FileTree = {
        absPath: segment.path,
        name: segment.name,
      };
      insertionPoint.children!.push(fresh);
      insertionPoint = fresh;
    }
  }

  return fileTree;
}
