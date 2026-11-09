# Current limitations (v0.1.0)

- **Provisional vocabulary.** Keywords are placeholders, not Madurese.
- No collections (lists, maps), no structs/classes, no modules/imports, no closures or first-class functions.
- No `for` loop, `break` or `continue`.
- No string interpolation; use `+` and `str(...)`.
- Functions cannot access top-level variables.
- Integers are limited to the safe integer range (+-9007199254740991); overflow is a runtime error.
- Recursion depth is limited to 1000 calls.
- Narrowing works only for immutable bindings and only inside the guarded block (no early-return narrowing).
- The parser reports only the first syntax error.
- Tree-walking interpreter: not optimised for speed.
- No debugger, formatter, language server or syntax-highlighting grammar.
- Only tested on Node.js v22 on Linux. Termux/Android is untested.
- Not published to npm. No installer or editor plugins yet.
- Aruna Junior / Junior+ / Advanced / Developer levels are not implemented.
