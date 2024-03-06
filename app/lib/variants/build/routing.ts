import type { FileTree } from "./file-tree";

export const wrapperComponentKeys = ["layout", "template"] as const;

export const errorComponentKeys = ["error", "notFound"] as const;

export const componentKeys = [
  ...wrapperComponentKeys,
  ...errorComponentKeys,
] as const;

export const leafComponentKeys = ["page", "default"] as const;

export const allComponentKeys = [
  ...componentKeys,
  ...leafComponentKeys,
] as const;

export type RouteTree = {
  segment: string;
  dynamic?: DynamicSegmentKind;
  components?: {
    // special
    layout?: string;
    template?: string;
    error?: string;
    notFound?: string;
    // leaf
    page?: string;
    default?: string;
  };
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
      return { type: "optional-catchall" as const, param: match[1] };
    }
  }
  {
    const match = segment.match(/^\[\.\.\.(.+?)\]$/);
    if (match) {
      return { type: "catchall" as const, param: match[1] };
    }
  }
  {
    const match = segment.match(/^\[(.+?)\]$/);
    if (match) {
      return { type: "dynamic" as const, param: match[1] };
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
      components: {
        [bareName]: absPath,
      },
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

    const components: NonNullable<RouteTree["components"]> = {};
    for (const child of children) {
      if (!components.layout && /^layout\.(js|jsx|ts|tsx)$/.test(child.name)) {
        components.layout = child.absPath;
      }
      if (
        !components.template &&
        /^template\.(js|jsx|ts|tsx)$/.test(child.name)
      ) {
        components.template = child.absPath;
      }
      if (!components.error && /^error\.(js|jsx|ts|tsx)$/.test(child.name)) {
        components.error = child.absPath;
      }
      if (
        !components.notFound &&
        /^not-found\.(js|jsx|ts|tsx)$/.test(child.name)
      ) {
        components.notFound = child.absPath;
      }
    }
    result.components = components;
    const componentsSet = new Set(Object.values(components));
    const routeChildren = children
      .filter((child) => !componentsSet.has(child.absPath))
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
