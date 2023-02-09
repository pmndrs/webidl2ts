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
})
