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

  describe('emscripten', () => {
    it('supports unsigned integer arrays', async () => {
      const idl = multiLine(
        'interface Foo {', //
        '    attribute unsigned long[] bar;', //
        '};', //
      )

      const ts = await convert(idl, { emscripten: true })

      expect(ts).toContain('bar: ReadonlyArray<number>;')
    })
  })
})
