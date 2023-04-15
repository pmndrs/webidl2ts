---
"webidl-dts-gen": minor
---

feat: improve output types for emscripten enums
  
The emscripten webidl binder exposes enum values using enum member names. e.g. `Module.MemberName`, not `Module.EnumName.MemberName`. The output types now reflect this.

Also, types for the emscripten enum wrapper functions are now exposed, e.g. `_emscripten_enum_EnumName_MemberName`
