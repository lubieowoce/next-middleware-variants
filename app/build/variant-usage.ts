import * as fs from "node:fs";
import * as path from "node:path";
import * as ts from "typescript";
import { globSync } from "glob";
import chalk from "chalk";

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
  const rootFiles = globSync(
    ["app/**/{layout,template,page}.{js,jsx,ts,tsx}"],
    {
      cwd: dir,
      ignore: "node_modules/**",
      absolute: true,
    },
  );
  // TODO: auto-discovery via "use variant"
  const variantFiles = [path.resolve(dir, "app/variants.ts")];
  //   const variantSource = {
  //     specifier: "@/app/lib/variants",
  //     symbolName: `createVariant`,
  //   };
//   console.log(rootFiles);
  const compilerOptions = getCompilerOptions(dir);
  const languageService = createTsLanguageService(rootFiles, compilerOptions);

  const program = languageService.getProgram()!;
  const checker = program.getTypeChecker();

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

  function getDeclaration(symbol: ts.Symbol) {
    const declarations = symbol.getDeclarations();
    if (!declarations || declarations.length === 0) {
      throw new Error(`No declarations found for ${symbol.getName()}`);
    }
    return declarations[0];
  }

  function debugSymbol(sym: ts.Symbol, { id = false } = {}) {
    const name = sym.getName();
    return `${name}${id ? "[" + (sym as any)["id"] + "]" : ""} ${chalk.grey(`(${path.relative(dir, getDeclaration(sym).getSourceFile().fileName)})`)}`;
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

  function getReferenceableSymbolForNode(node: ts.Node) {
    if (ts.isFunctionDeclaration(node)) {
      if (!node.name) {
        throw new Error("Not implemented: anonymous functions");
      }
      return checker.getSymbolAtLocation(node.name);
    } else if (ts.isVariableDeclaration(node)) {
      return checker.getSymbolAtLocation(node.name);
    } else if (ts.isExportAssignment(node)) {
      const exportName = node.name;
      if (!exportName) {
        // default export;
        const defaultExportSymbol = checker
          .getExportsOfModule(
            checker.getSymbolAtLocation(node.getSourceFile())!,
          )
          .find((sym) => sym.getName() === "default");
        //   console.log("defaultExportSymbol", defaultExportSymbol);
        return defaultExportSymbol;
      } else {
        if (!ts.isIdentifier(exportName)) {
          throw new Error(
            `Not implemented: this weird kind of export name: ${exportName ? ts.SyntaxKind[exportName.kind] : undefined}`,
          );
        } else {
          return checker.getSymbolAtLocation(exportName);
        }
      }
    } else {
      throw new Error(
        `Not implemented: whatever syntax this is (${ts.SyntaxKind[node.kind]}):\n` +
          node.getFullText(),
      );
    }
  }

  const exportedVariantSymbols = new Set<ts.Symbol>();
  for (const resolvedFileName of variantFiles) {
    // console.log("variant file", resolvedFileName);
    if (!fs.existsSync(resolvedFileName)) {
      throw new Error(`Variant file does not exist: ${resolvedFileName}`);
    }
    const sourceSymbol = checker.getSymbolAtLocation(
      program.getSourceFile(resolvedFileName)!,
    )!;
    // console.log(resolvedFileName, sourceSymbol);
    const variantSymbols = checker.getExportsOfModule(sourceSymbol);

    for (const variantSymbol of variantSymbols) {
      // console.log("variant", variantSymbol.getName());

      const declaration = getDeclaration(variantSymbol);
      //   console.log(declaration);
      if (!ts.isVariableDeclaration(declaration)) {
        throw new Error(
          `Export ${variantSymbol.getName()} from ${path.relative(resolvedFileName, dir)} is not declared as a variable`,
        );
      }
      exportedVariantSymbols.add(variantSymbol);
    }
  }

  const hasReferencesTo = new Map<ts.Symbol, Set<ts.Symbol>>();
  function addLink<K, V>(links: Map<K, Set<V>>, source: K, target: V) {
    let linkSet = links.get(source);
    if (!linkSet) links.set(source, (linkSet = new Set()));
    linkSet.add(target);
  }

  const queue = [...exportedVariantSymbols];
  const visitedSymbols = new Set<ts.Symbol>();
  while (queue.length) {
    const variantSymbol = queue.shift()!;
    if (visitedSymbols.has(variantSymbol)) {
      continue;
    }
    visitedSymbols.add(variantSymbol);
    const declaration = getDeclaration(variantSymbol);
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

    // console.log("visiting", variantSymbol.getName(), "in", variantNameLocation);
    // console.log("createVariant", declaration);
    // console.log("=========================");

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
          return;
        }
        let enclosingSymbol: ts.Symbol | undefined;
        try {
          enclosingSymbol = getReferenceableSymbolForNode(enclosing);
        } catch (err) {
          console.error(err);
          enclosingSymbol = undefined;
        }

        return { reference: ref, enclosingSymbol: enclosingSymbol };
      });

    //   console.log(referencingSymbols);
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
      if (reference.enclosingSymbol === variantSymbol) {
        console.log("circular reference", variantSymbol.getName());
        continue;
      }

      addLink(hasReferencesTo, reference.enclosingSymbol, variantSymbol);
      queue.unshift(reference.enclosingSymbol);
    }
  }

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
    function inner(source: ts.Symbol): ts.Symbol[] {
      if (exportedVariantSymbols.has(source)) {
        return [source];
      }
      const references = hasReferencesTo.get(source);
      if (!references) return [];
      return [...references].flatMap((referenced) => inner(referenced));
    }
    return new Set(inner(source));
  }

  console.log("Variants affecting pages\n");

  for (const [pageFile, pageSymbol] of rootComponentSymbolsByPage.entries()) {
    const chains = findVariantReferenceChains(pageSymbol);
    //   const showChain = (chain: ts.Symbol[]) =>
    //     chain.map(debugSymbol).join(" ->\n");
    //   console.log(
    //     chalk.bold(pageFile) + "\n" + chains.map(showChain).map((s) => s + "\n").join('\n'),
    //   );
    const referencedVariants = findReferencedVariants(pageSymbol);
    console.log(
      chalk.bold(path.relative(dir, pageFile)) +
        ":\n" +
        (referencedVariants.size === 0
          ? ["(none)"]
          : [...referencedVariants].flatMap((sym) => [
              debugSymbol(sym),
              ...chains
                .filter((ch) => ch.at(-1)! === sym)
                .map((ch) =>
                  chalk.gray("  " + ch.map((s) => s.getName()).join(" -> ")),
                ),
            ])
        )
          .map((line) => "  " + line + "\n")
          .join(""),
    );
  }
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

main();
