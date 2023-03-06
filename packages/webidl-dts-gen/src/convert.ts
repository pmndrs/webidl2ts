import { fixes } from './fixes'
import { convertIDL } from './convert-idl'
import { parseIDL } from './parse-idl'
import { printEmscriptenModule, printTs } from './print-ts'
import { Options } from './types'

export async function convert(idlString: string, convertOptions: Options = {}): Promise<string> {
  const options = {
    emscripten: false,
    module: 'Module',
    defaultExport: false,
    ...convertOptions,
  }

  const idl = await parseIDL(idlString, {
    preprocess: (idl: string) => {
      if (options.emscripten) {
        idl = fixes.inheritance(idl)
        idl = fixes.array(idl)
      }
      return idl
    },
  })

  const ts = convertIDL(idl, options)

  let tsString: string = null
  if (options.emscripten) {
    tsString = printEmscriptenModule(options.module, ts, options.defaultExport)
  } else {
    tsString = printTs(ts)
  }

  return tsString
}
