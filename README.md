# Aruna Programming Language

**Programming with Identity.**

Aruna is an original general-purpose programming language created by Iky Dev, inspired by everyday Madurese. This repository contains **v0.1.0, an early preview**: a small but real language that you can type-check and run.

> **Read this first.** The keywords in v0.1.0 are **provisional placeholders** (`let`, `print`, `if`, ...). They are **not Madurese** and make no linguistic claim. The Madurese vocabulary and grammar must be approved by the creator before they become official. See [docs/open-decisions.md](docs/open-decisions.md).

- Official website: https://aruna-web-official.pages.dev/
- Source file extension: `.an`
- Status: early preview, experimental, not production-ready

## What works in v0.1.0

- Static typing with type inference for local variables
- Types: `int`, `float`, `string`, `bool`, and nullable `T?`
- Immutable (`let`) and mutable (`var`) variables
- Arithmetic, comparison, logical and string operators, plus `??` for nullable defaults
- `if` / `else if` / `else`, `while`
- Functions with typed parameters and return types, including recursion
- Safe nullable handling with narrowing (`if x != null { ... }`)
- Built-ins: `print`, `str`, `len`, `to_int`, `read_line`
- Compiler diagnostics with line, column, source excerpt and hints
- CLI: `aruna run`, `aruna check`, `aruna --version`, `aruna --help`

Not implemented yet: see [docs/limitations.md](docs/limitations.md).

## Requirements and installation

Aruna v0.1.0 needs **Node.js 18 or newer** and has **no other dependencies**. It is not published to npm yet.

```bash
git clone https://github.com/aruna-language/aruna.git
cd aruna
node cli/aruna.js --version
```

To get an `aruna` command on your PATH:

```bash
npm link
aruna --version
```

Tested on: Node.js v22 on Linux. Android Termux has **not** been tested yet.

## Getting started

Create `hello.an`:

```
print "Hello, Aruna!"
```

```bash
aruna run hello.an      # prints: Hello, Aruna!
aruna check hello.an    # prints: ok: hello.an
```

More programs are in [examples/](examples/). `examples/type-error.an` is intentionally invalid and shows the diagnostics.

## Documentation

- [Language reference](docs/language-reference.md) - syntax, types, variables, expressions, errors
- [CLI reference](docs/cli.md)
- [Architecture](docs/architecture.md)
- [Open decisions](docs/open-decisions.md)
- [Current limitations](docs/limitations.md)
- [Roadmap](docs/roadmap.md)
- [Release notes v0.1.0](docs/release-notes-v0.1.0.md)

## Running the tests

```bash
npm test
```

## License

Not chosen yet. The creator must pick a license before the first public release (see [docs/open-decisions.md](docs/open-decisions.md)).
