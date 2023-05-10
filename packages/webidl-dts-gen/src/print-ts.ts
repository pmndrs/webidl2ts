import * as ts from 'typescript'

export function printTs(nodes: ts.Statement[]): string {
  const file = ts.createSourceFile(`index.d.ts`, '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS)
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
  return nodes.map((it) => printer.printNode(ts.EmitHint.Unspecified, it, file)).join('\n')
}

export function printEmscriptenModule(moduleName: string, nodes: ts.Statement[], defaultExport: boolean): string {
  const result: ts.Statement[] = []
  if (defaultExport) {
    // adds default export
    //    export default Module;
    result.push(
      ts.factory.createExportAssignment(
        /* modifiers      */ [ts.factory.createModifier(ts.SyntaxKind.DefaultKeyword)],
        /* isExportEquals */ false,
        /* expression     */ ts.factory.createIdentifier(moduleName),
      ),
    )
  }

  // adds module function
  //    declare function Module<T>(target?: T): Promise<T & typeof Module>;
  result.push(
    ts.factory.createFunctionDeclaration(
      /* modifiers      */ [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
      /* asteriskToken  */ undefined,
      /* name           */ moduleName,
      /* typeParameters */ [ts.factory.createTypeParameterDeclaration([], 'T')],
      /* parameters     */ [
        ts.factory.createParameterDeclaration(
          [],
          undefined,
          'target',
          ts.factory.createToken(ts.SyntaxKind.QuestionToken),
          ts.factory.createTypeReferenceNode('T', []),
        ),
      ],
      /* type           */ ts.factory.createTypeReferenceNode('Promise', [
        ts.factory.createIntersectionTypeNode([
          ts.factory.createTypeReferenceNode('T', []),
          ts.factory.createTypeQueryNode(ts.factory.createIdentifier(moduleName)),
        ]),
      ]),
      /* body           */ undefined,
    ),
  )

  // adds module declaration with all types
  //    export declare module Module {
  //      ...
  //    }
  result.push(
    ts.factory.createModuleDeclaration(
      /* modifiers  */ [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
      /* name       */ ts.factory.createIdentifier(moduleName),
      /* body       */ ts.factory.createModuleBlock([...emscriptenAdditions(), ...nodes]),
    ),
  )

  return printTs(result)
}

function emscriptenAdditions() {
  const result: ts.Statement[] = []

  // add emscripten function declarations
  const emscriptenFunctionDeclarations = [
    'function destroy(obj: any): void',
    'function _malloc(size: number): number',
    'function _free(ptr: number): void',
    'function wrapPointer<C extends new (...args: any) => any>(ptr: number, Class: C): InstanceType<C>',
    'function getPointer(obj: unknown): number',
    'function castObject<C extends new (...args: any) => any>(object: unknown, Class: C): InstanceType<C>',
    'function compare(object1: unknown, object2: unknown): boolean',
  ].map((sourceText: string) => {
    const sourceFile = ts.createSourceFile('', sourceText, ts.ScriptTarget.ESNext, false, ts.ScriptKind.TS)
    return sourceFile.statements[0] as ts.FunctionDeclaration
  })

  result.push(...emscriptenFunctionDeclarations)

  // adds HEAP* properties
  const heaps = [
    ['HEAP8', Int8Array.name],
    ['HEAP16', Int16Array.name],
    ['HEAP32', Int32Array.name],
    ['HEAPU8', Uint8Array.name],
    ['HEAPU16', Uint16Array.name],
    ['HEAPU32', Uint32Array.name],
    ['HEAPF32', Float32Array.name],
    ['HEAPF64', Float64Array.name],
  ]

  for (const [name, type] of heaps) {
    result.push(
      ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(name),
              undefined,
              ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(type), undefined),
            ),
          ],
          ts.NodeFlags.Const,
        ),
      ),
    )
  }

  return result
}
