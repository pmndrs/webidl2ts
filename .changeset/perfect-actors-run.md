---
"webidl-dts-gen": minor
---

fix: emscripten output for static methods

webidl-dts-gen was emitting c++ static methods as typescript static methods. Emscripten uses the static modifier for binding, but exposes the method on the prototype. This change makes webidl-dts-gen emit static methods as non-static methods so the types reflect the emscripten output.
