import * as ts from 'typescript'
import * as webidl2 from 'webidl2'
import { Options } from './types'

const bufferSourceTypes = [
  'ArrayBuffer',
  'ArrayBufferView',
  'DataView',
  'Int8Array',
  'Uint8Array',
  'Int16Array',
  'Uint16Array',
  'Uint8ClampedArray',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
]
const integerTypes = ['byte', 'octet', 'short', 'unsigned short', 'long', 'unsigned long', 'long long', 'unsigned long long']
const stringTypes = ['ByteString', 'DOMString', 'USVString', 'CSSOMString']
const floatTypes = ['float', 'unrestricted float', 'double', 'unrestricted double']
const sameTypes = ['any', 'boolean', 'Date', 'Function', 'Promise', 'void']
const baseTypeConversionMap = new Map<string, string>([
  ...[...bufferSourceTypes].map((type) => [type, type] as [string, string]),
  ...[...integerTypes].map((type) => [type, 'number'] as [string, string]),
  ...[...floatTypes].map((type) => [type, 'number'] as [string, string]),
  ...[...stringTypes].map((type) => [type, 'string'] as [string, string]),
  ...[...sameTypes].map((type) => [type, type] as [string, string]),
  ['object', 'any'],
  ['sequence', 'Array'],
  ['record', 'Record'],
  ['FrozenArray', 'ReadonlyArray'],
  ['EventHandler', 'EventHandler'],
  ['VoidPtr', 'unknown'],
])

export function convertIDL(rootTypes: webidl2.IDLRootType[], options: Options = {}): ts.Statement[] {
  const nodes: ts.Statement[] = []

  for (const rootType of rootTypes) {
    switch (rootType.type) {
      case 'interface':
      case 'interface mixin':
      case 'dictionary':
      case 'namespace':
        nodes.push(convertInterface(rootType, options))
        for (const attr of rootType.extAttrs) {
          if (attr.name === 'Exposed' && attr.rhs?.value === 'Window') {
            nodes.push(
              ts.factory.createVariableStatement(
                [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
                ts.factory.createVariableDeclarationList(
                  [
                    ts.factory.createVariableDeclaration(
                      ts.factory.createIdentifier(rootType.name),
                      undefined,
                      ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(rootType.name), undefined),
                      undefined,
                    ),
                  ],
                  undefined,
                ),
              ),
            )
          }
        }
        break
      case 'includes':
        nodes.push(convertInterfaceIncludes(rootType))
        break
      case 'enum':
        nodes.push(convertEnum(rootType))
        break
      case 'callback':
        nodes.push(convertCallback(rootType))
        break
      case 'typedef':
        nodes.push(convertTypedef(rootType))
        break
      default:
        console.log(newUnsupportedError('Unsupported IDL type', rootType))
        break
    }
  }

  return nodes
}

type CreateMethodProps = {
  modifiers?: ts.Modifier[]
  name: string
  questionToken?: ts.QuestionToken
  typeParameters?: ts.TypeParameterDeclaration[]
  parameters?: ts.ParameterDeclaration[]
  type?: ts.TypeNode
  emscripten: boolean
}

function createMethod({ modifiers, name, questionToken, typeParameters, parameters, type, emscripten }: CreateMethodProps) {
  if (emscripten) {
    return ts.factory.createMethodDeclaration(modifiers, undefined, name, questionToken, typeParameters, parameters, type, undefined)
  }

  return ts.factory.createMethodSignature(modifiers, name, questionToken, typeParameters, parameters, type)
}

type CreatePropertyProps = {
  modifiers: ts.Modifier[]
  name: string | ts.PropertyName
  questionOrExclamationToken: ts.QuestionToken | ts.ExclamationToken
  type: ts.TypeNode
  emscripten: boolean
}

function createProperty({ modifiers, name, questionOrExclamationToken, type, emscripten }: CreatePropertyProps) {
  if (emscripten) {
    return ts.factory.createPropertyDeclaration(modifiers, name, questionOrExclamationToken, type, undefined)
  }

  return ts.factory.createPropertySignature(modifiers, name, questionOrExclamationToken as ts.QuestionToken, type)
}

function convertTypedef(idl: webidl2.TypedefType) {
  return ts.factory.createTypeAliasDeclaration([], ts.factory.createIdentifier(idl.name), undefined, convertType(idl.idlType))
}

function createIterableMethods(
  name: string,
  keyType: ts.TypeNode,
  valueType: ts.TypeNode,
  pair: boolean,
  async: boolean,
  { emscripten }: Options,
) {
  return [
    createMethod({
      name: async ? '[Symbol.asyncIterator]' : '[Symbol.iterator]',
      type: ts.factory.createExpressionWithTypeArguments(
        ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'),
        pair ? [ts.factory.createTupleTypeNode([keyType, valueType])] : [valueType],
      ),
      emscripten,
    }),
    createMethod({
      name: 'entries',
      type: ts.factory.createExpressionWithTypeArguments(
        ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'),
        [ts.factory.createTupleTypeNode([keyType, valueType])],
      ),
      emscripten,
    }),
    createMethod({
      name: 'keys',
      type: ts.factory.createExpressionWithTypeArguments(
        ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'),
        [keyType],
      ),
      emscripten,
    }),
    createMethod({
      name: 'values',
      type: ts.factory.createExpressionWithTypeArguments(
        ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'),
        [valueType],
      ),
      emscripten,
    }),
    createMethod({
      name: 'forEach',
      parameters: [
        ts.factory.createParameterDeclaration(
          [],
          undefined,
          'callbackfn',
          undefined,
          ts.factory.createFunctionTypeNode(
            [],
            [
              ts.factory.createParameterDeclaration([], undefined, 'value', undefined, valueType),
              ts.factory.createParameterDeclaration([], undefined, pair ? 'key' : 'index', undefined, keyType),
              ts.factory.createParameterDeclaration(
                [],
                undefined,
                pair ? 'iterable' : 'array',
                undefined,
                pair ? ts.factory.createTypeReferenceNode(name, []) : ts.factory.createArrayTypeNode(valueType),
              ),
            ],
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
          ),
        ),
        ts.factory.createParameterDeclaration(
          [],
          undefined,
          'thisArg',
          ts.factory.createToken(ts.SyntaxKind.QuestionToken),
          ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
        ),
      ],
      type: ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
      emscripten,
    }),
  ]
}

function convertInterface(
  idl: webidl2.InterfaceType | webidl2.DictionaryType | webidl2.InterfaceMixinType | webidl2.NamespaceType,
  options: Options,
) {
  const members: (ts.TypeElement | ts.ClassElement)[] = []
  const inheritance = []
  if ('inheritance' in idl && idl.inheritance) {
    inheritance.push(ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(idl.inheritance), undefined))
  }

  idl.members.forEach((member: webidl2.IDLInterfaceMemberType | webidl2.FieldType) => {
    switch (member.type) {
      case 'attribute':
        if (options.emscripten) {
          members.push(createAttributeGetter(member, options))
          members.push(createAttributeSetter(member, options))
        }
        members.push(convertMemberAttribute(member, options))
        break
      case 'operation':
        if (member.name === idl.name) {
          members.push(convertMemberConstructor(member, options))
        } else {
          members.push(convertMemberOperation(member, options))
        }
        break
      case 'constructor':
        members.push(convertMemberConstructor(member, options))
        break
      case 'field':
        members.push(convertMemberField(member, options))
        break
      case 'const':
        members.push(convertMemberConst(member, options))
        break
      case 'iterable': {
        type Members = Array<webidl2.IDLInterfaceMemberType | webidl2.FieldType | webidl2.IDLInterfaceMixinMemberType>
        const indexedPropertyGetter = (idl.members as Members).find(
          (member): member is webidl2.OperationMemberType =>
            member.type === 'operation' && member.special === 'getter' && member.arguments[0].idlType.idlType === 'unsigned long',
        )

        if ((indexedPropertyGetter && member.idlType.length === 1) || member.idlType.length === 2) {
          const keyType = convertType(indexedPropertyGetter ? indexedPropertyGetter.arguments[0].idlType : member.idlType[0])
          const valueType = convertType(member.idlType[member.idlType.length - 1])
          members.push(...createIterableMethods(idl.name, keyType, valueType, member.idlType.length === 2, member.async, options))
        }
        break
      }
      case 'setlike':
        inheritance.push(
          ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(member.readonly ? 'ReadonlySet' : 'Set'), [
            convertType(member.idlType[0]),
          ]),
        )
        break
      case 'maplike':
        inheritance.push(
          ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(member.readonly ? 'ReadonlyMap' : 'Map'), [
            convertType(member.idlType[0]),
            convertType(member.idlType[1]),
          ]),
        )
        break
      default:
        console.log(newUnsupportedError('Unsupported IDL member', member))
        break
    }
  })

  if (inheritance.length === 1 && !members.length) {
    return ts.factory.createTypeAliasDeclaration(undefined, ts.factory.createIdentifier(idl.name), undefined, inheritance[0])
  }

  if (options.emscripten) {
    return ts.factory.createClassDeclaration(
      [],
      ts.factory.createIdentifier(idl.name),
      undefined,
      !inheritance.length ? undefined : [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, inheritance)],
      members as ts.ClassElement[],
    )
  }

  return ts.factory.createInterfaceDeclaration(
    undefined,
    ts.factory.createIdentifier(idl.name),
    undefined,
    !inheritance.length ? undefined : [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, inheritance)],
    members as ts.TypeElement[],
  )
}

function convertInterfaceIncludes(idl: webidl2.IncludesType) {
  return ts.factory.createInterfaceDeclaration(
    [],
    ts.factory.createIdentifier(idl.target),
    undefined,
    [
      ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
        ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(idl.includes), undefined),
      ]),
    ],
    [],
  )
}

function createAttributeGetter(value: webidl2.AttributeMemberType, { emscripten }: Options) {
  return createMethod({
    name: 'get_' + value.name,
    type: convertType(value.idlType),
    emscripten,
  })
}

function createAttributeSetter(value: webidl2.AttributeMemberType, { emscripten }: Options) {
  const parameter = ts.factory.createParameterDeclaration([], undefined, value.name, undefined, convertType(value.idlType))

  return createMethod({
    name: 'set_' + value.name,
    type: ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
    parameters: [parameter],
    emscripten: emscripten,
  })
}

function convertMemberOperation(idl: webidl2.OperationMemberType, { emscripten }: Options) {
  const parameters = idl.arguments.map(convertArgument)
  const modifiers: ts.Modifier[] = []

  if (idl.special === 'static') {
    modifiers.push(ts.factory.createModifier(ts.SyntaxKind.StaticKeyword))
  }

  return createMethod({
    modifiers,
    name: idl.name,
    type: convertType(idl.idlType),
    parameters,
    emscripten,
  })
}

function convertMemberConstructor(idl: webidl2.ConstructorMemberType | webidl2.OperationMemberType, { emscripten }: Options) {
  const args = idl.arguments.map(convertArgument)

  if (emscripten) {
    return ts.factory.createMethodDeclaration([], undefined, 'constructor', undefined, [], args, undefined, undefined)
  }
  return ts.factory.createConstructSignature([], args, undefined)
}

function convertMemberField(idl: webidl2.FieldType, { emscripten }: Options) {
  const optional = !idl.required ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined

  return createProperty({
    modifiers: undefined,
    name: ts.factory.createIdentifier(idl.name),
    questionOrExclamationToken: optional,
    type: convertType(idl.idlType),
    emscripten,
  })
}

function convertMemberConst(idl: webidl2.ConstantMemberType, { emscripten }: Options) {
  const modifiers = [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)]

  return createProperty({
    modifiers,
    name: ts.factory.createIdentifier(idl.name),
    questionOrExclamationToken: undefined,
    type: convertType(idl.idlType),
    emscripten,
  })
}

function convertMemberAttribute(idl: webidl2.AttributeMemberType, { emscripten }: Options) {
  return createProperty({
    modifiers: [idl.readonly ? ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword) : null].filter((it) => it != null),
    name: ts.factory.createIdentifier(idl.name),
    questionOrExclamationToken: undefined,
    type: convertType(idl.idlType),
    emscripten,
  })
}

function convertArgument(idl: webidl2.Argument) {
  const optional = idl.optional ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined

  return ts.factory.createParameterDeclaration([], undefined, idl.name, optional, convertType(idl.idlType))
}

function makeFinalType(type: ts.TypeNode, idl: webidl2.IDLTypeDescription): ts.TypeNode {
  if (idl.nullable) {
    return ts.factory.createUnionTypeNode([type, ts.factory.createLiteralTypeNode(ts.factory.createNull())])
  }
  return type
}

function convertType(idl: webidl2.IDLTypeDescription): ts.TypeNode {
  if (typeof idl.idlType === 'string') {
    const type = baseTypeConversionMap.get(idl.idlType) || idl.idlType

    switch (type) {
      case 'number':
        return makeFinalType(ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), idl)
      case 'string':
        return makeFinalType(ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), idl)
      case 'void':
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword)
      default:
        return makeFinalType(ts.factory.createTypeReferenceNode(type, []), idl)
    }
  }

  if (idl.generic) {
    const type = baseTypeConversionMap.get(idl.generic) || idl.generic
    const typeReferenceNode = ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(type), idl.idlType.map(convertType))
    return makeFinalType(typeReferenceNode, idl)
  }

  if (idl.union) {
    return ts.factory.createUnionTypeNode(idl.idlType.map(convertType))
  }

  console.log(newUnsupportedError('Unsupported IDL type', idl))
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
}

function convertEnum(idl: webidl2.EnumType) {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    ts.factory.createIdentifier(idl.name),
    undefined,
    ts.factory.createUnionTypeNode(idl.values.map((it) => ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(it.value)))),
  )
}

function convertCallback(idl: webidl2.CallbackType) {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    ts.factory.createIdentifier(idl.name),
    undefined,
    ts.factory.createFunctionTypeNode(undefined, idl.arguments.map(convertArgument), convertType(idl.idlType)),
  )
}

function newUnsupportedError(message: string, idl: unknown) {
  return new Error(`
  ${message}
  ${JSON.stringify(idl, null, 2)}

  Please file an issue at https://github.com/pmndrs/webidl-dts-gen and provide the used idl file or example.
`)
}