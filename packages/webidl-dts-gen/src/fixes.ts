export const fixes = {
  inheritance: (idlString: string): string => {
    // need fix for error:
    //
    //      WebIDLParseError: Syntax error at line 49, since `interface btVector4`:
    //      btVector4 implements btVector3;
    //      ^ Unrecognised tokens
    //
    // current solution:
    // find everything that match
    //
    //      LEFT implements RIGHT;
    //
    // ignore commented out lines
    //
    // and comment them out
    // then replace all occurence
    //
    //      interface LEFT {
    //
    // with
    //
    //      interface LEFT: RIGHT {
    //
    // Handle inheritance
    const inheritance = []

    // remove comments
    const withoutComments = idlString.replace(/(\/\*[\s\S]*?\*\/|\/\/.*?$)/gm, '')

    const lines = withoutComments.split('\n')

    // find lines with inheritance statements, comment them out and store them
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      const match = /([a-zA-Z0-9_]+) implements ([a-zA-Z0-9_]+);/gi.exec(line)

      if (!match) {
        continue
      }

      const left = match[1]
      const right = match[2]

      inheritance.push({ left, right })

      lines[i] = `// ${line}`
    }

    idlString = lines.join('\n')

    // correct inheritance syntax
    inheritance.forEach(({ left, right }) => {
      idlString = idlString.replace(new RegExp(`interface ${left} {`), `interface ${left}: ${right} {`)
    })

    return idlString
  },

  array: (idlString: string): string => {
    // need fix for error:
    //
    //      WebIDLParseError: Syntax error at line 102, since `interface btTransform`:
    //        void setFromOpenGLMatrix(float[] m)
    //                                 ^ Unterminated operation
    //
    // current solution: use sequence<float> type
    return idlString
      .replace(/attribute unsigned (\w+)\[\]/gi, (_, group) => {
        return `attribute FrozenArray<unsigned ${group}>`
      })
      .replace(/attribute (\w+)\[\]/gi, (_, group) => {
        return `attribute FrozenArray<${group}>`
      })
      .replace(/unsigned (\w+)\[\]/gi, (_, group) => {
        return `FrozenArray<unsigned ${group}>`
      })
      .replace(/(\w+)\[\]/gi, (_, group) => {
        return `FrozenArray<${group}>`
      })
  },
}
