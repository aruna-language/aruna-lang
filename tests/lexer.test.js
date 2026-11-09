import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from '../compiler/lexer.js';
import { ArunaError } from '../compiler/diagnostics.js';
import { profile } from './helpers.js';

const kinds = src => tokenize(src, profile).map(t => `${t.type}:${t.value}`);

test('tokenizes a declaration', () => {
  assert.deepEqual(kinds('let x = 1 + 2'), ['kw:let', 'ident:x', 'op:=', 'int:1', 'op:+', 'int:2', 'eof:null']);
});
test('distinguishes int and float literals', () => {
  assert.deepEqual(kinds('1 2.5'), ['int:1', 'float:2.5', 'eof:null']);
});
test('recognises two-character operators', () => {
  assert.deepEqual(kinds('a ?? b != c <= d && e || f'), ['ident:a', 'op:??', 'ident:b', 'op:!=', 'ident:c', 'op:<=', 'ident:d', 'op:&&', 'ident:e', 'op:||', 'ident:f', 'eof:null']);
});
test('handles string escapes', () => {
  assert.equal(tokenize('"a\\n\\"b\\\\"', profile)[0].value, 'a\n"b\\');
});
test('skips comments and tracks lines', () => {
  const t = tokenize('// note\nprint 1', profile);
  const p = t.find(x => x.type === 'kw');
  assert.equal(p.line, 2);
  assert.equal(p.col, 1);
});
test('newlines inside parentheses do not end the statement', () => {
  assert.ok(!tokenize('f(1,\n2)', profile).some(t => t.type === 'nl'));
});
test('rejects an unterminated string', () => {
  assert.throws(() => tokenize('print "abc', profile), e => e instanceof ArunaError && e.code === 'E002');
});
test('rejects an unknown escape', () => {
  assert.throws(() => tokenize('"\\q"', profile), e => e.code === 'E003');
});
test('rejects an unexpected character', () => {
  assert.throws(() => tokenize('let @ = 1', profile), e => e.code === 'E001' && e.col === 5);
});
test('rejects an integer literal that is too large', () => {
  assert.throws(() => tokenize('99999999999999999999', profile), e => e.code === 'E004');
});
test('vocabulary comes from the profile, not from the lexer', () => {
  const custom = { ...profile, name: 'custom', keywords: { ...profile.keywords, let: 'xlet' } };
  assert.equal(tokenize('xlet a = 1', custom)[0].type, 'kw');
  assert.equal(tokenize('let a = 1', custom)[0].type, 'ident');
});
