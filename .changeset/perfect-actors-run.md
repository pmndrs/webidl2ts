---
"webidl-dts-gen": minor
---

fix: emscripten output for static methods

webidl-dts-gen was emitting types for c++ static methods using the typescript sttaic modifier. Emscripten uses static for binding to c++, but exposes the method on the prototype. This change makes webidl-dts-gen emit static methods as non-static methods so the types reflect the emscripten output.
