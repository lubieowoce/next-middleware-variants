// console.log(
//   require("node:util").inspect(fileTree, { depth: undefined, colors: true }),
// );

export const componentKeys = [
  "layout",
  "template",
  "error",
  "notFound",
] as const;
export const leafComponentKeys = ["page", "default"] as const;
export const allComponentKeys = [
  ...componentKeys,
  ...leafComponentKeys,
] as const;

export type RouteTree = {
  segment: string;
  dynamic?: DynamicSegmentKind;
  // special
  layout?: string;
  template?: string;
  error?: string;
  notFound?: string;
  // leaf
  page?: string;
  default?: string;
  // others
  // TODO: this will need to be `parallelRoutes` someday...
  children?: RouteTree[];
};

export function isGroupSegment(segment: string) {
  return /^\(.+?\)$/.test(segment);
}

type DynamicSegmentKind = ReturnType<typeof getDynamicSegmentKind>;
function getDynamicSegmentKind(segment: string) {
  if (!segment || segment[0] !== "[" || segment[segment.length - 1] !== "]") {
    return null;
  }
  {
    const match = segment.match(/^\[\[\.\.\.(.+?)\]\]$/);
    if (match) {
      return { kind: "optional-catchall" as const, slug: match[1] };
    }
  }
  {
    const match = segment.match(/^\[\.\.\.(.+?)\]$/);
    if (match) {
      return { kind: "catchall" as const, slug: match[1] };
    }
  }
  {
    const match = segment.match(/^\[(.+?)\]$/);
    if (match) {
      return { kind: "dynamic" as const, slug: match[1] };
    }
  }
  return null;
  // return /^\(.+?\)$/.test(segment);
}

function isParallelRouteDir(dir: string) {
  if (dir.length > 1 && dir[0] === "@") {
    return dir.slice(1);
  }
  return null;
}

function isInterceptingRouteDir(dir: string) {
  return dir === "(.)" || dir === "(...)" || /^\(\.\.\)+$/.test(dir);
}

export function isLeafSegment(segment: string) {
  return segment === "__PAGE__" || segment === "__DEFAULT__";
}
export function segmentAffectsPath(segment: string) {
  return !(isLeafSegment(segment) || isGroupSegment(segment));
}

export function toRouteTree(item: FileTree): RouteTree {
  const { name, children, absPath } = item;
  if (!children) {
    const bareName = name.replace(/\.(js|jsx|ts|tsx)$/, "") as any;
    const segment = `__${bareName}__`.toUpperCase();
    if (!isLeafSegment(segment)) {
      throw new Error(
        `Error while parsing route tree: unexpected file ${absPath}`,
      );
    }
    return {
      segment,
      [bareName]: absPath,
    };
  } else {
    if (isParallelRouteDir(name)) {
      throw new Error(
        "Variants in parallel routes are not supported yet: " + item.absPath,
      );
    }
    if (isInterceptingRouteDir(name)) {
      throw new Error(
        "Variants in intercepting routes are not supported yet: " +
          item.absPath,
      );
    }
    const segmentKind = getDynamicSegmentKind(name);
    const result: RouteTree = {
      segment: name,
    };
    if (segmentKind) {
      result.dynamic = segmentKind;
    }
    const specialChildren = new Set<FileTree>();
    for (const child of children) {
      if (!result.layout && /^layout\.(js|jsx|ts|tsx)$/.test(child.name)) {
        result.layout = child.absPath;
        specialChildren.add(child);
      }
      if (!result.template && /^template\.(js|jsx|ts|tsx)$/.test(child.name)) {
        result.template = child.absPath;
        specialChildren.add(child);
      }
      if (!result.error && /^error\.(js|jsx|ts|tsx)$/.test(child.name)) {
        result.error = child.absPath;
        specialChildren.add(child);
      }
      if (!result.notFound && /^not-found\.(js|jsx|ts|tsx)$/.test(child.name)) {
        result.notFound = child.absPath;
        specialChildren.add(child);
      }
    }

    const routeChildren = children
      .filter((child) => !specialChildren.has(child))
      .map(toRouteTree);

    // if (routeChildren.length === 1 && !specialChildren.size) {
    //   const child = routeChildren[0];
    //   if (child.children) {
    //     const { segment } = result;
    //     Object.assign(result, child);
    //     result.segment = segment + "/" + child.segment;
    //     return result;
    //   }
    // }
    result.children = routeChildren;
    return result;
  }
}
