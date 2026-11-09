import { compile } from '../compiler/index.js';
import { execute } from '../runtime/interpreter.js';
import { activeProfile } from '../keywords/index.js';

export const profile = activeProfile;
export const diagnose = (src, p = profile) => compile(src, { profile: p }).diagnostics;
export const messages = src => diagnose(src).map(d => d.message);
export const codes = src => diagnose(src).map(d => d.code);

/** Compile and run; returns the printed output. Throws if compilation fails. */
export function run(src, { stdin = [], p = profile } = {}) {
  const { program, diagnostics } = compile(src, { profile: p });
  if (diagnostics.length) throw new Error('compile errors: ' + diagnostics.map(d => d.message).join('; '));
  let out = '';
  const lines = [...stdin];
  execute(program, { write: s => { out += s; }, readLine: () => lines.length ? lines.shift() : null });
  return out;
}
