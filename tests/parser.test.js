import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from '../compiler/lexer.js';
import { parse } from '../compiler/parser.js';
import { profile } from './helpers.js';

const ast = src => parse(tokenize(src, profile), profile);
const fails = (src, re) => assert.throws(() => ast(src), e => e.code === 'E101' && re.test(e.message));

test('parses let and var', () => {
  const [a, b] = ast('let x = 1\nvar y: int? = null').body;
  assert.equal(a.kind, 'Let'); assert.equal(a.mutable, false);
  assert.equal(b.mutable, true); assert.equal(b.annot.nullable, true);
});
test('respects operator precedence', () => {
  const e = ast('print 1 + 2 * 3').body[0].expr;
  assert.equal(e.op, '+'); assert.equal(e.r.op, '*');
});
test('?? is right associative and lowest precedence', () => {
  const e = ast('print a ?? b ?? c').body[0].expr;
  assert.equal(e.op, '??'); assert.equal(e.r.op, '??');
});
test('parses functions, if/else if/else and while', () => {
  const p = ast('fn f(a: int, b: string): int {\n return 1\n}\nif true { print 1 } else if false { print 2 } else { print 3 }\nwhile true { print 4 }');
  assert.equal(p.body[0].kind, 'FnDecl'); assert.equal(p.body[0].params.length, 2);
  assert.equal(p.body[1].else.kind, 'If');
  assert.equal(p.body[2].kind, 'While');
});
test('semicolons separate statements', () => {
  assert.equal(ast('print 1; print 2').body.length, 2);
});
test('reports a missing expression', () => fails('let x =', /expected an expression/));
test('reports a missing closing brace', () => fails('if true {\nprint 1\n', /expected '}'/));
test('reports two statements on one line', () => fails('print 1 print 2', /expected end of line/));
test('reports a stray else', () => fails('print 1\nelse { }', /unexpected 'else'/));
test('functions cannot be nested', () => fails('if true {\nfn f() { }\n}', /top level/));
test('reports a missing type after a colon', () => fails('let x: = 1', /expected a type/));
test('syntax errors carry a position', () => {
  assert.throws(() => ast('print 1\nlet = 2'), e => e.line === 2);
});
