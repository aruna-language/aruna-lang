import test from 'node:test';
import assert from 'node:assert/strict';
import { messages, codes, diagnose } from './helpers.js';

const ok = src => assert.deepEqual(messages(src), []);
const bad = (src, code) => assert.ok(codes(src).includes(code), `expected ${code}, got ${JSON.stringify(messages(src))}`);

test('infers types from initialisers', () => {
  ok('let a = 1\nlet b = 2.5\nlet c = "x"\nlet d = true\nlet e: int = a + 1');
});
test('rejects a mismatched annotation', () => bad('let a: int = "x"', 'E203'));
test('rejects mixing int and float', () => bad('print 1 + 2.5', 'E204'));
test('rejects adding string and int', () => bad('print "a" + 1', 'E204'));
test('rejects a non-bool condition', () => bad('if 1 { print 1 }', 'E203'));
test('rejects unknown names and functions', () => { bad('print z', 'E201'); bad('print nope(1)', 'E201'); });
test('rejects redeclaration in the same scope', () => bad('let a = 1\nlet a = 2', 'E202'));
test('allows shadowing in an inner block', () => ok('let a = 1\nif true {\n let a = "x"\n print a\n}'));
test('rejects assignment to an immutable binding', () => bad('let a = 1\na = 2', 'E206'));
test('rejects assignment of the wrong type', () => bad('var a = 1\na = "x"', 'E203'));
test('cannot infer a type from null', () => bad('let a = null', 'E208'));
test('arithmetic type rules', () => { ok('print 7 % 2'); bad('print 7.5 % 2.0', 'E204'); bad('print -"a"', 'E204'); bad('print !1', 'E204'); });
test('comparing different types is an error', () => bad('print 1 == "a"', 'E204'));

test('nullable: nullable values cannot be used directly', () => {
  bad('let n = to_int("1")\nprint n + 1', 'E205');
  bad('let n: int = to_int("1")', 'E203');
});
test('nullable: null can be stored only in a nullable type', () => {
  ok('var n: int? = null\nn = 3');
  bad('let n: int = null', 'E203');
});
test('nullable: ?? yields the non-null type', () => ok('let n = to_int("1") ?? 0\nlet m: int = n + 1'));
test('nullable: ?? on a non-nullable value is an error', () => bad('let n = 1\nprint n ?? 2', 'E205'));
test('nullable: != null narrows an immutable binding', () => {
  ok('let n = to_int("1")\nif n != null {\n print n + 1\n}');
  ok('let n = to_int("1")\nif n == null {\n print 0\n} else {\n print n + 1\n}');
  ok('let n = to_int("1")\nif n != null && n > 0 {\n print n\n}');
});
test('nullable: narrowing does not leak outside the block', () => {
  bad('let n = to_int("1")\nif n != null {\n print 1\n}\nprint n + 1', 'E205');
});
test('nullable: mutable variables are not narrowed', () => {
  bad('var n = to_int("1")\nif n != null {\n print n + 1\n}', 'E205');
});
test('nullable: comparing a non-nullable value with null is an error', () => bad('let n = 1\nprint n == null', 'E205'));

test('functions: argument count and types are checked', () => {
  const f = 'fn add(a: int, b: int): int {\n return a + b\n}\n';
  ok(f + 'print add(1, 2)');
  bad(f + 'print add(1)', 'E207');
  bad(f + 'print add(1, "x")', 'E203');
});
test('functions: may be called before they are defined', () => ok('print f()\nfn f(): int {\n return 1\n}'));
test('functions: return type is enforced', () => {
  bad('fn f(): int {\n return "x"\n}', 'E203');
  bad('fn f() {\n return 1\n}', 'E209');
  bad('fn f(): int {\n return\n}', 'E209');
  bad('return 1', 'E209');
});
test('functions: all paths must return a value', () => {
  bad('fn f(a: int): int {\n if a > 0 {\n return 1\n }\n}', 'E209');
  ok('fn f(a: int): int {\n if a > 0 {\n return 1\n } else {\n return 2\n }\n}');
});
test('functions: a loop that is not `while true` does not guarantee a return', () => bad('fn f(a: int): int {\n while a > 0 {\n  return 1\n }\n}', 'E209'));
test('functions: cannot use a function with no value', () => bad('fn f() {\n}\nlet x = f()', 'E210'));
test('functions: cannot shadow a built-in', () => bad('fn len(a: string): int {\n return 1\n}', 'E202'));
test('functions: cannot see top-level variables in v0.1.0', () => bad('let g = 1\nfn f(): int {\n return g\n}', 'E201'));
test('built-ins are type-checked', () => { bad('print len(1)', 'E203'); bad('print to_int()', 'E207'); ok('print len("abc") + 1'); });
test('an expression statement must be a call', () => bad('1 + 2', 'E210'));
test('errors do not cascade from an earlier error', () => assert.equal(diagnose('let a = z\nprint a + 1').length, 1));
