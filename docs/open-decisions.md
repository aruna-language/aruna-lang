# Open decisions (need the creator)

The compiler infrastructure is finished. These decisions are **not** made and must not be guessed.

## 1. Madurese vocabulary and grammar (blocking for "official" syntax)

Needed: authentic, natural Madurese for these concepts:

- immutable declaration, mutable declaration
- function declaration, return
- if, else if, else, while
- print / output
- true, false, null
- type names (int, float, string, bool)
- built-in names (convert to string, length, parse integer, read a line)
- how natural Madurese word order should shape statements

Process: fill `keywords/approved.js` with an approved profile (same shape as `keywords/provisional.js`). The CLI will switch to it automatically and `aruna --version` will stop saying "provisional".

The creator's reference sentence `bayang akhi be'en Andik pesse pas kabellih jejen` has **not** been interpreted or converted into syntax.

## 2. Nullable notation

`T?` (for example `int?`) is used in v0.1.0 as a proposal. It is not final.

## 3. Other grammar proposals still provisional

- block delimiters `{ }` and statement separators (line break or `;`)
- `let` / `var` for mutability
- `//` comments
- `??` default operator

## 4. License

No LICENSE file exists. The creator must choose one before the first public release.

## 5. Learning levels

Aruna Junior, Junior+, Advanced and Developer are not implemented. v0.1.0 is a single core intended to support all four later, without separate runtimes.
