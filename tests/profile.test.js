import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfile, provisional, approved, activeProfile } from '../keywords/index.js';
import { run } from './helpers.js';

test('the provisional profile is valid', () => assert.doesNotThrow(() => validateProfile(provisional)));
test('duplicate words are rejected', () => {
  const bad = { ...provisional, name: 'bad', keywords: { ...provisional.keywords, let: 'var' } };
  assert.throws(() => validateProfile(bad), /used twice/);
});
test('missing words are rejected', () => {
  const bad = { ...provisional, name: 'bad', types: { int: 'int' } };
  assert.throws(() => validateProfile(bad), /must be a valid word/);
});
test('no approved Madurese profile exists yet, so the active profile is provisional', () => {
  assert.equal(approved, null);
  assert.equal(activeProfile.name, 'provisional');
});
test('a program runs unchanged under a different vocabulary', () => {
  const alt = {
    name: 'alt',
    keywords: { let: 'a1', var: 'a2', fn: 'a3', return: 'a4', if: 'a5', else: 'a6', while: 'a7', print: 'a8', true: 'a9', false: 'b1', null: 'b2' },
    types: { int: 't1', float: 't2', string: 't3', bool: 't4' },
    builtins: { str: 'f1', len: 'f2', toInt: 'f3', readLine: 'f4' },
  };
  validateProfile(alt);
  assert.equal(run('a3 add(x: t1, y: t1): t1 {\n a4 x + y\n}\na1 n = f3("5")\na5 n != b2 {\n a8 add(n, 1)\n}', { p: alt }), '6\n');
});
