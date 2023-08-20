# webidl-dts-gen

## 1.5.0

### Minor Changes

- 3868ce5: fix: emscripten enum values should be numbers

## 1.4.0

### Minor Changes

- a7dfc9f: fix: correct types for attribute 'set\_' setter function

### Patch Changes

- 8ef87f9: chore: bump jsdom

## 1.3.1

### Patch Changes

- 821b3ce: chore(deps): bump yargs from 17.7.1 to 17.7.2
- 282e836: chore(deps): bump webidl2 from 24.2.2 to 24.3.0

## 1.3.0

### Minor Changes

- 51dac39: feat: add missing emscripten function declarations

## 1.2.0

### Minor Changes

- cae15bf: fix: types for emscripten array attributes and getters

### Patch Changes

- 0999cd1: chore(deps): bump jsdom from 21.1.1 to 22.0.0

## 1.1.1

### Patch Changes

- c873687: feat: set emscripten enum variable declaration types to be 'any' instead of 'unknown'

## 1.1.0

### Minor Changes

- afc8c20: feat: improve output types for emscripten enums

  The emscripten webidl binder exposes enum values using enum member names. e.g. `Module.MemberName`, not `Module.EnumName.MemberName`. The output types now reflect this.

  Also, types for the emscripten enum wrapper functions are now exposed, e.g. `_emscripten_enum_EnumName_MemberName`

### Patch Changes

- aeb6fae: fix(convertInterface): only create type alias if maplike or setlike

## 1.0.2

### Patch Changes

- ede3f21: chore(deps): update yargs, jsdom, dev dependencies

## 1.0.1

### Patch Changes

- fix: README.md

## 1.0.0

### Major Changes

- d682ec2: chore: release v1.0.0!

### Minor Changes

- acff4b1: chore(deps): bump typescript from 4.9.5 to 5.0.4

### Patch Changes

- 75633d0: chore(deps): bump webidl2 from 23.13.1 to 24.2.2

## 0.0.3

### Patch Changes

- de70031: fix: stop using deprecated ts.factory.createClassDeclaration overload

## 0.0.2

### Patch Changes

- ff89ac3: feat: handle nullable with null type union - @darionco
- bfa7f69: fix: return emscripten class declaration
- 26c1429: feat: upgrade to typescript v4.9.5, stop using deprecated methods
- 1481825: feat: handle unsigned integer array types, use capturing groups for integer array fixes
- 6815b8b: feat: support static operations
- aa22582: feat: add support for maplike and setlike - @darionco
