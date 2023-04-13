#!/usr/bin/env node

import * as fs from 'fs'
import * as yargs from 'yargs'
import { convert } from './convert'
import { fetchIDL } from './fetch-idl'
import type { Options } from './types'

async function main() {
  const argv = yargs
    .wrap(null)
    .scriptName('webidl-dts-gen')
    .usage('Usage: $0 [options]')
    .example('$0 -i https://www.w3.org/TR/webxr/ -o webxr.d.ts', 'Generate from online documentation')
    .example('$0 -i https://www.khronos.org/registry/webgl/specs/latest/2.0/webgl2.idl -o webgl.d.ts', 'Generate from online idl file')
    .example('$0 -i ./my.idl -o my.d.ts', 'Generate local idl file')
    .example('$0 -i ./ammo.idl -o ammo.d.ts -n Ammo -ed', 'Generate a d.ts with default export for Ammo')
    .example('$0 -i ./ammo.idl -o ammo.d.ts -n Ammo -e', 'Generate a d.ts with ambient declaration only for Ammo')

    .help('h')
    .alias('h', 'help')

    .option('i', {
      describe: 'Input file or url',
      alias: 'in',
      demand: true,
    })
    .option('o', {
      describe: 'Output file path',
      alias: 'out',
      demand: true,
    })
    .option('e', {
      describe: 'Enable Emscripten mode',
      alias: 'emscripten',
      default: false,
      boolean: true,
    })
    .option('n', {
      describe: 'Name of the module (emscripten mode)',
      alias: 'name',
      default: 'Module',
    })
    .option('d', {
      describe: 'Write default export (emscripten mode)',
      alias: 'default-export',
      default: false,
      boolean: true,
    }).parseSync()

  const input = argv.i as string
  const output = argv.o as string

  const options: Options = {
    emscripten: argv.e,
    defaultExport: argv.d,
    module: argv.n,
  }

  if (!input) {
    process.exit(1)
  }

  const idlString = await fetchIDL(input)

  const tsString = await convert(idlString, options)

  fs.writeFileSync(output, tsString)
}

main()
