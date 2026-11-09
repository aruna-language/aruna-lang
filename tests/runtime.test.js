import test from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../compiler/index.js';
import { execute, ArunaRuntimeError } from '../runtime/interpreter.js';
import { run, profile } from './helpers.js';

test('prints values', () => assert.equal(run('print "hi"\nprint 1\nprint true'), 'hi\n1\ntrue\n'));
test('arithmetic and precedence', () => assert.equal(run('print 1 + 2 * 3\nprint (1 + 2) * 3\nprint 10 - 4 - 3'), '7\n9\n3\n'));
test('integer division truncates; modulo follows the dividend', () => assert.equal(run('print 7 / 2\nprint -7 / 2\nprint 7 % 3\nprint -7 % 3'), '3\n-3\n1\n-1\n'));
test('floats print with a decimal point', () => assert.equal(run('print 2.0\nprint 2.5 * 2.0\nprint 1.5 / 2.0'), '2.0\n5.0\n0.75\n'));
test('string concatenation and str()', () => assert.equal(run('print "a" + "b" + str(1) + str(true) + str(2.0)'), 'ab1true2.0\n'));
test('len counts characters', () => assert.equal(run('print len("aruna")\nprint len("")'), '5\n0\n'));
test('comparison and logic', () => assert.equal(run('print 1 < 2 && 2 <= 2\nprint 1 == 2 || !false\nprint "a" == "a"'), 'true\ntrue\ntrue\n'));
test('&& and || short-circuit', () => {
  assert.equal(run('fn boom(): bool {\n print "boom"\n return true\n}\nprint false && boom()\nprint true || boom()'), 'false\ntrue\n');
});
test('variables, assignment and block scope', () => {
  assert.equal(run('var a = 1\nif true {\n var a = 5\n a = a + 1\n print a\n}\nprint a'), '6\n1\n');
});
test('if / else if / else', () => {
  const src = n => `let n = ${n}\nif n < 0 {\n print "neg"\n} else if n == 0 {\n print "zero"\n} else {\n print "pos"\n}`;
  assert.equal(run(src(-1)), 'neg\n'); assert.equal(run(src(0)), 'zero\n'); assert.equal(run(src(5)), 'pos\n');
});
test('while loop', () => assert.equal(run('var i = 0\nvar s = 0\nwhile i < 4 {\n i = i + 1\n s = s + i\n}\nprint s'), '10\n'));
test('functions and recursion', () => {
  assert.equal(run('fn fib(n: int): int {\n if n < 2 {\n return n\n }\n return fib(n - 1) + fib(n - 2)\n}\nprint fib(15)'), '610\n');
});
test('early return inside a loop', () => {
  assert.equal(run('fn first(): int {\n var i = 0\n while true {\n  i = i + 1\n  if i == 3 {\n   return i\n  }\n }\n}\nprint first()'), '3\n');
});
test('nullable: ?? and narrowing at runtime', () => {
  assert.equal(run('let a = to_int("7")\nlet b = to_int("x")\nprint a ?? 0\nprint b ?? -1\nif a != null {\n print a + 1\n}\nprint b'), '7\n-1\n8\nnull\n');
});
test('to_int parsing rules', () => assert.equal(run('print to_int(" 12 ") ?? 0\nprint to_int("1.5") ?? 0\nprint to_int("-4") ?? 0\nprint to_int("") ?? 0'), '12\n0\n-4\n0\n'));
test('read_line returns null at end of input', () => {
  assert.equal(run('let a = read_line()\nlet b = read_line()\nprint a ?? "none"\nprint b ?? "none"', { stdin: ['hello'] }), 'hello\nnone\n');
});

const runtimeError = src => {
  const { program, diagnostics } = compile(src, { profile });
  assert.deepEqual(diagnostics, []);
  assert.throws(() => execute(program, { write() {} }), e => e instanceof ArunaRuntimeError);
  try { execute(program, { write() {} }); } catch (e) { return e; }
};
test('division by zero is a runtime error', () => {
  assert.match(runtimeError('print 1 / 0').message, /division by zero/);
  assert.match(runtimeError('print 1 % 0').message, /division by zero/);
  assert.match(runtimeError('print 1.0 / 0.0').message, /division by zero/);
});
test('integer overflow is detected', () => {
  assert.match(runtimeError('var a = 9007199254740991\nprint a + 1').message, /overflow/);
});
test('runaway recursion is a runtime error, not a crash', () => {
  assert.match(runtimeError('fn f(n: int): int {\n return f(n + 1)\n}\nprint f(0)').message, /call stack limit/);
});
test('recursion up to the limit works', () => {
  assert.equal(run('fn d(n: int): int {\n if n == 0 {\n return 0\n }\n return 1 + d(n - 1)\n}\nprint d(990)'), '990\n');
});
test('runtime errors report a position', () => {
  const e = runtimeError('print 1\nprint 1 / 0');
  assert.equal(e.line, 2);
});
