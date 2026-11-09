#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { compile } from '../compiler/index.js';
import { format } from '../compiler/diagnostics.js';
import { execute, ArunaRuntimeError } from '../runtime/interpreter.js';
import { activeProfile, isProvisional } from '../keywords/index.js';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const HELP = `Aruna ${pkg.version} (early preview) - Programming with Identity.

Usage:
  aruna run <file.an>     type-check and run a program
  aruna check <file.an>   type-check only, do not run
  aruna --version         print version information
  aruna --help            show this help

Exit codes:
  0  success
  1  the program has syntax or type errors
  2  command-line usage error or unreadable file
  3  runtime error
`;
const out = s => process.stdout.write(s);
const err = s => process.stderr.write(s);

function main(argv) {
  const [cmd, file, ...rest] = argv;
  if (cmd === undefined) { err(HELP); return 2; }
  if (cmd === '--help' || cmd === '-h') { out(HELP); return 0; }
  if (cmd === '--version' || cmd === '-v') {
    out(`aruna ${pkg.version} (early preview)\n`);
    out(`syntax profile: ${activeProfile.name}${isProvisional ? ' (placeholder vocabulary, not Madurese, pending creator approval)' : ''}\n`);
    return 0;
  }
  if (cmd !== 'run' && cmd !== 'check') { err(`error: unknown command '${cmd}'\n\n${HELP}`); return 2; }
  if (!file || rest.length) { err(`usage: aruna ${cmd} <file.an>\n`); return 2; }
  if (path.extname(file) !== '.an') { err(`error: expected a '.an' source file, got '${file}'\n`); return 2; }
  let source;
  try { source = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''); }
  catch { err(`error: cannot read file '${file}'\n`); return 2; }

  const { program, diagnostics } = compile(source, { profile: activeProfile });
  if (diagnostics.length) {
    err(diagnostics.map(d => format(d, source, file)).join('\n\n') + '\n\n');
    err(`error: could not compile '${file}' (${diagnostics.length} error${diagnostics.length === 1 ? '' : 's'})\n`);
    return 1;
  }
  if (cmd === 'check') { out(`ok: ${file}\n`); return 0; }
  try { execute(program); return 0; }
  catch (e) {
    if (e instanceof ArunaRuntimeError) { err(format(e, source, file) + '\n'); return 3; }
    throw e;
  }
}

process.exitCode = main(process.argv.slice(2));
