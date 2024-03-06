import * as fs from "node:fs";
import * as path from "node:path";
import * as ts from "typescript";
import { globSync } from "glob";
import chalk from "chalk";
import { pathsToFileTree } from "./file-tree";
import {
  toRouteTree,
  type RouteTree,
  componentKeys,
  leafComponentKeys,
  allComponentKeys,
} from "./routing";

function createTsLanguageService(
  rootFileNames: string[],
  options: ts.CompilerOptions,
) {
  const files: ts.MapLike<{ version: number }> = {};

  // initialize the list of files
  rootFileNames.forEach((fileName) => {
    files[fileName] = { version: 0 };
  });

  // Create the language service host to allow the LS to communicate with the host
  const servicesHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => rootFileNames,
    getScriptVersion: (fileName) =>
      files[fileName] && files[fileName].version.toString(),
    getScriptSnapshot: (fileName) => {
      if (!fs.existsSync(fileName)) {
        return undefined;
      }

      return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };

  // Create the language service files
  return ts.createLanguageService(servicesHost, ts.createDocumentRegistry());
}

function getCompilerOptions(targetDir: string) {
  const configFilepath = ts.findConfigFile(targetDir, ts.sys.fileExists)!;
  const configFile = ts.readConfigFile(configFilepath, ts.sys.readFile);
  const parsedCommandLine = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configFilepath),
  );
  return parsedCommandLine.options;
}

function main() {
  const dir = process.cwd();
  const appDir = path.join(dir, "app"); // TODO: handle src/

  const rootFiles = globSync(
    ["**/{layout,template,page,default,error,loading}.{js,jsx,ts,tsx}"],
    {
      cwd: appDir,
      ignore: "node_modules/**",
      absolute: true,
      nodir: true,
    },
  )
    .sort()
    .reverse();

  const variantsPackageRootSpecifier = "@/app/lib/variants";

  // TODO: auto-discovery via "use variant"
  const variantFiles = [path.resolve(appDir, "variants.ts")];

  const compilerOptions = getCompilerOptions(dir);
  const languageService = createTsLanguageService(rootFiles, compilerOptions);

  const program = languageService.getProgram()!;
  const checker = program.getTypeChecker();

  //=================================================
  // Find all page/layout files
  //=================================================

  const rootComponentSymbolsByPage = new Map<string, ts.Symbol>();
  for (const rootFile of rootFiles) {
    try {
      const sourceFile = program.getSourceFile(rootFile)!;
      const sourceSymbol = checker.getSymbolAtLocation(sourceFile)!;
      const exportedSymbols = checker.getExportsOfModule(sourceSymbol);
      const defaultExportSym = exportedSymbols.find(
        (sym) => sym.getName() === "default",
      )!;
      if (!defaultExportSym) {
        throw new Error("Not found");
      }
      rootComponentSymbolsByPage.set(rootFile, defaultExportSym);
    } catch (err) {
      console.error(`Default export not found for file ${rootFile}`, err);
    }
  }

  //=================================================
  // Build route tree
  //=================================================

  const fileTree = pathsToFileTree(rootFiles, { appDir });
  const routeTree = toRouteTree(fileTree);

  // console.log(
  //   require("node:util").inspect(routeTree, { depth: undefined, colors: true }),
  // );

  //=================================================
  // Find all variants
  //=================================================

  const exportedVariantSymbols = new Set<ts.Symbol>();
  for (const resolvedFileName of variantFiles) {
    if (!fs.existsSync(resolvedFileName)) {
      throw new Error(`Variant file does not exist: ${resolvedFileName}`);
    }
    const sourceSymbol = checker.getSymbolAtLocation(
      program.getSourceFile(resolvedFileName)!,
    )!;

    const variantSymbols = checker.getExportsOfModule(sourceSymbol);

    for (const variantSymbol of variantSymbols) {
      if (variantSymbol.getName() === "default") {
        throw new Error(
          `Default exports from variant files are not supported (at ${resolvedFileName})`,
        );
      }

      const declaration = getDeclaration(variantSymbol);
      if (!ts.isVariableDeclaration(declaration)) {
        throw new Error(
          `Export ${variantSymbol.getName()} from ${path.relative(resolvedFileName, dir)} is not declared as a variable`,
        );
      }
      exportedVariantSymbols.add(variantSymbol);
    }
  }

  //=================================================
  // Find all transitive references to variants
  //=================================================

  const hasReferencesTo = new Map<ts.Symbol, Set<ts.Symbol>>();
  function addLink<K, V>(links: Map<K, Set<V>>, source: K, target: V) {
    let linkSet = links.get(source);
    if (!linkSet) links.set(source, (linkSet = new Set()));
    linkSet.add(target);
  }

  const symbolsToVisit = [...exportedVariantSymbols];
  const visitedSymbols = new Set<ts.Symbol>();

  while (symbolsToVisit.length) {
    const currentSymbol = symbolsToVisit.shift()!;
    if (visitedSymbols.has(currentSymbol)) {
      continue;
    }
    visitedSymbols.add(currentSymbol);
    const declaration = getDeclaration(currentSymbol);
    let nodeToReference: ts.Node;
    try {
      nodeToReference = getIdentifierFromDeclaration(declaration);
    } catch (err) {
      nodeToReference = declaration;
    }
    const variantNameLocation = {
      fileName: declaration.getSourceFile().fileName,
      pos: nodeToReference.pos,
    };

    const references =
      languageService.findReferences(
        variantNameLocation.fileName,
        variantNameLocation.pos,
      ) ?? [];
    const referencingSymbols = references
      .flatMap((entry) => entry.references.filter((ref) => !ref.isDefinition))
      .map((ref) => {
        const astNode = getNodeForSpan(
          program.getSourceFile(ref.fileName)!,
          ref.textSpan,
        )!;

        let enclosing = getEnclosingTopLevelNode(astNode!);
        if (ts.isImportDeclaration(enclosing)) {
          // TODO: do we need any special handling here? maybe aliased imports?
          // findReferences seems to handle aliasing just fine, so maybe not
          // if we do, we'd have to look through the importClause and look for aliases.
          // possibly pass a second arg to `getIdentifierFromDeclaration`/`getReferenceableSymbolForNode`
          // so that they can know what it's looking for.
          return;
        }
        let enclosingSymbol: ts.Symbol | undefined;
        try {
          enclosingSymbol = getReferenceableSymbolForNode(enclosing, checker);
        } catch (err) {
          console.error(err);
          enclosingSymbol = undefined;
        }

        return { reference: ref, enclosingSymbol: enclosingSymbol };
      });

    for (const reference of referencingSymbols) {
      if (!reference) continue;
      if (!reference.enclosingSymbol) {
        const getText = (ref: ts.ReferenceEntry, span: ts.TextSpan) => {
          return fs
            .readFileSync(ref.fileName, "utf-8")
            .slice(span.start, span.start + span.length);
        };
        console.error(
          "Could not find enclosing symbol for reference",
          reference.reference,
          reference.reference.contextSpan
            ? "\nin:\n  " +
                getText(reference.reference, reference.reference.contextSpan)
            : "",
        );
        continue;
      }
      if (reference.enclosingSymbol === currentSymbol) {
        console.log(
          "Warning: Circular reference:",
          debugSymbol(currentSymbol, { rootDir: dir }),
        );
        continue;
      }

      addLink(hasReferencesTo, reference.enclosingSymbol, currentSymbol);
      symbolsToVisit.unshift(reference.enclosingSymbol);
    }
  }

  //=================================================

  function findVariantReferenceChains(source: ts.Symbol): ts.Symbol[][] {
    if (exportedVariantSymbols.has(source)) {
      return [[source]];
    }
    const references = hasReferencesTo.get(source);
    if (!references) return [];
    const childChains = [...references].flatMap((referenced) =>
      findVariantReferenceChains(referenced),
    );
    return childChains.map((chain) => [source, ...chain]);
  }

  function findReferencedVariants(source: ts.Symbol): Set<ts.Symbol> {
    function findReferencedVariantsImpl(source: ts.Symbol): ts.Symbol[] {
      if (exportedVariantSymbols.has(source)) {
        return [source];
      }
      const references = hasReferencesTo.get(source);
      if (!references) return [];
      return [...references].flatMap((referenced) =>
        findReferencedVariantsImpl(referenced),
      );
    }
    return new Set(findReferencedVariantsImpl(source));
  }

  //=================================================
  // Print build info
  //=================================================

  {
    console.log(chalk.bold("Variants affecting segments:") + "\n");

    for (const [pageFile, pageSymbol] of rootComponentSymbolsByPage.entries()) {
      const chains = findVariantReferenceChains(pageSymbol);
      const showChain = (chain: ts.Symbol[]) =>
        chain.map((sym) => sym.getName()).join(" -> ");

      const referencedVariants = findReferencedVariants(pageSymbol);

      let segmentIdLine = chalk.bold("■ " + path.relative(dir, pageFile)) + ":";
      if (referencedVariants.size === 0) {
        segmentIdLine = chalk.gray(segmentIdLine);
      }

      console.log(
        unlines(
          indentEach([
            segmentIdLine,
            ...indentEach(
              referencedVariants.size === 0
                ? [chalk.gray("(none)")]
                : [...referencedVariants].flatMap((sym) => [
                    debugSymbol(sym, { rootDir: dir }),
                    ...indentEach(
                      chains
                        .filter((ch) => ch.at(-1)! === sym)
                        .map((ch) => chalk.gray(showChain(ch))),
                    ),
                  ]),
            ),
          ]),
        ) + "\n",
      );
    }
  }

  //=================================================
  // Generate config file
  //=================================================

  {
    const generatedConfigDir = path.join(appDir, ".variants");
    const generatedConfigFile = path.join(
      generatedConfigDir,
      "config.generated.js",
    );

    let curId = 0;
    const getId = () => curId++;
    const imports: string[] = [];
    const identifiers = new Map<ts.Symbol, string>();

    const start = [
      "// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT IT MANUALLY.",
      "",
      `/** @type {import('${variantsPackageRootSpecifier}/matcher').VariantMatcherConfig} */`,
      "export default {",
      "  patterns: [",
    ];
    const end = ["  ],", "};"];
    const code = [...start];

    for (const [pageFile, pageSymbol] of rootComponentSymbolsByPage.entries()) {
      // TODO: better inheritance from layouts? this is very hacky
      const affectsChildren = /(\/|^)(layout|template)\.(js|jsx|ts|tsx)$/.test(
        pageFile,
      );

      const referencedVariants = findReferencedVariants(pageSymbol);
      if (referencedVariants.size === 0) {
        continue;
      }

      const pagePathPatternSegments = path
        .relative(appDir, pageFile)
        .replace(/^\[variants\]\//, "")
        .replace(
          /(\/|^)(layout|template|page|default|error|not-found|loading)\.(js|jsx|ts|tsx)$/,
          "",
        )
        .split("/")
        .map((segment) =>
          segment.replace(/\[([^\]]+)\]/, (_, param) => ":" + param),
        );
      if (affectsChildren) {
        pagePathPatternSegments.push("*");
      }
      // add a leading '/' when joined
      // (but it might already be present for page/layout right at the [variants] level)
      if (
        pagePathPatternSegments[0] !== "" ||
        pagePathPatternSegments.length === 1
      ) {
        pagePathPatternSegments.unshift("");
      }

      const pagePathPattern = pagePathPatternSegments.join("/");

      const affectingVariantIdentifiers: string[] = [];

      for (const variantSym of referencedVariants.values()) {
        if (!identifiers.has(variantSym)) {
          const importedAs = variantSym.getName() + getId();
          identifiers.set(variantSym, importedAs);
          const source = path.relative(
            generatedConfigDir,
            getDeclaration(variantSym).getSourceFile().fileName,
          );
          imports.push(
            `import { ${variantSym.getName()} as ${importedAs} } from '${source}';`,
          );
        }
        const importedAs = identifiers.get(variantSym)!;
        affectingVariantIdentifiers.push(importedAs);
      }
      code.push(
        "    " +
          `[{ pathname: "${pagePathPattern}" }, [${affectingVariantIdentifiers.join(", ")}]],`,
      );
    }
    code.push("  ],");

    {
      code.push("  routes: (");

      type RouteTreeWithVariantSymbols = Omit<RouteTree, "children"> & {
        variants?: Record<string, ts.Symbol[]>;
        children?: RouteTreeWithVariantSymbols[];
      };

      const relativizeMutable = (tree: RouteTreeWithVariantSymbols) => {
        for (const key of allComponentKeys) {
          if (tree.components?.[key]) {
            tree.components[key] = path.relative(appDir, tree.components[key]!);
          }
        }
        return tree;
      };

      function addVariantsToRouteTree(
        tree: RouteTree,
      ): RouteTreeWithVariantSymbols {
        const { components } = tree;
        if (!tree.children) {
          const componentKey =
            components && leafComponentKeys.find((key) => key in components);
          if (!componentKey) {
            throw new Error(
              `Internal error: Didn't find any of ${JSON.stringify(leafComponentKeys)} in tree leaf`,
            );
          }
          const componentPath = components[componentKey]!;
          const pageSymbol = rootComponentSymbolsByPage.get(componentPath)!;
          const variants = findReferencedVariants(pageSymbol);
          return relativizeMutable({
            ...tree,
            variants: { [componentKey]: [...variants] },
          });
        }

        let hasVariants = false;
        const allVariants: Record<string, ts.Symbol[]> = {};
        if (components) {
          for (const componentKey of componentKeys) {
            const componentPath = components[componentKey];
            if (componentPath) {
              const pageSymbol = rootComponentSymbolsByPage.get(componentPath)!;
              const variants = findReferencedVariants(pageSymbol);
              hasVariants = true;
              allVariants[componentKey] = [...variants];
            }
          }
        }
        return relativizeMutable({
          variants: hasVariants ? allVariants : undefined,
          ...tree,
          children: tree.children?.map((child) =>
            addVariantsToRouteTree(child),
          ),
        });
      }

      const treeWithVariants = addVariantsToRouteTree(routeTree);
      function unquote(expr: string) {
        return "__$$(" + expr + ")$$__";
      }
      function applyUnqotes(code: string) {
        return code.replaceAll(/"__\$\$\((.+?)\)\$\$__"/g, (_, expr) => expr);
      }
      const serialized = applyUnqotes(
        JSON.stringify(
          treeWithVariants,
          (key, value) => {
            if (key === "variants" && value && typeof value === "object") {
              const allVariants = value as Record<string, ts.Symbol[]>;
              return Object.fromEntries(
                Object.entries(allVariants).map(([key, variants]) => [
                  key,
                  variants.map((sym) => unquote(identifiers.get(sym)!)),
                ]),
              );
            }
            return value;
          },
          2,
        ),
      );
      code.push(...indentEach(serialized.split("\n"), 2));

      code.push("  ),");
    }

    code.push("};");
    // code.push(...end);

    code.unshift(...imports, "");

    const finalCode = unlines(code);
    if (!fs.existsSync(generatedConfigDir)) {
      fs.mkdirSync(generatedConfigDir);
    }
    fs.writeFileSync(generatedConfigFile, finalCode);
    fs.writeFileSync(path.join(generatedConfigDir, ".gitignore"), "*\n");
  }
}

function getDeclaration(symbol: ts.Symbol) {
  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) {
    throw new Error(`No declarations found for ${symbol.getName()}`);
  }
  return declarations[0];
}

function debugSymbol(
  sym: ts.Symbol,
  { id = false, rootDir }: { rootDir: string; id?: boolean },
) {
  const name = sym.getName();
  const declaration = getDeclaration(sym);
  const fileName = declaration.getSourceFile().fileName;
  return `${name}${id ? "[" + (sym as any)["id"] + "]" : ""} ${chalk.grey(`(${path.relative(rootDir, fileName)})`)}`;
}

function getIdentifierFromDeclaration(
  node: ts.Node,
): ts.Identifier | ts.BindingName {
  if (ts.isFunctionDeclaration(node)) {
    if (!node.name) {
      throw new Error("Not implemented: anonymous functions");
    }
    return node.name!;
  } else if (ts.isVariableDeclaration(node)) {
    return node.name;
  } else if (ts.isExportAssignment(node)) {
    const exportName = node.name;
    if (!exportName) {
      // default export;
      return getIdentifierFromDeclaration(node.expression);
    } else {
      if (!ts.isIdentifier(exportName)) {
        throw new Error(
          `Not implemented: this weird kind of export name: ${exportName ? ts.SyntaxKind[exportName.kind] : undefined}`,
        );
      } else {
        return exportName;
      }
    }
  } else {
    throw new Error(
      `Not implemented: whatever syntax this is (${ts.SyntaxKind[node.kind]}):\n` +
        node.getFullText(),
    );
  }
}

function getReferenceableSymbolForNode(node: ts.Node, checker: ts.TypeChecker) {
  if (ts.isExportAssignment(node)) {
    const exportName = node.name;
    if (!exportName) {
      // default export;
      const defaultExportSymbol = checker
        .getExportsOfModule(checker.getSymbolAtLocation(node.getSourceFile())!)
        .find((sym) => sym.getName() === "default");
      //   console.log("defaultExportSymbol", defaultExportSymbol);
      return defaultExportSymbol;
    }
  }
  const ident = getIdentifierFromDeclaration(node);
  const sym = checker.getSymbolAtLocation(ident);
  if (!sym) {
    throw new Error(
      `Could not get symbol for node: ${ident.getFullText()} at ${ident.getSourceFile().fileName}`,
    );
  }
  return sym;
}

function getNodeForSpan(
  sourceFile: ts.SourceFile,
  span: ts.TextSpan,
): ts.Node | undefined {
  // TODO: this sucks... surely there's a nicer way to do this than traversing the whole AST???
  const pos = span.start;
  const end = span.start + span.length;
  function visit(node: ts.Node): ts.Node | undefined {
    if (node.pos <= pos && end <= node.end) {
      return ts.forEachChild(node, visit) ?? node;
    }
    return undefined;
  }
  return visit(sourceFile);
}

function getEnclosingTopLevelNode(node: ts.Node) {
  let current: ts.Node = node!;
  while (!ts.isSourceFile(current.parent)) {
    current = current.parent;
  }
  return current;
}

function indentEach(lines: string[], level: number = 1, indent = "  ") {
  return lines.map((line) => indent.repeat(level) + line);
}

function unlines(lines: string[]) {
  return lines.join("\n");
}

main();
