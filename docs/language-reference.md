# Language reference (v0.1.0)

All keywords shown here are **provisional placeholders**, not Madurese. They live in `keywords/provisional.js` and can be replaced without changing the compiler.

## Source files and comments

Source files use the `.an` extension and UTF-8 encoding. A statement ends at a line break or `;`. Line breaks inside parentheses are ignored. `//` starts a comment that runs to the end of the line.

## Data types

| Type | Values | Example |
|------|--------|---------|
| `int` | whole numbers (safe integer range, +-9007199254740991) | `42` |
| `float` | decimal numbers | `2.5` |
| `string` | text in double quotes; escapes `\n \t \" \\` | `"hi"` |
| `bool` | `true`, `false` | `true` |
| `T?` | a `T` or `null` | `int?` |

There are no implicit conversions. `1 + 2.5` is a type error. Use `str(...)` to turn a value into a string.

## Variables

```
let name = "Aruna"        // immutable, type inferred: string
var count = 0             // mutable, type inferred: int
let ratio: float = 2.5    // explicit type
var maybe: int? = null    // explicit type is required for null
count = count + 1         // assignment only works for var
```

A variable cannot be declared twice in the same scope. An inner block may shadow an outer name.

## Expressions

Precedence, from lowest to highest:

1. `??`  (right associative)
2. `||`
3. `&&`
4. `==` `!=`
5. `<` `<=` `>` `>=`
6. `+` `-`
7. `*` `/` `%`
8. unary `-` `!`

Rules:

- `+ - * /` need two operands of the same numeric type. `+` also joins two strings.
- `int / int` is integer division, truncating toward zero. `%` works on `int` only and takes the sign of the left operand.
- Comparison operators work on two numbers of the same type. `==` and `!=` work on two values of the same type, or on a nullable value and `null`.
- `&&` and `||` need `bool` operands and short-circuit.

## Conditionals and loops

```
if n < 0 {
  print "negative"
} else if n == 0 {
  print "zero"
} else {
  print "positive"
}

while i < 10 {
  i = i + 1
}
```

Conditions must be `bool`. `else` must follow the closing `}` on the same line.

## Functions

```
fn add(a: int, b: int): int {
  return a + b
}

fn greet(who: string) {      // no return type: returns no value
  print "Hello, " + who
}
```

- Parameter types are required. The return type is omitted for functions that return nothing.
- Functions can be called before they are defined, and may be recursive (maximum depth: 1000 calls).
- A function with a return type must return on every path. `while true` counts as never falling through.
- Functions are declared at the top level only and cannot see top-level variables in v0.1.0.

## Nullable values

A value of type `T?` cannot be used where `T` is required. Ways to handle it:

```
let n = to_int("42")        // int?

print n ?? 0                // default value: int
if n != null {
  print n + 1               // n is narrowed to int in this block
}
```

Narrowing applies only to immutable bindings (`let` and parameters), inside the guarded block. It also works in `else` after `==`, and with `&&` / `||` / `!`.

## Built-in functions

| Function | Type | Description |
|----------|------|-------------|
| `print x` | statement | print any value followed by a newline; `null` prints as `null`; floats always show a decimal point |
| `str(x)` | `any -> string` | convert a value to text |
| `len(s)` | `string -> int` | number of characters |
| `to_int(s)` | `string -> int?` | parse a whole number, `null` if invalid |
| `read_line()` | `-> string?` | next line of standard input, `null` at end of input |

## Errors

Diagnostics have a code, position, source excerpt and often a hint:

```
error[E204]: cannot apply '+' to int and float
 --> examples/type-error.an:4:13
  |
4 | print count + ratio
  |             ^
  = help: Aruna never converts between int and float implicitly
```

| Code | Meaning |
|------|---------|
| E001-E004 | lexical errors (character, string, escape, number) |
| E101 | syntax error |
| E199 | program nested too deeply |
| E201 | unknown name or function |
| E202 | duplicate declaration |
| E203 | type mismatch |
| E204 | operator not defined for these types |
| E205 | nullable misuse |
| E206 | assignment to an immutable binding |
| E207 | wrong number of arguments |
| E208 | type cannot be inferred |
| E209 | return problems |
| E210 | other semantic errors |
| E301 | runtime error (division by zero, integer overflow, call stack limit) |

The parser stops at the first syntax error. The type checker reports all type errors it finds.
