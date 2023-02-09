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
