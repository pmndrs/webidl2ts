import { expect, describe, it } from 'vitest'
import * as prettier from 'prettier'
import { convert } from '../src/convert'

describe('convert', () => {
  it('supports operations', async () => {
    const idl = `
      interface Foo {
          void bar();
      };
    `

    const ts = await convert(idl)

    const expected = `
      interface Foo {
          bar(): void;
      }
    `

    await expectSourceToBeEqual(ts, expected)
  })

  it('supports static operations', async () => {
    const idl = `
      interface Foo {
          static void bar();
      };
    `

    const actual = await convert(idl)

    expect(actual).toContain('interface Foo {')
    expect(actual).toContain('static bar(): void;')
  })

  it('supports creating interfaces for namespaces', async () => {
    const idl = `
      namespace Foo {
          void bar();
      };
    `

    const actual = await convert(idl)

    const expected = `
      interface Foo {
          bar(): void;
      }
    `

    await expectSourceToBeEqual(actual, expected)
  })

  it('supports maplike declarations', async () => {
    const idl = `
      interface Foo {
          maplike<unsigned long, DOMString>;
      };
    `

    const actual = await convert(idl)

    const expected = `
      type Foo = Map<number, string>;
    `

    await expectSourceToBeEqual(actual, expected)
  })

  it('supports setlike declarations', async () => {
    const idl = `
      interface Foo {
          setlike<unsigned long>;
      };
    `

    const actual = await convert(idl)

    const expected = `
      type Foo = Set<number>;
    `

    await expectSourceToBeEqual(actual, expected)
  })

  it('support nullable types', async () => {
    const idl = `
      interface Foo {
          attribute long? bar;
      };
    `

    const actual = await convert(idl)

    const expected = `
      interface Foo {
          bar: number | null;
      }
    `

    await expectSourceToBeEqual(actual, expected)
  })

  it('converts enums to union types', async () => {
    const idl = `
      enum Foo {
          "bar",
          "baz"
      };
    `

    const actual = await convert(idl)

    const expected = `
      type Foo = "bar" | "baz";
    `

    await expectSourceToBeEqual(actual, expected)
  })

  describe('emscripten', () => {
    it('supports emscripten enums', async () => {
      const idl = `
        enum Foo {
            "bar",
            "baz"
        };
      `

      const actual = await convert(idl, { emscripten: true })

      const expected = withDefaultEmscriptenOutput(`
        const bar: number;
        const baz: number;
        type Foo = typeof bar | typeof baz;
        function _emscripten_enum_Foo_bar(): Foo;
        function _emscripten_enum_Foo_baz(): Foo;
      `)

      await expectSourceToBeEqual(actual, expected)
    })

    it('supports emscripten enums declared in namespaces', async () => {
      const idl = `
        enum Foo {
            "namespace::bar",
            "namespace::baz"
        };
      `

      const actual = await convert(idl, { emscripten: true })

      const expected = withDefaultEmscriptenOutput(`
        const bar: number;
        const baz: number;
        type Foo = typeof bar | typeof baz;
        function _emscripten_enum_Foo_bar(): Foo;
        function _emscripten_enum_Foo_baz(): Foo;
      `)

      await expectSourceToBeEqual(actual, expected)
    })

    it('omits duplicate emscripten enum member names from the generated types', async () => {
      const idl = `
        enum Foo {
            "namespace::bar",
            "namespace::baz"
        };
        enum Bar {
            "namespace::bar",
            "namespace::baz"
        };
      `

      const actual = await convert(idl, { emscripten: true })

      const expected = withDefaultEmscriptenOutput(`
        const bar: number;
        const baz: number;
        type Foo = typeof bar | typeof baz;
        function _emscripten_enum_Foo_bar(): Foo;
        function _emscripten_enum_Foo_baz(): Foo;
        type Bar = typeof bar | typeof baz;
        function _emscripten_enum_Bar_bar(): Bar;
        function _emscripten_enum_Bar_baz(): Bar;
      `)

      await expectSourceToBeEqual(actual, expected)
    })

    it('supports non array attributes', async () => {
      const idl = `
        interface Foo {
            attribute float position;
        };
      `

      const actual = await convert(idl, { emscripten: true })

      const expected = withDefaultEmscriptenOutput(`
        class Foo {
            get_position(): number;
            set_position(position: number): void;
            position: number;
        }
      `)

      await expectSourceToBeEqual(actual, expected)
    })

    it('supports array attributes', async () => {
      const idl = `
        interface Foo {
            attribute float[] position;
        };
      `

      const actual = await convert(idl, { emscripten: true })

      const expected = withDefaultEmscriptenOutput(`
        class Foo {
            get_position(index: number): number;
            set_position(index: number, position: number): void;
            position: number;
        }
      `)

      await expectSourceToBeEqual(actual, expected)
    })

    it('supports implements', async () => {
      const idl = `
        interface Foo {
            void bar();
        };
        interface Baz {
        };
        Baz implements Foo;
      `

      const actual = await convert(idl, { emscripten: true })

      const expected = withDefaultEmscriptenOutput(`
        class Foo {
            bar(): void;
        }
        class Baz extends Foo {
        }
      `)

      await expectSourceToBeEqual(actual, expected)
    })

    it('supports "implements" identifiers with underscores', async () => {
      const idl = `
        interface Foo_Bar {
            void bar();
        };
        interface Baz_Bal {
        };
        Baz_Bal implements Foo_Bar;
      `

      const actual = await convert(idl, { emscripten: true })

      const expected = withDefaultEmscriptenOutput(`
        class Foo_Bar {
            bar(): void;
        }
        class Baz_Bal extends Foo_Bar {
        }
      `)

      await expectSourceToBeEqual(actual, expected)
    })

    it('ignores commented out "implements" expressions', async () => {
      const idl = `
        interface Foo {
            void bar();
        };
        interface Baz {
        };
        // Baz implements Foo;
      `

      const actual = await convert(idl, { emscripten: true })

      const expected = withDefaultEmscriptenOutput(`
        class Foo {
            bar(): void;
        }
        class Baz {
        }
      `)

      await expectSourceToBeEqual(actual, expected)
    })

    it('ignores multiline commented out "implements" expressions', async () => {
      const idl = `
        interface Foo {
            void bar();
        };
        interface Baz {
        };
        /*
        Baz implements Foo;
        */  
      `

      const actual = await convert(idl, { emscripten: true })

      const expected = withDefaultEmscriptenOutput(`
        class Foo {
            bar(): void;
        }
        class Baz {
        }
      `)

      await expectSourceToBeEqual(actual, expected)
    })

    it('supports unsigned integer arrays', async () => {
      const idl = `
        interface Foo {
            attribute unsigned long[] bar;
        };
      `

      const actual = await convert(idl, { emscripten: true })

      expect(actual).toContain('get_bar(index: number): number;')
    })

    it('supports static methods', async () => {
      const idl = `
        interface Foo {
            [Value] static Quat sIdentity();
        };
      `

      const ts = await convert(idl, { emscripten: true })

      expect(ts).toContain('sIdentity(): Quat;')
      expect(ts).not.toContain('static sIdentity(): Quat;')
    })

    it('emits correct types for JSImplementation', async () => {
      const idl = `
        interface ShapeFilter {
            void ShapeFilter();
        };
        [JSImplementation="ShapeFilter"]
        interface ShapeFilterJS {
          void ShapeFilterJS();
          [Const] boolean ShouldCollide([Const] Shape inShape2, [Const, Ref] SubShapeID inSubShapeIDOfShape2);
        };
      `

      const ts = await convert(idl, { emscripten: true })

      expect(ts).toContain('class ShapeFilter {')
      expect(ts).toContain('class ShapeFilterJS extends ShapeFilter {')
      expect(ts).toContain('ShouldCollide(inShape2: number, inSubShapeIDOfShape2: number): boolean;')
    })

    it('implements statement should take precedence over JSImplementation for inheritance', async () => {
      const idl = `
        interface PathConstraintPath {
          boolean IsLooping();
          void SetIsLooping(boolean inIsLooping);
          unsigned long GetRefCount();
          void AddRef();
          void Release();
        };
        
        interface PathConstraintPathEm {
        };
        
        PathConstraintPathJS implements PathConstraintPath;
        
        [JSImplementation="PathConstraintPathEm"]
        interface PathConstraintPathJS {
          [Const] void PathConstraintPathJS();
          [Const] float GetPathMaxFraction();
          [Const] float GetClosestPoint([Const] Vec3 inPosition, float inFractionHint);
          [Const] void GetPointOnPath(float inFraction, Vec3 outPathPosition, Vec3 outPathTangent, Vec3 outPathNormal, Vec3 outPathBinormal);
        };
      `

      const ts = await convert(idl, { emscripten: true })

      expect(ts).toContain('class PathConstraintPath {')
      expect(ts).toContain('class PathConstraintPathJS extends PathConstraintPath {')
    })
  })
})

async function expectSourceToBeEqual(a: string, b: string) {
  const removeEmptyLines = (str: string) =>
    str
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n')

  const format = async (str: string) => removeEmptyLines(await prettier.format(str, { parser: 'typescript' }))

  const aFormatted = await format(a)
  const bFormatted = await format(b)

  expect(aFormatted).toBe(bFormatted)
}

function withDefaultEmscriptenOutput(...lines: string[]) {
  return `
    declare function Module<T>(target?: T): Promise<T & typeof Module>;
    declare module Module {
        function destroy(obj: any): void;
        function _malloc(size: number): number;
        function _free(ptr: number): void;
        function wrapPointer<C extends new (...args: any) => any>(ptr: number, Class: C): InstanceType<C>;
        function getPointer(obj: unknown): number;
        function castObject<C extends new (...args: any) => any>(object: unknown, Class: C): InstanceType<C>;
        function compare(object1: unknown, object2: unknown): boolean;
        const HEAP8: Int8Array;
        const HEAP16: Int16Array;
        const HEAP32: Int32Array;
        const HEAPU8: Uint8Array;
        const HEAPU16: Uint16Array;
        const HEAPU32: Uint32Array;
        const HEAPF32: Float32Array;
        const HEAPF64: Float64Array;
${lines.join('\n')}
    }
  `
}
