# Architecture

```
Source (.an) -> Lexer -> Parser -> AST -> Checker (types, inference, nullability) -> Interpreter
```

| Directory | Responsibility |
|-----------|----------------|
| `keywords/` | vocabulary profiles (provisional now, approved later) |
| `compiler/` | lexer, parser, checker, types, diagnostics |
| `runtime/` | tree-walking interpreter |
| `cli/` | command-line interface |
| `tests/` | automated tests (`node --test`) |

## Implementation language

JavaScript (ES modules), no dependencies, no build step. Reasons: runs wherever Node.js runs (including the creator's Termux workflow), tests can run immediately, and the same code can later power an in-browser playground. TypeScript was considered; it was not used because no TypeScript compiler was available to verify the build in the development environment.

## Execution strategy: trade-offs

| Option | Pros | Cons |
|--------|------|------|
| Tree-walking interpreter (chosen) | simplest, easy to test, errors map directly to source positions | slower than a VM |
| Bytecode VM | faster, closer to a real compiler | more code, harder to debug, not needed for v0.1.0 |
| Transpile to JavaScript | fast execution | risks Aruna looking like a wrapper around another language |

## Vocabulary is data, not code

The lexer maps surface words to semantic ids using a profile. The parser and checker only see ids. Replacing the provisional words with an approved Madurese glossary means editing one file (`keywords/approved.js`); the compiler does not change. A test runs the same program under a completely different vocabulary to enforce this.

## Type checker

Single pass over the AST after hoisting function signatures. It annotates each expression with its type, which the interpreter uses (for example to choose integer or float division and to format floats). Error types suppress follow-up errors.
