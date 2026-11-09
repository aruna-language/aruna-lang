# CLI reference

```
aruna run <file.an>     type-check and run a program
aruna check <file.an>   type-check only
aruna --version         version and syntax profile
aruna --help            help
```

Without `npm link`, use `node cli/aruna.js` instead of `aruna`.

Source files must have the `.an` extension.

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | the program has syntax or type errors (nothing is run) |
| 2 | usage error, unknown command, wrong extension, or unreadable file |
| 3 | runtime error |

Program output goes to standard output. Diagnostics go to standard error.

## `--version`

```
aruna 0.1.0 (early preview)
syntax profile: provisional (placeholder vocabulary, not Madurese, pending creator approval)
```

These commands were taken from the proposed CLI in the project brief without changes.
