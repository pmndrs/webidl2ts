import { expect, describe, it } from '@jest/globals'
import { convert } from '../src/convert'
import { multiLine } from './utils'

describe('convert', () => {
  it('supports operations', async () => {
    const idl = multiLine(
      'interface Foo {', //
      '    void bar();', //
      '};', //
    )

    const ts = await convert(idl)

    expect(ts).toBe(
      multiLine(
        'interface Foo {', //
        '    bar(): void;', //
        '}', //
      ),
    )
  })

  it('supports static operations', async () => {
    const idl = multiLine(
      'interface Foo {', //
      '    static void bar();', //
      '};', //
    )

    const ts = await convert(idl)

    expect(ts).toBe(
      multiLine(
        'interface Foo {', //
        '    static bar(): void;', //
        '}', //
      ),
    )
  })

  it('supports creating interfaces for namespaces', async () => {
    const idl = multiLine(
      'namespace Foo {', //
      '    void bar();', //
      '};', //
    )

    const ts = await convert(idl)

    expect(ts).toBe(
      multiLine(
        'interface Foo {', //
        '    bar(): void;', //
        '}', //
      ),
    )
  })

  it('supports maplike declarations', async () => {
    const idl = multiLine(
      'interface Foo {', //
      '    maplike<unsigned long, DOMString>;', //
      '};', //
    )

    const ts = await convert(idl)

    expect(ts).toBe(
      multiLine(
        'type Foo = Map<number, string>;', //
      ),
    )
  })

  it('supports setlike declarations', async () => {
    const idl = multiLine(
      'interface Foo {', //
      '    setlike<unsigned long>;', //
      '};', //
    )

    const ts = await convert(idl)

    expect(ts).toBe(
      multiLine(
        'type Foo = Set<number>;', //
      ),
    )
  })

  it('support nullable types', async () => {
    const idl = multiLine(
      'interface Foo {', //
      '    attribute long? bar;', //
      '};', //
    )

    const ts = await convert(idl)

    expect(ts).toBe(
      multiLine(
        'interface Foo {', //
        '    bar: number | null;', //
        '}', //
      ),
    )
  })

  it('converts enums to union types', async () => {
    const idl = multiLine(
      'enum Foo {', //
      '    "bar",', //
      '    "baz"', //
      '};', //
    )

    const ts = await convert(idl)

    expect(ts).toBe(
      multiLine(
        'type Foo = "bar" | "baz";', //
      ),
    )
  })

  describe('emscripten', () => {
    it('supports emscripten enums', async () => {
      const idl = multiLine(
        'enum Foo {', //
        '    "bar",', //
        '    "baz"', //
        '};', //
      )

      const ts = await convert(idl, { emscripten: true })

      expect(ts).toBe(
        withDefaultEmscriptenOutput(
          'const bar: number;', //
          'const baz: number;', //
          'type Foo = typeof bar | typeof baz;', //
          'function _emscripten_enum_Foo_bar(): Foo;', //
          'function _emscripten_enum_Foo_baz(): Foo;', //
        ),
      )
    })

    it('supports emscripten enums declared in namespaces', async () => {
      const idl = multiLine(
        'enum Foo {', //
        '    "namespace::bar",', //
        '    "namespace::baz"', //
        '};', //
      )

      const ts = await convert(idl, { emscripten: true })

      expect(ts).toBe(
        withDefaultEmscriptenOutput(
          'const bar: number;', //
          'const baz: number;', //
          'type Foo = typeof bar | typeof baz;', //
          'function _emscripten_enum_Foo_bar(): Foo;', //
          'function _emscripten_enum_Foo_baz(): Foo;', //
        ),
      )
    })

    it('omits duplicate emscripten enum member names from the generated types', async () => {
      const idl = multiLine(
        'enum Foo {', //
        '    "namespace::bar",', //
        '    "namespace::baz"', //
        '};', //
        'enum Bar {', //
        '    "namespace::bar",', //
        '    "namespace::baz"', //
        '};', //
      )

      const ts = await convert(idl, { emscripten: true })

      expect(ts).toBe(
        withDefaultEmscriptenOutput(
          'const bar: number;', //
          'const baz: number;', //
          'type Foo = typeof bar | typeof baz;', //
          'function _emscripten_enum_Foo_bar(): Foo;', //
          'function _emscripten_enum_Foo_baz(): Foo;', //
          'type Bar = typeof bar | typeof baz;', //
          'function _emscripten_enum_Bar_bar(): Bar;', //
          'function _emscripten_enum_Bar_baz(): Bar;', //
        ),
      )
    })

    it('supports non array attributes', async () => {
      const idl = multiLine(
        'interface Foo {', //
        '    attribute float position;', //
        '};', //
      )

      const ts = await convert(idl, { emscripten: true })

      expect(ts).toBe(
        withDefaultEmscriptenOutput(
          'class Foo {', //
          '    get_position(): number;', //
          '    set_position(position: number): void;', //
          '    position: number;', //
          '}', //
        ),
      )
    })

    it('supports array attributes', async () => {
      const idl = multiLine(
        'interface Foo {', //
        '    attribute float[] position;', //
        '};', //
      )

      const ts = await convert(idl, { emscripten: true })

      expect(ts).toBe(
        withDefaultEmscriptenOutput(
          'class Foo {', //
          '    get_position(index: number): number;', //
          '    set_position(index: number, position: number): void;', //
          '    position: number;', //
          '}', //
        ),
      )
    })

    it('supports implements', async () => {
      const idl = multiLine(
        'interface Foo {', //
        '    void bar();', //
        '};', //
        'interface Baz {', //
        '};', //
        'Baz implements Foo;', //
      )
      const ts = await convert(idl, { emscripten: true })

      expect(ts).toBe(
        withDefaultEmscriptenOutput(
          'class Foo {', //
          '    bar(): void;', //
          '}', //
          'class Baz extends Foo {', //
          '}', //
        ),
      )
    })

    it('supports unsigned integer arrays', async () => {
      const idl = multiLine(
        'interface Foo {', //
        '    attribute unsigned long[] bar;', //
        '};', //
      )

      const ts = await convert(idl, { emscripten: true })

      expect(ts).toContain('get_bar(index: number): number;')
    })

    it('supports static methods', async () => {
      const idl = multiLine(
        'interface Foo {', //
        '    [Value] static Quat sIdentity();', //
        '};', //
      )

      const ts = await convert(idl, { emscripten: true })

      expect(ts).toContain('sIdentity(): Quat;')
      expect(ts).not.toContain('static sIdentity(): Quat;')
    })

    it('supports correct types for JSImplementation', async () => {
      const idl = multiLine(
        '[JSImplementation="ShapeFilter"]', //
        'interface ShapeFilterJS {', //
        '  void ShapeFilterJS();', //
        '  [Const] boolean ShouldCollide([Const] Shape inShape2, [Const, Ref] SubShapeID inSubShapeIDOfShape2);', //
        '};', //
      )

      const ts = await convert(idl, { emscripten: true })

      expect(ts).toContain('ShouldCollide(inShape2: number, inSubShapeIDOfShape2: number): boolean;')
    })
  })
})

function withDefaultEmscriptenOutput(...lines: string[]) {
  return multiLine(
    'declare function Module<T>(target?: T): Promise<T & typeof Module>;',
    'declare module Module {',
    '    function destroy(obj: any): void;',
    '    function _malloc(size: number): number;',
    '    function _free(ptr: number): void;',
    '    function wrapPointer<C extends new (...args: any) => any>(ptr: number, Class: C): InstanceType<C>;',
    '    function getPointer(obj: unknown): number;',
    '    function castObject<C extends new (...args: any) => any>(object: unknown, Class: C): InstanceType<C>;',
    '    function compare(object1: unknown, object2: unknown): boolean;',
    '    const HEAP8: Int8Array;',
    '    const HEAP16: Int16Array;',
    '    const HEAP32: Int32Array;',
    '    const HEAPU8: Uint8Array;',
    '    const HEAPU16: Uint16Array;',
    '    const HEAPU32: Uint32Array;',
    '    const HEAPF32: Float32Array;',
    '    const HEAPF64: Float64Array;',
    ...lines.map((l) => `    ${l}`),
    '}',
  )
}
