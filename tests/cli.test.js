import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI = new URL('../cli/aruna.js', import.meta.url).pathname;
const aruna = (args, opts = {}) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', ...opts });
const dir = mkdtempSync(join(tmpdir(), 'aruna-'));
const file = (name, src) => { const p = join(dir, name); writeFileSync(p, src); return p; };
const ex = n => new URL(`../examples/${n}.an`, import.meta.url).pathname;

test('--version prints version and syntax profile', () => {
  const r = aruna(['--version']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^aruna 0\.1\.0 \(early preview\)/);
  assert.match(r.stdout, /provisional/);
});
test('--help exits 0 and lists commands', () => {
  const r = aruna(['--help']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /aruna run <file\.an>/); assert.match(r.stdout, /aruna check/);
});
test('no arguments is a usage error', () => assert.equal(aruna([]).status, 2));
test('unknown command is a usage error', () => { const r = aruna(['bogus']); assert.equal(r.status, 2); assert.match(r.stderr, /unknown command/); });
test('run without a file is a usage error', () => assert.equal(aruna(['run']).status, 2));
test('a missing file exits 2', () => { const r = aruna(['run', join(dir, 'nope.an')]); assert.equal(r.status, 2); assert.match(r.stderr, /cannot read/); });
test('a file without the .an extension is rejected', () => {
  const r = aruna(['run', file('x.txt', 'print 1')]); assert.equal(r.status, 2); assert.match(r.stderr, /\.an/);
});
test('run executes a program', () => {
  const r = aruna(['run', ex('hello')]); assert.equal(r.status, 0); assert.equal(r.stdout, 'Hello, Aruna!\n');
});
test('check succeeds on a valid program without running it', () => {
  const r = aruna(['check', file('ok.an', 'print "must not print"')]);
  assert.equal(r.status, 0); assert.match(r.stdout, /^ok: /); assert.doesNotMatch(r.stdout, /must not print/);
});
test('check and run report type errors with exit code 1', () => {
  for (const cmd of ['check', 'run']) {
    const r = aruna([cmd, ex('type-error')]);
    assert.equal(r.status, 1); assert.equal(r.stdout, '');
    assert.match(r.stderr, /error\[E204\]/); assert.match(r.stderr, /error\[E205\]/); assert.match(r.stderr, /type-error\.an:4:13/);
  }
});
test('syntax errors exit 1 with a source excerpt', () => {
  const r = aruna(['check', file('syn.an', 'let x =\n')]);
  assert.equal(r.status, 1); assert.match(r.stderr, /error\[E101\]/); assert.match(r.stderr, /let x =/);
});
test('runtime errors exit 3', () => {
  const r = aruna(['run', file('rt.an', 'print "before"\nprint 1 / 0')]);
  assert.equal(r.status, 3); assert.equal(r.stdout, 'before\n'); assert.match(r.stderr, /division by zero/);
});
test('read_line reads from standard input', () => {
  const r = aruna(['run', file('in.an', 'let n = read_line() ?? "?"\nprint "got " + n')], { input: 'abc\n' });
  assert.equal(r.status, 0); assert.equal(r.stdout, 'got abc\n');
});
test('read_line returns null on empty input', () => {
  const r = aruna(['run', file('in2.an', 'print read_line() ?? "none"')], { input: '' });
  assert.equal(r.stdout, 'none\n');
});
test('bundled examples produce the expected output', () => {
  const expected = {
    hello: 'Hello, Aruna!\n',
    variables: 'Aruna v3\n5.0\n3\n1\ntrue\n',
    functions: 'Hello, Aruna!\n3628800\n',
    loop: 'sum of 1..5 = 15\n',
    nullable: '42\n-1\n43\n',
  };
  for (const [n, out] of Object.entries(expected)) {
    const r = aruna(['run', ex(n)]);
    assert.equal(r.status, 0, n); assert.equal(r.stdout, out, n);
  }
});
